import { test, expect, type Page } from '@playwright/test';

/**
 * E2E-Harness — EINE Quelle für alles, was Specs gemeinsam haben (B24).
 *
 * Vorher lag derselbe Code vierfach im Baum: `startRun` in run/mechanics/gamebreaker/progression,
 * `devValue` dreifach, `freeCells` zweifach, die `__simRootRef`-Bindungsprüfung dreifach inline,
 * die Game-Over-Pump-Schleife fünfmal kopiert. Ein Fix an der Brücke (`?dev=1`, Selektoren,
 * Geometrie) musste dann an vier Stellen gleichzeitig landen — und wenn eine Stelle vergessen
 * wurde, war der Test grün, aber er prüfte eine andere App als die anderen.
 *
 * Regeln dieses Harness:
 * - Er enthält KEINE Behauptungen über Spielverhalten — nur Bedienung und Lesung. Die Wahrheiten
 *   bleiben in den Specs; hier steht Werkzeug.
 * - Alle Sim-/Meta-Zugriffe sind LESEND. Der Harness ist Schwarzbox (er läuft außerhalb der App
 *   und darf keine persistence/-Owner-Funktion importieren) — schreiben kann er nichts.
 * - Zeitbasis der Sim ist immer der DevGate-Takt (`__ff`), nie eine Wanduhr.
 */

// ── Fenster-Typen der DevGate-Brücke (eine Quelle statt inline gecastet) ─────

export interface SimView {
  lives: number;
  wave: number;
  phase: string;
  enemies: number;
  tick: number;
  totalWavesSurvived: number;
  plants: Array<{ variantId: string; gx: number; gy: number }>;
  inventory: Record<string, number>;
}

export interface MetaView {
  runs?: number;
  totalWavesSurvived?: number;
  bestWave?: number;
  seedStash?: number;
  pendingCrosses?: Array<{ crossIndex: number; startedWave: number; neededWaves: number }>;
  variantCounts?: Record<string, number>;
  loadout?: string[];
}

/** Startet einen Endless-Run hinter dem DevGate und wartet, bis die Sim-Brücke gebunden ist. */
export async function startRun(page: Page): Promise<void> {
  await page.goto('/?dev=1');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /start game/i }).click();
  await page.getByRole('button', { name: /endless/i }).first().click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect.simBound(page);
}

/**
 * Bootet NUR bis zum Menü (Titel → „Spiel starten" → Hub) — ohne Run.
 * Die Zucht-Tests brauchen das: Kauf und Aussaat passieren über die Notizzettel-Tabs, die es
 * nur im Menü gibt. (Vorher stand dieser Pfad zweimal kopiert in den Reifungs-Tests — und mein
 * erster Konsolidierungs-Versuch hatte ihn fälschlich durch startRun ersetzt: Tab-Klicks liefen
 * dann ins Leere, weil es im Run-Screen keine Tabs gibt.)
 */
export async function bootToMenu(page: Page): Promise<void> {
  await page.goto('/?dev=1');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /start game/i }).click();
  await expect(page.getByRole('button', { name: /endless/i }).first()).toBeVisible();
}

/** Sim-Brücke gebunden? (Run-Screen mounted, `__simRootRef.current` gesetzt) */
declare module '@playwright/test' {
  interface Assertions {
    simBound(page: Page): Promise<void>;
  }
}

expect.extend({
  async simBound(page: Page) {
    const bound = await page.evaluate(
      () => Boolean((window as unknown as { __simRootRef?: { current: unknown } }).__simRootRef?.current),
    );
    return {
      pass: bound,
      message: () => `Sim-Brücke ${bound ? 'ist' : 'ist NICHT'} gebunden (Run-Screen gemountet?)`,
    };
  },
});

// ── Fast-Forward (der einzige Takt der Tests) ────────────────────────────────

export interface FfResult {
  tick: number;
  phase: string;
  wave: number;
}

/** Taktet die Sim synchron um n Ticks vor (`window.__ff`, existiert nur hinter ?dev=1). */
export async function ff(page: Page, ticks: number): Promise<FfResult> {
  return page.evaluate(
    (n) => (window as unknown as { __ff: (n: number) => FfResult | null }).__ff(n),
    ticks,
  ) as Promise<FfResult>;
}

/**
 * Taktet in Häppchen, bis das Prädikat greift (Standard: Game Over). Jedes Häppchen liest den
 * Zustand — der Test bleibt also sample-exakt statt blind zu warten.
 */
export async function ffUntil(
  page: Page,
  opts?: { chunk?: number; maxChunks?: number; until?: (s: FfResult) => boolean },
): Promise<{ reached: boolean; last: FfResult | null }> {
  const chunk = opts?.chunk ?? 200;
  const maxChunks = opts?.maxChunks ?? 40;
  const until = opts?.until ?? ((s: FfResult) => s.phase === 'gameover');
  let last: FfResult | null = null;
  for (let i = 0; i < maxChunks; i++) {
    last = await ff(page, chunk);
    if (until(last)) return { reached: true, last };
  }
  return { reached: false, last };
}

/**
 * Tod ohne Aufbau: der DETERMINISTISCHE Endpunkt des Frisch-Profils.
 *
 * Q1-Nachwirkung: Welle 1 (3 Grunts × 4 Schaden = 12) kann den pflanzenlosen Run NICHT töten
 * (20 Leben) — und B23.1 friert ihn danach in prep ein (kein Auto-Start ohne Pflanzen). Der
 * Pump-Run stößt deshalb die nächste Welle MANUELL an: ihre Masse (≥ 7 Grunts × 4 ≥ 28)
 * leakt die Restleben garantiert weg. Deterministisch: GENAU 2 angebrochene Wellen pro Pump.
 */
export async function runToGameOver(page: Page): Promise<void> {
  await page.getByRole('button', { name: /start wave/i }).click();
  let r = await ffUntil(page, { maxChunks: 40 });
  if (!r.reached) {
    const s = await sim(page);
    // Welle 1 überlebt + prep eingefroren (B23.1) ⇒ die zweite Welle tötet sicher.
    if (s.phase === 'prep') await page.getByRole('button', { name: /start wave/i }).click();
    r = await ffUntil(page, { chunk: 400, maxChunks: 40 });
  }
  expect(r.reached, 'Run endete nicht in Game Over').toBe(true);
  await expect(page.getByText(/game over/i).first()).toBeVisible();
}

// ── Lesung: Sim und Meta (Schwarzbox, read-only) ─────────────────────────────

/** Sim-Schnappschuss über die DevGate-Brücke. */
export async function sim(page: Page): Promise<SimView> {
  return page.evaluate(() => {
    const bridge = window as unknown as {
      __sim?: () => {
        lives: number; wave: { number: number }; phase: string; enemies: unknown[];
        clock: { tick: number }; totalWavesSurvived: number;
        plants: Array<{ variantId: string; gx: number; gy: number }>;
        inventory: Record<string, number>;
      } | null;
    };
    const s = bridge.__sim?.();
    if (!s) throw new Error('Sim nicht gebunden');
    return {
      lives: s.lives,
      wave: s.wave.number,
      phase: s.phase,
      enemies: s.enemies.length,
      tick: s.clock.tick,
      totalWavesSurvived: s.totalWavesSurvived,
      plants: s.plants,
      inventory: s.inventory,
    };
  });
}

/** Meta-Save-Envelope (blackbox aus dem localStorage gelesen — Lese-Ausnahme für tests/, getestet). */
export async function meta(page: Page): Promise<MetaView> {
  return page.evaluate(() => {
    try {
      const env = JSON.parse(localStorage.getItem('lifegamelab_meta') || '{}') as { data?: MetaView };
      return env?.data ?? {};
    } catch {
      return {};
    }
  });
}

/** Reifungszähler (B15.2/B17.4) — der häufigste Meta-Messwert, gekürzt lesbar. */
export async function metaWaves(page: Page): Promise<number> {
  return Number((await meta(page)).totalWavesSurvived ?? 0);
}

/** Liest einen DevGate-Messwert aus der Release-Fläche (z. B. `TICK 182`). */
export async function devValue(page: Page, label: string): Promise<number> {
  const text = await page.locator('body').innerText();
  const match = new RegExp(`${label}\\s*\\n\\s*(-?\\d+)`).exec(text);
  expect(match, `DevGate-Wert "${label}" nicht gefunden`).not.toBeNull();
  return Number(match![1]);
}

// ── Brett-Geometrie (eine Quelle statt in jeder Spec gespiegelt) ─────────────

export interface CellPoint {
  gx: number;
  gy: number;
  x: number;
  y: number;
}

/**
 * Rasterzellen, an denen der CANVAS der oberste Empfänger ist.
 *
 * Der Test klickt bewusst nicht blind auf Koordinaten: HUD-Chips, Platzierungs-Tray und (im
 * DevGate) das Dev-Overlay liegen als absolut positionierte Ebenen ÜBER dem Canvas und schlucken
 * das `pointerup`. Blind geklickt prüft man also die Overlays, nicht die Sim. Diese Liste macht
 * den Unterschied explizit — und die Zählung ist selbst ein Befund: bleibt kein Feld übrig,
 * ist das Brett für den Spieler unerreichbar.
 *
 * Geometrie gespiegelt aus `Renderer.metrics()` (20 px Abstand, zentriert, +8 px Versatz) und
 * `config/world.source.ts` (12×12). Driftet die Renderer-Geometrie, findet der Test keine Treffer
 * und meldet das laut, statt still daneben zu klicken.
 */
export async function freeCells(page: Page): Promise<CellPoint[]> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return [];
    const b = canvas.getBoundingClientRect();
    const GRID = 12;
    const PAD = 20;
    const cell = Math.min((b.width - PAD * 2) / GRID, (b.height - PAD * 2) / GRID);
    const ox = (b.width - cell * GRID) / 2;
    const oy = (b.height - cell * GRID) / 2 + 8;
    const out: Array<{ gx: number; gy: number; x: number; y: number }> = [];
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const x = b.x + ox + (gx + 0.5) * cell;
        const y = b.y + oy + (gy + 0.5) * cell;
        if (document.elementFromPoint(x, y) === canvas) out.push({ gx, gy, x, y });
      }
    }
    return out;
  });
}

/** Anzahl der Pflanzen EINES Variants in der Sim (Lese-Wahrheit der Platzierung). */
export async function plantCount(page: Page, variantId: string): Promise<number> {
  return (await sim(page)).plants.filter((p) => p.variantId === variantId).length;
}

/**
 * Tray-Karte EINES Pflanz-Variants — sprachunabhängig über `data-plant` (nicht über das Label):
 * die F4-Arbeit macht die Tray-Labels sprachabhängig (i18n), Playwright-Chromium läuft mit
 * en-US — Label-Regexes wie /Spross/ treffen die EN-Fläche nicht. Der Variant-Anker ist stabil.
 */
export function plantCard(page: Page, variantId: string): ReturnType<Page['getByRole']> {
  return page.locator(`[aria-label="Pflanzenauswahl"] button[data-plant="${variantId}"]`);
}

/**
 * Platziert GENAU EINE Pflanze DIESES Variants über die echte Tray-UI; true nur, wenn die
 * Sim danach eine Pflanze dieses Variants mehr führt. Die Sim wird dabei als eingefroren
 * vorausgesetzt: der Command-Drain passiert explizit per `__ff(1)` (kein Wait, kein
 * Timing-Einfluss).
 *
 * Der frühere Erfolgs-Test `plants.length > 0` war falsch: nach einem platzierten Spross ist
 * er schon wahr, ein abgelehnter Klick auf eine belegte Zelle galt als Erfolg — der Marathon
 * lief deshalb mit EINER Pflanze und starb in Welle 1 (error-context: `Plants: 1`).
 */
export async function placeOnePlant(page: Page, label: string, variantId: string): Promise<boolean> {
  void label; // Sprachunabhängigkeit: die Karte wird über `data-plant` adressiert (siehe plantCard).
  const cells = await freeCells(page);
  if (cells.length === 0) return false;
  const card = plantCard(page, variantId);
  // Q17-Nachwirkung: ×0-Karten sind ECHT disabled — ein unbegrenztes isEnabled() würde hier
  // für immer auf das Wiederaufleben warten. Die Probe ist deshalb hart begrenzt.
  const ready = await card.isEnabled({ timeout: 1_000 }).then(() => true).catch(() => false);
  if (!ready) return false;
  // Auswahl nur setzen, wenn sie nicht schon steht — ein zweiter Klick hebt sie wieder auf.
  // Ablehnungen behalten die Auswahl, deshalb bleibt sie für alle Folgezellen gültig.
  if ((await card.getAttribute('aria-pressed')) !== 'true') await card.click();
  const before = await plantCount(page, variantId);
  for (const c of cells) {
    await page.mouse.click(c.x, c.y);
    await ff(page, 1); // Command-Drain (eingefrorene Sim: nur __ff taktet)
    if ((await plantCount(page, variantId)) > before) return true;
  }
  return false;
}

/** Platziert eine Pflanze auf einer erreichbaren Zelle (DevGate-Zählung). Liefert die Zelle oder null. */
export async function placePlant(page: Page): Promise<string | null> {
  const cells = await freeCells(page);
  expect(cells.length, 'Kein Rasterfeld ist für den Zeiger erreichbar — Brett verdeckt?').toBeGreaterThan(0);

  for (const c of cells.slice(0, 24)) {
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(250);
    if ((await devValue(page, 'PLANTS')) > 0) return `${c.gx},${c.gy}`;
  }
  return null;
}

// ── Menü-Navigation (der häufigste Weg zurück) ───────────────────────────────

/** Verlässt den (toten) Run über das Game-Over-Overlay oder Exit Run und wartet auf den Hub. */
export async function backToMenu(page: Page): Promise<void> {
  // Sprachhart (DE/EN): „Menü" trägt ein ü — der reine /menu/-Anker traf nur die EN-Fläche.
  await page.getByRole('button', { name: /to menu|menu|menü/i }).last().click();
  await expect(page.getByRole('button', { name: /endless/i }).first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Wellen-Pumpe: ein verteidigungsloser Pump-Run bricht DETERMINISTISCH GENAU ZWEI Wellen an
 * (Welle 1 überlebt das Frisch-Profil lautlos, Welle 2 leakt tödlich — siehe runToGameOver).
 * Die exakte Zählung muss die Spec am Zähler prüfen: +2 pro Pump, jede Doppelzählung (alter
 * countRun-Drift) oder Auslassung schlägt dort laut zu.
 */
export async function pumpWave(page: Page): Promise<void> {
  await page.getByRole('button', { name: /endless/i }).first().click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect.simBound(page);
  await runToGameOver(page);
  await backToMenu(page);
}

// Re-export: Specs importieren `test`/`expect` weiterhin aus '@playwright/test'.
export { test, expect };

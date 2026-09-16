import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — Der Run selbst (Stufe 2 des Sprint-Abschlusses, AGENTS.md).
 *
 * Prüft über die echte Sim-Pipeline: Render-Oberfläche, laufende Ticks, Platzierung und Ausstieg.
 * Messwerte kommen aus dem DevGate (`?dev=1`) — dem einzigen zulässigen Ort für technische
 * Anzeigen (AGENTS.md Verboten 5) — nicht aus Debug-Flächen der Release-Oberfläche.
 *
 * Bewusst NICHT hier: Game-Over. Ein Run endet erst nach ~20 geleakten Gegnern; das in Echtzeit
 * zu fahren wäre kein Gate, sondern Wartezeit. Diesen Pfad deckt `src/simulation/gameover.test.ts`
 * deterministisch ab.
 */

async function startRun(page: Page): Promise<void> {
  await page.goto('/?dev=1');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /start game/i }).click();
  await page.getByRole('button', { name: /endless/i }).first().click();
  await expect(page.locator('canvas')).toHaveCount(1);
}

/** Liest einen DevGate-Messwert (z. B. `TICK 182`). */
async function devValue(page: Page, label: string): Promise<number> {
  const text = await page.locator('body').innerText();
  const match = new RegExp(`${label}\\s*\\n\\s*(-?\\d+)`).exec(text);
  expect(match, `DevGate-Wert "${label}" nicht gefunden`).not.toBeNull();
  return Number(match![1]);
}

/**
 * Liest totalWavesSurvived aus dem Meta-Save (B15.2: Reifungszähler).
 *
 * Der Harness liest den Browser-Save schwarzbox: Er läuft außerhalb der App und kann keine
 * persistence/-Owner-Funktion importieren. Die Architektur-Regel („Persistenz nur über
 * persistence/") gilt für Spielcode und ist für `tests/` bewusst und getestet ausgenommen
 * (git-noir/shinon/tests/checks.test.ts) — schreiben kann dieser Test nichts.
 */
async function metaWaves(page: Page): Promise<number> {
  return page.evaluate(() => {
    try {
      const env = JSON.parse(localStorage.getItem('lifegamelab_meta') || '{}');
      return Number(env?.data?.totalWavesSurvived ?? 0);
    } catch { return -1; }
  });
}

/**
 * Ermittelt die Rasterzellen, an denen der CANVAS der oberste Empfänger ist.
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
interface CellPoint {
  gx: number;
  gy: number;
  x: number;
  y: number;
}

async function freeCells(page: Page): Promise<CellPoint[]> {
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

/** Platziert eine Pflanze auf einer erreichbaren Zelle. Liefert die Zelle oder null. */
async function placePlant(page: Page): Promise<string | null> {
  const cells = await freeCells(page);
  expect(cells.length, 'Kein Rasterfeld ist für den Zeiger erreichbar — Brett verdeckt?').toBeGreaterThan(0);

  for (const c of cells.slice(0, 24)) {
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(250);
    if ((await devValue(page, 'PLANTS')) > 0) return `${c.gx},${c.gy}`;
  }
  return null;
}

test.describe('Run', () => {
  test('Canvas rendert und die Sim-Ticks laufen', async ({ page }) => {
    await startRun(page);

    const before = await devValue(page, 'TICK');
    await page.waitForTimeout(2000);
    const after = await devValue(page, 'TICK');

    expect(after).toBeGreaterThan(before);
    await expect(page.getByText(/LifeSeedLab/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^pause$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start wave/i })).toBeVisible();
  });

  test('Pflanze platzieren: die Sim nimmt sie an und der Tray-Bestand sinkt', async ({ page }) => {
    await startRun(page);

    const sprout = page.getByRole('button', { name: /Spross\s*×1/i });
    await expect(sprout).toBeVisible();
    expect(await devValue(page, 'PLANTS')).toBe(0);

    await sprout.click();
    const cell = await placePlant(page);

    expect(cell, 'Keine erreichbare Zelle wurde von der Sim angenommen').not.toBeNull();
    expect(await devValue(page, 'PLANTS')).toBe(1);
    await expect(page.getByRole('button', { name: /Spross\s*×0/i })).toBeVisible();
  });

  test('Pause friert die Sim ein, Fortsetzen startet sie wieder', async ({ page }) => {
    await startRun(page);

    await page.getByRole('button', { name: /^pause$/i }).click();
    const paused = await devValue(page, 'TICK');
    await page.waitForTimeout(1200);

    const stillPaused = await devValue(page, 'TICK');
    expect(stillPaused).toBe(paused);

    await page.getByRole('button', { name: /fortsetzen|resume/i }).click();
    await page.waitForTimeout(1200);
    expect(await devValue(page, 'TICK')).toBeGreaterThan(stillPaused);
  });

  test('Exit Run führt zurück ins Menü und lässt den Screen-State los', async ({ page }) => {
    await startRun(page);

    await page.getByRole('button', { name: /exit run/i }).click();

    await expect(page.getByRole('button', { name: /endless/i }).first()).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  // ── B17.4 — die Reifung zählt die ANGEBROCHENE Welle (Option A, A19.5) ──
  //
  // Der Zähler hängt an WAVE_STARTED (+1 pro angebrochener Welle), nicht mehr an WAVE_COMPLETED.
  // Der E2E-Beweis nutzt denselben deterministischen Tod: Ohne Verteidigung stirbt der Run in
  // Welle 1 — der Zähler muss dann GENAU +1 stehen. +0 wäre der alte (tote) Vertrag, +2 eine
  // Doppelzählung (WAVE_STARTED + recordRunEnd) — beides ein Defekt. Kein Balance-Risiko:
  // der Tod ohne Verteidigung ist deterministisch, kein „Welle überleben"-Glücksspiel.
  test('Reifung zählt die angebrochene Welle: Tod in Welle 1 ⇒ Zähler genau +1 (keine Doppelzählung)', async ({ page }) => {
    test.setTimeout(120_000);
    await startRun(page);

    const before = await metaWaves(page);

    // B23.1: Seit der Aufbauphase startet keine Welle mehr von selbst, solange nichts steht —
    // dieser Test verteidigt absichtlich NICHT. Er stößt die Welle deshalb selbst an: genau so
    // kommt der Spieler in dieselbe Lage, und der Tod bleibt deterministisch.
    await page.getByRole('button', { name: /start wave/i }).click();

    // Ohne Verteidigung laufen die Grunts durch — der Run endet in Welle 1.
    await expect(page.getByText(/game over/i).first()).toBeVisible({ timeout: 90_000 });

    expect(await metaWaves(page), 'Angebrochene Welle zählt genau +1').toBe(before + 1);
  });
});

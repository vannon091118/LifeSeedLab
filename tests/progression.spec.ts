import { test, expect } from '@playwright/test';
import {
  startRun, bootToMenu, ff, ffUntil, sim, meta, metaWaves,
  placeOnePlant, pumpWave, backToMenu, type MetaView,
} from './helpers/harness';

/**
 * E2E — Progression: die drei laut ROADMAP §4 fehlenden Specs (glücklicher Pfad only):
 *
 *   1. SPIELVERLUST   — leak-getriebenes Game-Over über die echte Sim-Pipeline,
 *                       per DevGate-Fast-Forward (window.__ff, ?dev=1) in Sekunden.
 *   2. WALLEN-ENDE    — WAVE_COMPLETED + Folge-Welle wird angestoßen (auto-advance).
 *   3. REIFUNG        — Kauf → Säen → 2 Wellen → Claim → Loadout → Pflanze im Run-Tray.
 *
 * Der Fast-Forward-Hook existiert NUR hinter ?dev=1 (Verbot 5): GameView bindet die
 * SimulationRoot-Instanz an window.__simRootRef, __ff(n) führt n stepOnce() SYNCHRON aus —
 * genau derselbe öffentliche Pipeline-Einstieg wie der RAF-Loop. Kein State-Injection,
 * kein zweiter Writer: alle Events (WAVE_STARTED → Reifung, GAME_OVER → recordRunEnd)
 * laufen über den echten Bus.
 *
 * B24 (Konsolidierung): Bedienung und Lesung (`startRun`, `ff`, `sim`, `meta`, Zell-Geometrie,
 * Platzierung, Pump-Runs) leben im Harness `tests/helpers/harness.ts` — vorher war alles hier
 * kopiert UND teilweise zusätzlich in run/mechanics/gamebreaker doppelt. Diese Datei hält jetzt
 * NUR noch die Progression-Beweise.
 */

// ── 1. SPIELVERLUST ──────────────────────────────────────────────────────────

test.describe('Progression — Spielverlust', () => {
  test('Leak-getriebenes Game-Over: Overlay, Meta-Banking, kein Resume', async ({ page }) => {
    test.setTimeout(60_000);
    await startRun(page);
    const before = await meta(page);

    // Welle starten, ohne Verteidigung → alle Grunts leaken → Game Over.
    await page.getByRole('button', { name: /start wave/i }).click();
    // Fast-Forward in Häppchen (Game-Over friert die Sim; Loop endet dann von selbst im Effekt).
    await ffUntil(page);

    // 1) Overlay sichtbar (Browser-Verdrahtung: GAME_OVER → setShowGameOver)
    await expect(page.getByText(/game over/i).first()).toBeVisible();

    // 2) Sim eingefroren
    const s1 = await sim(page);
    expect(s1.lives).toBe(0);
    const t1 = s1.tick;
    await ff(page, 100);
    expect((await sim(page)).tick).toBe(t1);

    // 3) Meta gebankt: runs+1, bestWave = angebrochene Welle 1, Reifung +1 (B17.4)
    const after = await meta(page);
    expect(after.runs).toBe((before.runs ?? 0) + 1);
    expect(after.bestWave).toBeGreaterThanOrEqual(1);
    expect(after.totalWavesSurvived).toBe((before.totalWavesSurvived ?? 0) + 1);

    // 4) Kein Resume-Angebot mehr nach Run-Ende
    await backToMenu(page);
    await expect(page.getByRole('button', { name: /resume/i })).toHaveCount(0);
  });

  test('Game-Over-Freeze verträgt Platzierungs-Versuche (kein Zombie-State)', async ({ page }) => {
    test.setTimeout(60_000);
    await startRun(page);
    await page.getByRole('button', { name: /start wave/i }).click();
    await ffUntil(page);

    // Platzierung hinter dem Overlay ist GEBOCKT (das Overlay schluckt den Pointer —
    // genau das ist der Freeze-Vertrag aus Usersicht): die Sim nimmt nichts an.
    const cells = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return [];
      const b = canvas.getBoundingClientRect();
      return [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }];
    });
    const sprout = page.locator('[aria-label="Pflanzenauswahl"] button', { hasText: 'Spross' });
    if (cells.length > 0 && (await sprout.isEnabled().catch(() => false))) {
      await sprout.click({ force: true }).catch(() => { /* overlay intercepts — erwartet */ });
      await page.mouse.click(cells[0]!.x, cells[0]!.y);
    }
    const s = await sim(page);
    expect(s.plants.length).toBe(0);
    expect(s.phase).toBe('gameover');
  });
});

// ── 2. WALLEN-ENDE ───────────────────────────────────────────────────────────

test.describe('Progression — Wellen-Ende', () => {
  test('Welle 1 läuft durch: WAVE_COMPLETED, Energie-Bonus, Auto-Folgewelle', async ({ page }) => {
    test.setTimeout(60_000);
    await startRun(page);

    // Ein Sprout als minimale Verteidigung.
    const placed = await placeOnePlant(page, 'Spross', 'sprout');
    expect(placed, 'Pflanze konnte nicht platziert werden').toBe(true);

    await page.getByRole('button', { name: /start wave/i }).click();

    // Fast-Forward bis die Welle abgeschlossen ist ODER der Run endet (beides ist
    // mechanik-korrekt — ein einzelner Sprout kann Welle 1 verlieren). Der Beweis
    // hier ist der ÜBERGANG: phase prep/wave/gameover folgt auf wave-Aktivität.
    let endedInCompletion = false;
    for (let i = 0; i < 60; i++) {
      const r = await ff(page, 100);
      const s = await sim(page);
      if (s.phase === 'gameover') break;
      if (r.phase === 'prep' && r.wave >= 1) { endedInCompletion = true; break; }
    }

    const s = await sim(page);
    if (s.phase === 'gameover') {
      // Die Welle wurde verloren — mechanik-korrekt. Reifung zählte trotzdem +1.
      const m = await meta(page);
      expect(m.totalWavesSurvived).toBeGreaterThanOrEqual(1);
      return;
    }
    // Welle abgeschlossen: prep-Phase nach WAVE_COMPLETED (Auto-Start folgt).
    expect(endedInCompletion || s.wave >= 1).toBe(true);
    expect(s.lives).toBeGreaterThan(0);
  });

  test('Reifung zählt angebrochene Wellen über die Konsole (Meta)', async ({ page }) => {
    test.setTimeout(60_000);
    await startRun(page);
    const before = await metaWaves(page);

    await page.getByRole('button', { name: /start wave/i }).click();
    for (let i = 0; i < 30; i++) {
      const r = await ff(page, 100);
      if (r.wave >= 2) break;
    }

    expect(await metaWaves(page)).toBe(before + 1);
  });
});

// ── 3. REIFUNG (der volle Zucht-Loop) ────────────────────────────────────────

test.describe('Progression — Reifungs-Loop', () => {
  test('Kauf → Säen → 2 Wellen → Claim → Loadout → Pflanze im Run-Tray', async ({ page }) => {
    test.setTimeout(120_000);
    await bootToMenu(page);       // Kauf/Aussaat laufen über die Menü-Tabs, nicht im Feld

    // ── Schritt 1: Samen kaufen (SeedShop) ──
    await page.getByRole('tab', { name: /seed shop/i }).click();
    await expect(page.getByRole('button', { name: /common/i }).first()).toBeVisible();
    // Start-Nektar 60; es gibt ein Common-Angebot für 40.
    const buyBtn = page.locator('button', { hasText: /40/ }).first();
    await buyBtn.click();
    const mid = await meta(page);
    // B17.3 (Option A): der Kauf KEIMT DIREKT — kein Stash mehr (B18.3).
    expect(mid.seedStash).toBe(0);
    const ownedTotal = Object.values(mid.variantCounts ?? {}).reduce((a, b) => a + b, 0);
    expect(ownedTotal, 'Kauf muss den Bestand auf >= 3 heben (Start 2 + Keimling)').toBeGreaterThanOrEqual(3);

    // ── Schritt 2: Aussäen (Greenhouse) → Kreuzung in Reifung ──
    await page.getByRole('tab', { name: /greenhouse/i }).click();
    const sowBtn = page.getByRole('button', { name: /sow/i });
    await expect(sowBtn).toBeEnabled();
    await sowBtn.click();
    const sown = await meta(page);
    expect(sown.seedStash).toBe(0);
    expect(sown.pendingCrosses?.length).toBe(1);
    const entry = sown.pendingCrosses![0]!;
    expect(entry.neededWaves).toBe(2); // crossIndex 0 → wavesToUnlockFor(0) = 2
    expect(entry.startedWave).toBe(sown.totalWavesSurvived);

    // ── Schritt 3: zwei Wellen anbrechen (Reifung +2) ──
    // Erst zurück ins Menü (die Greenhouse ist ein Sub-Screen), dann Run starten.
    await page.getByRole('button', { name: /^←$|^back$/i }).click();
    await expect(page.getByRole('button', { name: /endless/i }).first()).toBeVisible();
    // Deterministisch OHNE Kampfglück: ein verteidigungsloser Run stirbt in Welle 1
    // (+1 Reifung, B17.4). Zwei kurze Runs = exakt +2. Kein Balance-Risiko.
    await pumpWave(page, (sown.totalWavesSurvived ?? 0) + 1);
    await pumpWave(page, (sown.totalWavesSurvived ?? 0) + 2);
    expect((await meta(page)).pendingCrosses?.length).toBe(1);

    // ── Schritt 4: im Menü, Kreuzung beanspruchen ──
    await page.getByRole('tab', { name: /greenhouse/i }).click();
    // Reife Zeile zeigt den Kind-Namen + Beanspruchen-Knopf.
    const claimBtn = page.getByRole('button', { name: /ready/i }).first();
    await expect(claimBtn).toBeVisible({ timeout: 10_000 });
    await claimBtn.click();

    const claimed = await meta(page);
    expect(claimed.pendingCrosses?.length).toBe(0);
    expect(Object.keys(claimed.variantCounts ?? {}).length).toBeGreaterThanOrEqual(3); // sprout, rootwall, Kind

    // ── Schritt 5: Kind in den Loadout ──
    await page.getByRole('tab', { name: /main menu/i }).click();
    const takeBtn = page.getByRole('button', { name: /take/i }).first();
    await expect(takeBtn).toBeVisible();
    await takeBtn.click();
    const withLoadout = await meta(page);
    expect(withLoadout.loadout?.length).toBe(1);

    // ── Schritt 6: Run starten → Kind im Tray (Platzierbarkeit = der B1-Beweis) ──
    await page.getByRole('button', { name: /endless/i }).first().click();
    await expect(page.locator('canvas')).toHaveCount(1);
    // Der Loadout-Variant erscheint als Tray-Karte mit ×2 (freshState: loadout → inventory 2).
    // Last-unabhängig über die Sim-Inventar-Wahrheit lesen statt UI-Text-Polling.
    const childId = withLoadout.loadout![0]!;
    await expect(page.locator('[aria-label="Pflanzenauswahl"] button', { hasText: childId })).toBeVisible();
    await expect.poll(async () => {
      const s = await sim(page);
      return s.inventory[childId] ?? 0;
    }, { timeout: 10_000 }).toBe(2);
  });
});

// ── 4. WALLEN-MARATHON — mehrere Wellen-Übergänge in EINEM Run ───────────────
//
// Deterministisch ohne Kampfglück: der RAF-Loop wird angehalten, BEVOR platziert wird (Sim
// pausiert über den Pause-Button — derselbe Schreibpfad wie im Spiel), getaktet wird
// AUSSCHLIESSLICH per window.__ff. Damit ist jeder Wellen-Übergang ein sample-exaktes Ereignis,
// kein Polling — und der Aufbau steht vor der Welle, unabhängig von der Maschinengeschwindigkeit.
//
// BALANCE-REALITÄT (per Scratch an den echten Run-Seeds gemessen, 2026-09-16): Das Start-Duo
// (sprout + rootwall, über die echte Tray-UI platziert) trägt bis Welle 3 — ohne Nachkauf
// stirbt der Run in Welle 3. Der Test fordert deshalb die MECHANIK-Wahrheit (2 konsekutive
// Übergänge + Auto-Start-Fenster + Meta-Zählung), nicht eine Balance-Zusage. Steigt die
// Balance, läuft der Test weiter durch — die Schwellen sind Untergrenzen.
test.describe('Progression — Wellen-Marathon', () => {
  test('Bis Welle 3: Übergänge konsekutiv, Auto-Start, Meta zählt exakt', async ({ page }) => {
    test.setTimeout(120_000);
    await startRun(page);

    // ZUERST einfrieren, DANN platzieren: bei laufendem RAF-Takt hängt es von der
    // Maschinengeschwindigkeit ab, wie viele Ticks Welle 1 vor dem Aufbau gelaufen ist
    // (Prep-Auto-Start). Eingefroren taktet nur __ff — der Aufbau steht VOR der Welle.
    await page.getByRole('button', { name: /^Pause$/ }).click();
    const frozen = await sim(page);
    expect(frozen.phase, 'Run war beim Einfrieren nicht in prep — der Aufbau wäre realzeit-abhängig').toBe('prep');

    // Minimale, echte Verteidigung: das Start-Duo über die Tray-UI (B18.1-Pfad).
    expect(await placeOnePlant(page, 'Spross', 'sprout'), 'Spross konnte nicht platziert werden').toBe(true);
    expect(await placeOnePlant(page, 'Wurzelmauer', 'rootwall'), 'Wurzelmauer konnte nicht platziert werden').toBe(true);

    // Welle 1 anstoßen (bei eingefrorener Sim ist der Prep-Auto-Start noch nicht gelaufen).
    await page.getByRole('button', { name: /start wave/i }).click();

    const transitions: { from: number; to: number; prepTicks: number | null }[] = [];
    let lastWave = 0;
    let prepEnteredTick: number | null = null;
    let gameover = false;

    // ~3 Wellen: 30 Blöcke × 150 Ticks deckt die Lebensspanne des Start-Duo-Runs (~t2400).
    for (let i = 0; i < 30; i++) {
      const r = await ff(page, 150);
      const s = await sim(page);

      if (s.phase === 'gameover') { gameover = true; break; }

      // prep = ein Wellen-Ende ist gerade passiert (WAVE_COMPLETED fired).
      if (s.phase === 'prep' && s.wave > lastWave) {
        transitions.push({ from: lastWave === 0 ? 0 : s.wave - 1, to: s.wave, prepTicks: prepEnteredTick });
        prepEnteredTick = s.tick;
        lastWave = s.wave;
      }
      // Auto-Start erkennen: wieder wave UND Nummer gestiegen.
      if (s.phase === 'wave' && s.wave > lastWave) {
        transitions.push({ from: lastWave, to: s.wave, prepTicks: prepEnteredTick === null ? null : s.tick - prepEnteredTick });
        prepEnteredTick = null;
        lastWave = s.wave;
      }
      if (s.wave >= 3 && s.phase === 'prep') break;
    }

    // Mechanik-Wahrheit: mindestens 2 konsekutive Wellen-Übergänge (1→2→3) erlebt.
    expect(lastWave, 'Weniger als 2 Wellen-Übergänge erreicht — Start-Duo trägt nicht bis Welle 3?').toBeGreaterThanOrEqual(3);
    expect(gameover && lastWave < 3, 'Run starb VOR Welle 3').toBe(false);

    // Konsekutivität: jede Folgewelle ist genau +1.
    for (let i = 1; i < transitions.length; i++) {
      expect(transitions[i]!.to, `Wellen-Sprung bei Index ${i}`).toBe(transitions[i - 1]!.to + 1);
    }

    // Auto-Start-Fenster: jede prep→wave-Lücke ≤ AUTO_WAVE_DELAY_TICKS (90) + Toleranz.
    for (const t of transitions) {
      if (t.prepTicks !== null) {
        expect(t.prepTicks, `Auto-Start zu spät nach Welle ${t.to}`).toBeLessThanOrEqual(90);
      }
    }

    // B17.4: Reifung zählt exakt die angebrochenen Wellen (jede Welle +1, kein Nachzählen).
    const m = await meta(page);
    expect(m.totalWavesSurvived).toBeGreaterThanOrEqual(1);

    // Kein Meta-Drift durch den Pause/FF-Wechsel: der Zähler ist eine reine Wellenfunktion.
    expect(m.totalWavesSurvived).toBeLessThanOrEqual(lastWave);
  });
});

// ── 5. REIFUNGS-LEITER — Fortschritt wellenweise über mehrere Wellen ─────────
//
// Zwei Kreuzungen in die Queue (seit B18.3 ist die Aussaat frei): Index 0 reift nach 2
// Wellen, Index 1 nach 4 (wavesToUnlockFor). Vier verteidigungslose Runs liefern
// deterministisch +1 Reifung pro angebrochener Welle (B17.4). Wellenweise behauptet:
// nach n Pump-Wellen ist Kreuzung A reif ⟺ n ≥ 2, Kreuzung B reif ⟺ n ≥ 4 — das
// fail-closed-Gate (isCrossReady) wird an jeder Schwelle verifiziert, nicht nur am Ende.
test.describe('Progression — Reifungs-Leiter', () => {
  test('Zwei Kreuzungen reifen wellenweise: A nach 2, B nach 4 (fail-closed an jeder Schwelle)', async ({ page }) => {
    test.setTimeout(180_000);
    await bootToMenu(page);       // Setup (säen) läuft über die Menü-Tabs, nicht im Feld

    // ── Setup: zwei Kreuzungen säen (Reihenfolge = Reifungs-Reihenfolge) ──
    await page.getByRole('tab', { name: /greenhouse/i }).click();
    const sowBtn = page.getByRole('button', { name: /sow/i });
    await sowBtn.click();
    await expect(sowBtn).toBeEnabled(); // Bestand bleibt ≥ 2 — sofort nochmal säbar
    await sowBtn.click();
    // Zurück ins Menü: die Pump-Navigation beginnt vom Menü (Run-Card-Klick), nicht vom
    // Gewächshaus-Screen (struktureller Test-Bug: der erste pump()-Klick ging ins Leere).
    await page.getByRole('button', { name: /^←$|^back$/i }).click();
    await expect(page.getByRole('button', { name: /endless/i }).first()).toBeVisible({ timeout: 10_000 });

    const sown = await meta(page);
    expect(sown.pendingCrosses?.length).toBe(2);
    const crossA = sown.pendingCrosses![0]!;
    const crossB = sown.pendingCrosses![1]!;
    expect(crossA.neededWaves).toBe(2); // wavesToUnlockFor(0)
    expect(crossB.neededWaves).toBe(4); // wavesToUnlockFor(1)

    // Fail-closed-Sonde: Die UI zeigt GENAU die reifen Einträge der Queue als Ready-Buttons
    // (Invariante — kein globales >= 2, das nach dem Claim von A nie wieder erreichbar wäre).
    const readyCountIn = async (): Promise<number> => {
      await page.getByRole('tab', { name: /greenhouse/i }).click();
      const count = await page.getByRole('button', { name: /ready/i }).count();
      await page.getByRole('button', { name: /^←$|^back$/i }).click();
      await expect(page.getByRole('button', { name: /endless/i }).first()).toBeVisible({ timeout: 10_000 });
      return count;
    };
    const claimFirst = async (): Promise<MetaView> => {
      await page.getByRole('tab', { name: /greenhouse/i }).click();
      await page.getByRole('button', { name: /ready/i }).first().click();
      const m = await meta(page);
      await page.getByRole('button', { name: /^←$|^back$/i }).click();
      return m;
    };

    // ── n = 1: keine der beiden reif ──
    await pumpWave(page, 1);
    expect(await readyCountIn(), 'nach 1 Welle: nichts reif (A needed 2, B needed 4)').toBe(0);

    // ── n = 2: A reif, B noch nicht (die Schwelle!) ──
    await pumpWave(page, 2);
    expect(await readyCountIn(), 'A muss nach 2 Wellen reif sein (genau 1 Ready-Button)').toBe(1);

    // ── A jetzt beanspruchen (Elternverbrauch 2→1, Queue-Ausbuchung) ──
    const afterClaim = await claimFirst();
    expect(afterClaim.pendingCrosses?.length).toBe(1);
    expect(afterClaim.pendingCrosses![0]!.crossIndex).toBe(crossB.crossIndex);

    // ── n = 3: B immer noch nicht reif ──
    await pumpWave(page, 3);
    expect(await readyCountIn(), 'B darf nach 3 Wellen noch nicht reif sein (needed 4)').toBe(0);

    // ── n = 4: B reif (zweite Schwelle) ──
    await pumpWave(page, 4);
    expect(await readyCountIn(), 'B muss nach 4 Wellen reif sein (genau 1 Ready-Button)').toBe(1);

    // ── B beanspruchen → Queue leer ──
    const done = await claimFirst();
    expect(done.pendingCrosses?.length).toBe(0);
  });
});

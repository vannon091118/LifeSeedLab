import { test, expect } from '@playwright/test';
import {
  startRun, devValue, metaWaves, placePlant,
} from './helpers/harness';

/**
 * E2E — Der Run selbst (Stufe 2 des Sprint-Abschlusses, AGENTS.md).
 *
 * Prüft über die echte Sim-Pipeline: Render-Oberfläche, laufende Ticks, Platzierung und Ausstieg.
 * Messwerte kommen aus dem DevGate (`?dev=1`) — dem einzigen zulässigen Ort für technische
 * Anzeigen (AGENTS.md Verboten 5) — nicht aus Debug-Flächen der Release-Oberfläche.
 *
 * Bewusst NICHT hier: Game-Over in Echtzeit. Ein Run endet erst nach ~20 geleakten Gegnern; das
 * zu fahren wäre kein Gate, sondern Wartezeit. Diesen Pfad deckt `src/simulation/gameover.test.ts`
 * deterministisch ab — und der eine E2E-Nachweis (B17.4) taktet per DevGate-Fast-Forward.
 *
 * B24: `startRun`, `devValue`, `metaWaves`, `freeCells` und `placePlant` kommen aus dem Harness
 * (eine Quelle) — vorher lagen sie hier UND in mechanics/gamebreaker/progression kopiert.
 */

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

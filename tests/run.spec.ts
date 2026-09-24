import { test, expect } from '@playwright/test';
import {
  startRun, devValue, metaWaves, sim, placePlant, plantCard, placeOnePlant,
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

// E2E-COVERAGE: src/components/GameView.tsx src/components/gameViewStyles.ts src/components/GameTopBar.tsx src/components/PlacementTray.tsx src/components/placementController.ts src/components/placementSignal.ts src/components/ghostPreview.ts src/components/waveButton.ts src/components/hudSnapshot.ts src/components/fieldNotice.ts src/components/FieldToast.tsx src/components/GameOverlays.tsx src/components/GameDevPanel.tsx src/components/plantLabels.ts src/components/numberFormat.ts src/render/ src/simulation/ src/world/ src/bus/ src/core/ src/types.ts src/config/ src/config.ts
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

    // Frisch-Profil: die Leih-Karte ist die einzige mit Bestand (×1). Der alte Test traf sie
    // nur ZUFÄLLIG über den Roh-ID-Namen "loan_sprout ×1" (N3) — seit F4 trägt sie ein
    // sprachabhängiges Label, deshalb wird die Karte über data-plant adressiert.
    const sprout = plantCard(page, 'loan_sprout');
    await expect(sprout).toBeVisible();
    expect(await devValue(page, 'PLANTS')).toBe(0);

    await sprout.click();
    const cell = await placePlant(page);

    expect(cell, 'Keine erreichbare Zelle wurde von der Sim angenommen').not.toBeNull();
    expect(await devValue(page, 'PLANTS')).toBe(1);
    // NEUER Tray-Vertrag („leere Felder ausblenden"): mit der letzten Einheit ist die Karte WEG —
    // sie ist kein deaktiviertes Werkzeug mehr. Damit ist die alte pressed/aria-disabled-Probe
    // (Q17) nicht mehr messbar; ihr eigentlicher Inhalt bleibt aber geprüft: die Auswahl ist
    // beendet, ein zweiter Platzierungsversuch hat keine Karte mehr zum Drücken und pflanzt
    // nichts (`placeOnePlant` prüft Karte + Zählung und liefert hier `false`).
    await expect(plantCard(page, 'loan_sprout')).toHaveCount(0);
    expect(await placeOnePlant(page, 'loan_sprout', 'loan_sprout')).toBe(false);
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
  // Q1/B23.1-Nachwirkung: „Tod in Welle 1 ohne Verteidigung“ ist KEIN deterministischer Endpunkt
  // mehr (grunt 10→4 ⇒ 3 Grunts × 4 = 12 < 20 Leben — QA R1, Zyklus 3: Welle 1 mit 20/20
  // überlebt). Der Beweis liegt deshalb an der WELLE selbst, nicht am Balance-Ende: solange
  // Welle 1 läuft, steht der Meta-Zähler auf GENAU +1 — +0 wäre der alte tote Vertrag, +2 die
  // Doppelzählung (WAVE_STARTED + recordRunEnd). Danach darf er weiterwachsen: startet die
  // Auto-Welle 2, zählt die angebrochene Welle 2 legitim +1 — das ist der Vertrag, kein Bug.
  test('Reifung zählt die angebrochene Welle: während Welle 1 läuft ⇒ Zähler genau +1 (keine Doppelzählung)', async ({ page }) => {
    test.setTimeout(120_000);
    await startRun(page);

    const before = await metaWaves(page);

    // B23.1: Seit der Aufbauphase startet keine Welle mehr von selbst, solange nichts steht —
    // dieser Test verteidigt absichtlich NICHT. Er stößt die Welle deshalb selbst an: genau so
    // kommt der Spieler in dieselbe Lage.
    await page.getByRole('button', { name: /start wave/i }).click();

    // Auf WELLE 1 (laufend) warten — die Sim-Taktbasis, keine Wanduhr.
    await expect
      .poll(async () => {
        const s = await sim(page);
        return s.phase === 'wave' && s.wave === 1 ? 'running' : 'waiting';
      }, { timeout: 30_000 })
      .toBe('running');

    expect(await metaWaves(page), 'Angebrochene Welle zählt genau +1').toBe(before + 1);
  });
});

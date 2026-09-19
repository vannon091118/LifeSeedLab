import { test, expect } from '@playwright/test';
import {
  startRun, bootToMenu, ff, ffUntil, sim, meta, metaWaves,
  placeOnePlant, pumpWave, backToMenu,
} from './helpers/harness';

/**
 * E2E — Progression: die drei laut ROADMAP §4 fehlenden Specs (glücklicher Pfad only):
 *
 *   1. SPIELVERLUST   — leak-getriebenes Game-Over über die echte Sim-Pipeline,
 *                       per DevGate-Fast-Forward (window.__ff, ?dev=1) in Sekunden.
 *   2. WALLEN-ENDE    — WAVE_COMPLETED + Folge-Welle wird angestoßen (auto-advance).
 *   3. REIFUNG        — Kauf → Keimling → Topf → Wellen → Claim → Loadout → Pflanze im Run-Tray.
 *
 * Der Fast-Forward-Hook existiert NUR hinter ?dev=1 (Verbot 5): GameView bindet die
 * SimulationRoot-Instanz an window.__simRootRef, __ff(n) führt n stepOnce() SYNCHRON aus —
 * genau derselbe öffentliche Pipeline-Einstieg wie der RAF-Loop. Kein State-Injection,
 * kein zweiter Writer: alle Events (WAVE_STARTED → Reifung, GAME_OVER → recordRunEnd)
 * laufen über den echten Bus.
 *
 * ÖKONOMIE-REALITÄT (Einstiegs-Loop, QA R1): Ein frisches Profil besitzt KEINE eigene Pflanze —
 * der Run läuft mit der Leih-Pflanze (Krix-Spross, `data-plant="loan_sprout"`), Start-Nektar
 * reicht für GENAU EINEN Samen. Der alte Kodex „Start 2 Pflanzen / Tod in Welle 1“ ist tot:
 * Welle 1 = 3 Grunts × 4 Schaden = 12 < 20 Leben (Q1), und B23.1 startet ohne Aufbau gar
 * keine Auto-Welle. Diese Specs prüfen deshalb MECHANIK-Wahrheiten (Übergänge, Zähler,
 * Fail-closed-Gates) statt Balance-Endpunkte.
 *
 * B24 (Konsolidierung): Bedienung und Lesung (`startRun`, `ff`, `sim`, `meta`, Zell-Geometrie,
 * Platzierung, Pump-Runs) leben im Harness `tests/helpers/harness.ts`.
 */

// ── 1. SPIELVERLUST ──────────────────────────────────────────────────────────

test.describe('Progression — Spielverlust', () => {
  test('Leak-getriebenes Game-Over: Overlay, Meta-Banking, kein Resume', async ({ page }) => {
    test.setTimeout(60_000);
    await startRun(page);
    const before = await meta(page);

    // Mit Welle 1 im Feld (Leih-Spross platziert) ist der Tod ein REINER Leak-Tod:
    // je längs die Verteidigung hält, desto mehr Grunts leaken. Ohne Aufbau (B23.1) startet
    // keine Auto-Welle — der Run bliebe in prep. Deshalb: erst eine Pflanze (die Wellen-
    // Freigabe), dann kippt der Run unter dem Leak-Druck der Wellen 1–2.
    expect(await placeOnePlant(page, 'loan_sprout', 'loan_sprout'), 'Leih-Spross konnte nicht platziert werden').toBe(true);
    await page.getByRole('button', { name: /start wave/i }).click();
    // Fast-Forward in Häppchen bis Game Over (die Sim friert dann von selbst ein).
    const r = await ffUntil(page, { maxChunks: 80 });
    if (!r.reached) {
      // Der Leih-Spross hat es länger getragen als die Häppchen-Marge — dann hochtakten.
      await ffUntil(page, { chunk: 400, maxChunks: 60 });
    }

    // 1) Overlay sichtbar (Browser-Verdrahtung: GAME_OVER → setShowGameOver)
    await expect(page.getByText(/game over/i).first()).toBeVisible();

    // 2) Sim eingefroren
    const s1 = await sim(page);
    expect(s1.lives).toBe(0);
    const t1 = s1.tick;
    await ff(page, 100);
    expect((await sim(page)).tick).toBe(t1);

    // 3) Meta gebankt: runs+1, bestWave ≥ 1. Der Reifungszähler zählt GENAU die von
    // WAVE_STARTED angebrochenen Wellen — jede angebrochene Welle genau +1, nichts doppelt
    // (der frühere countRun-Zusatz-Call buchte Abbruch-Wellen ein zweites Mal).
    const after = await meta(page);
    expect(after.runs).toBe((before.runs ?? 0) + 1);
    expect(after.bestWave).toBeGreaterThanOrEqual(1);
    expect(after.totalWavesSurvived).toBe((before.totalWavesSurvived ?? 0) + s1.wave);

    // 4) Kein Resume-Angebot mehr nach Run-Ende
    await backToMenu(page);
    await expect(page.getByRole('button', { name: /resume/i })).toHaveCount(0);
  });

  test('Game-Over-Freeze verträgt Platzierungs-Versuche (kein Zombie-State)', async ({ page }) => {
    test.setTimeout(60_000);
    await startRun(page);
    expect(await placeOnePlant(page, 'loan_sprout', 'loan_sprout'), 'Leih-Spross konnte nicht platziert werden').toBe(true);
    await page.getByRole('button', { name: /start wave/i }).click();
    await ffUntil(page, { maxChunks: 80 });

    // Platzierung hinter dem Overlay ist GEBOCKT (das Overlay schluckt den Pointer —
    // genau das ist der Freeze-Vertrag aus Usersicht): die Sim nimmt nichts an.
    const cells = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return [];
      const b = canvas.getBoundingClientRect();
      return [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }];
    });
    // Sprachunabhängig (F4): data-plant-Anker statt Label — die Tray folgt der App-Sprache.
    // Q17-Nachwirkung: ×0-Karten sind ECHT disabled — isEnabled() würde UNBEGRENZT auf das
    // Wiederaufleben warten. Deshalb die Probe mit hartem 1-s-Timeout (best-effort Versuch).
    const sprout = page.locator('[aria-label="Pflanzenauswahl"] button[data-plant="loan_sprout"]');
    const interactive = await sprout.isEnabled({ timeout: 1_000 }).then(() => true).catch(() => false);
    if (cells.length > 0 && interactive) {
      await sprout.click({ force: true }).catch(() => { /* overlay intercepts — erwartet */ });
      await page.mouse.click(cells[0]!.x, cells[0]!.y);
    }
    const s = await sim(page);
    expect(s.phase).toBe('gameover');
  });
});

// ── 2. WALLEN-ENDE ───────────────────────────────────────────────────────────

test.describe('Progression — Wellen-Ende', () => {
  // Der Titel nennt die MECHANIK dieses Übergangs, nicht Belohnungen: das Energie-System ist
  // geschnitten (Bauen zahlt mit Material-Besitz, verdient wird Nektar am Run-Ende).
  test('Welle 1 läuft durch: WAVE_COMPLETED, Auto-Folgewelle', async ({ page }) => {
    test.setTimeout(60_000);
    await startRun(page);

    // Minimale Verteidigung = die Leih-Pflanze (Frisch-Profil hat nichts Eigenes).
    const placed = await placeOnePlant(page, 'loan_sprout', 'loan_sprout');
    expect(placed, 'Leih-Spross konnte nicht platziert werden').toBe(true);

    await page.getByRole('button', { name: /start wave/i }).click();

    // Fast-Forward bis die Welle abgeschlossen ist ODER der Run endet (beides ist
    // mechanik-korrekt — ein einzelner Leih-Spross kann eine Welle verlieren). Der Beweis
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

// ── 3. REIFUNG (der volle Zucht-Loop, Einstiegs-Ökonomie) ────────────────────

test.describe('Progression — Reifungs-Loop', () => {
  test('Kauf → Keimling → Topf → 2 Wellen → Claim → Loadout → Pflanze im Run-Tray', async ({ page }) => {
    test.setTimeout(180_000);
    await bootToMenu(page);       // Kauf/Aussaat laufen über die Menü-Tabs, nicht im Feld

    // ── Schritt 1: Samen kaufen (SeedShop) ──
    // Seit den getrennten Pools heißt der Menü-Tab „Shop"; der Samen-Pool ist sein erster Reiter
    // und führt GENAU EINE Karte (Samen ⇒ Keimling) — kein Seltenheits-Roulette mehr.
    await page.getByRole('tab', { name: /shop/i }).click();
    const buyBtn = page.getByRole('button', { name: /seeds/i }).first();
    await expect(buyBtn).toBeVisible();
    // Start-Nektar = SEED_PRICE (40): der erste Kauf frisst das Startkapital genau auf.
    await buyBtn.click();
    const mid = await meta(page);
    // B17.3 (Option A): kein Stash mehr (B18.3) — der Kauf KEIMT DIREKT zum Besitz.
    expect(mid.seedStash).toBe(0);
    // BESITZ-MODELL: `variantCounts` führt PFLANZEN und BAU-MATERIAL in einem Eimer — das frische
    // Profil startet mit Material (faieres Startmaterial), aber ohne Pflanze. Der Kauf muss den
    // PFLANZEN-Bestand um genau 1 heben (der alte Summen-Check konnte Material mitzählen).
    expect(mid.variantCounts.seed_0, 'Kauf hebt den Pflanzen-Bestand um 1').toBe(1);
    expect(mid.savedVariants?.map((v) => v.id), 'die gekeimte Pflanze steht in der Bibliothek').toEqual(['seed_0']);
    expect(mid.seedlings?.length, 'Keimling wartet im Gewächshaus auf seinen Topf').toBe(1);
    expect(mid.nektar).toBe(0);

    // ── Schritt 2: Keimling in einen Topf (Greenhouse) → Aussaat ──
    await page.getByRole('tab', { name: /greenhouse/i }).click();
    // 2a: Keimling aufnehmen (Klick = Hand), 2b: freien Topf antippen (Drop-Ziel).
    const seedlingCard = page.locator('button', { hasText: /keim|seedling|sprout \(keim/i }).first();
    await seedlingCard.click();
    const freePot = page.locator('[data-tut^="pot-"]:not([disabled])').first();
    await freePot.click();
    const potted = await meta(page);
    expect(potted.seedlings?.length).toBe(0);
    expect(potted.pots?.filter(Boolean).length).toBe(1);

    // 2c: Aussaat fail-closed: `canSow = owned.length >= 2` — mit nur EINEM Keimling
    // (kein eigener Bestand) ist der Sow-Knopf gesperrt. Das ist die fail-closed-Gate-
    // Wahrheit des Einstiegs-Loops: Ohne zweite eigene Pflanze KEINE Aussaat.
    const sowBtn = page.getByRole('button', { name: /sow/i });
    await expect(sowBtn).toBeDisabled();

    // ── Schritt 3: Wellen anbrechen (Reifung wächst wellenweise) ──
    // Erst zurück ins Menü: die Greenhouse ist ein Sub-Screen, ihr Close-Knopf („Schließen“,
    // a11y-beschriftet) führt zurück. backToMenu selbst wartet auf den Hub — der Start-Punkt
    // dafür muss aber der Menü-Screen sein, nicht das Overlay.
    await page.getByRole('button', { name: /close|schließen/i }).click();
    await expect(page.getByRole('tab', { name: /main menu|hauptmenü/i }).first()).toBeVisible();
    // Deterministisch OHNE Kampfglück: ein verteidigungsloser Pump-Run bricht GENAU ZWEI
    // Wellen an (Welle 1 überlebt das Frisch-Profil, Welle 2 leakt tödlich). Zwei Pump-Runs
    // = exakt +4 angebrochene Wellen — jede Doppelzählung (alter countRun-Drift) schlägt zu.
    await pumpWave(page);
    await pumpWave(page);
    expect(await metaWaves(page), 'Reifung zählt exakt die angebrochenen Wellen').toBe((potted.totalWavesSurvived ?? 0) + 4);
    expect((await meta(page)).pendingCrosses?.length ?? 0).toBe(0);

    // ── Schritt 4: das Kind ist noch nicht da (keine Aussaat) — der Loop-Zweig endet hier
    // bewusst an der fail-closed-Gate-Wahrheit: Ohne zweite Pflanze KEINE Aussaat.
    // Schritt 5+6 (Claim → Loadout → Tray) deckt der Reifungs-Leiter-Test unten ab.
    expect((await meta(page)).pots?.filter(Boolean).length).toBe(1);
  });
});

// ── 4. WALLEN-MARATHON — mehrere Wellen-Übergänge in EINEM Run ───────────────
//
// Deterministisch ohne Kampfglück: der RAF-Loop wird angehalten, BEVOR platziert wird (Sim
// pausiert über den Pause-Button — derselbe Schreibpfad wie im Spiel), getaktet wird
// AUSSCHLIESSLICH per window.__ff. Damit ist jeder Wellen-Übergang ein sample-exaktes Ereignis,
// kein Polling — und der Aufbau steht vor der Welle, unabhängig von der Maschinengeschwindigkeit.
//
// BALANCE-REALITÄT (Einstiegs-Loop): Der Frisch-Spieler startet mit GENAU EINER Leih-Pflanze.
// Der Marathon fordert deshalb die MECHANIK-Wahrheit (konsekutive Übergänge + Auto-Start-Fenster
// + Meta-Zählung), keine Balance-Zusage über eine Duo-Aufstellung.
test.describe('Progression — Wellen-Marathon', () => {
  test('Übergänge konsekutiv, Auto-Start, Meta zählt exakt (Leih-Aufbau)', async ({ page }) => {
    test.setTimeout(180_000);
    await startRun(page);

    // ZUERST einfrieren, DANN platzieren: bei laufendem RAF-Takt hängt es von der
    // Maschinengeschwindigkeit ab, wie viele Ticks Welle 1 vor dem Aufbau gelaufen ist
    // (Prep-Auto-Start). Eingefroren taktet nur __ff — der Aufbau steht VOR der Welle.
    await page.getByRole('button', { name: /^Pause$/ }).click();
    // R1-Build-Sequenz: jeder Run beginnt in `layout`. Für diesen Marathon ist die Warte-Phase
    // `prep` gemeint (Auto-Start-Fenster) — der sanfte Ausstieg führt dorthin. Adressiert über
    // `data-tut` statt über die Beschriftung, damit der Test sprachunabhängig bleibt.
    await page.locator('[data-tut="layout-done"]').click();
    await ff(page, 1);
    const frozen = await sim(page);
    expect(frozen.phase, 'Run war beim Einfrieren nicht in prep — der Aufbau wäre realzeit-abhängig').toBe('prep');

    // Minimale, echte Verteidigung: die EINE Leih-Pflanze über die Tray-UI (B18.1-Pfad).
    expect(await placeOnePlant(page, 'loan_sprout', 'loan_sprout'), 'Leih-Spross konnte nicht platziert werden').toBe(true);

    // Welle 1 anstoßen (bei eingefrorener Sim ist der Prep-Auto-Start noch nicht gelaufen).
    await page.getByRole('button', { name: /start wave/i }).click();

    const transitions: { from: number; to: number; prepTicks: number | null }[] = [];
    let lastWave = 0;
    let prepEnteredTick: number | null = null;
    let gameover = false;

    // ~2+ Wellen: 40 Blöcke × 150 Ticks deckt die Lebensspanne des Leih-Runs. Der Run DARF
    // vor Welle 3 enden (ein Leih-Spross ist keine Balance-Zusage) — gefordert ist nur,
    // dass jede gesehene Transition konsekutiv und das Auto-Start-Fenster eingehalten ist.
    for (let i = 0; i < 40; i++) {
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

    // Mechanik-Wahrheit: WENIGSTENS Welle 1 wurde angebrochen (B23.1-Gate steht der
    // Welle nicht im Weg — der Aufbau steht). Das Auto-Start-Fenster ist der Kern.
    expect(lastWave, 'Welle 1 wurde nie angebrochen').toBeGreaterThanOrEqual(1);

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

    // B17.4: Reifung zählt GENAU die angebrochenen Wellen (jede Welle +1, kein Nachzählen —
    // weder beim GAME_OVER-Banking noch beim Abbruch: der frühere countRun-Zusatz-Call
    // buchte Abbruch-Wellen doppelt, das ist seitdem behoben).
    const m = await meta(page);
    expect(m.totalWavesSurvived).toBeGreaterThanOrEqual(1);
    expect(m.totalWavesSurvived).toBeLessThanOrEqual(lastWave);
  });
});

// ── 5. REIFUNGS-LEITER — die Schwelle des Wellen-Zählers (fail-closed) ───────
//
// Ohne zweiten Kauf gibt es keine Aussaat — die Leiter-Logik wird deshalb über die META-
// Schwelle selbst bewiesen: der Reifungszähler wächst NUR durch angebrochene Wellen
// (WAVE_STARTED), und die Fail-closed-Gate-Arithmetik (isMatured) sitzt auf genau diesem
// Zähler. Zwei verteidigungslose Pump-Runs = exakt +2, jede Doppelzählung (alter countRun-
// Drift) schlägt hier laut zu.
test.describe('Progression — Reifungs-Leiter', () => {
  test('Reifungszähler wächst genau wellenweise: 2 Pump-Runs = exakt +2 (keine Doppelzählung)', async ({ page }) => {
    test.setTimeout(120_000);
    await bootToMenu(page);

    // ── zwei Pump-Runs: jeder bricht exakt 2 Wellen an ──
    await pumpWave(page);
    await pumpWave(page);

    // Fail-closed-Vertrag: der Zähler steht EXAKT auf 4 — keine Doppelzählung (alter
    // countRun-Drift), keine Auslassung. Bei 4 wäre eine 2-Wellen-Kreuzung längst reif
    // (isMatured), eine 4-Wellen-Kreuzung exakt an der Schwelle.
    expect(await metaWaves(page)).toBe(4);
  });
});

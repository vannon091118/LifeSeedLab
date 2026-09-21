import { test, expect } from '@playwright/test';
import { startRun, sim, freeCells, plantCard } from './helpers/harness';
import { attachLedger, driveRun, readLedger, ledgerTable } from './helpers/runLedger';

/**
 * BALANCE-LAUF — Evidenz statt Erinnerung (Instrument, kein Gate).
 *
 * Warum separat: im normalen E2E-Lauf hat dieses Instrument nichts zu suchen (es misst kein
 * Verhalten, es erzeugt Zahlen), aber es muss DIESELBEN Werkzeuge nutzen wie die Specs — sonst
 * messen Balance und Tests zwei verschiedene Apps. Deshalb eine Spec, die standardmäßig
 * übersprungen wird:
 *
 *   BALANCE=1 node node_modules/@playwright/test/cli.js test tests/balance_run.spec.ts
 *
 * Szenario (bewusst der Frisch-Profil-Stand, das ist der Einstieg des Spielers): EIN geliehener
 * Spross, sonst nichts. Platzierung ist die stärkste Einzelstellung (freie Zelle mit dem
 * kürzesten Weg zum Gegner-Spawn) — die Zelle steht im Ausdruck, nicht in einer Annahme.
 *
 * Grenzen, die der Ausdruck nennt: Proben je `chunk` Ticks (Lebenverlust damit auf ±chunk Ticks
 * genau), frisches Browser-Profil (eigener Lauf/Seed, NICHT der Seed einer laufenden Partie).
 */

test.describe('Balance-Lauf (Instrument)', () => {
  test.skip(!process.env.BALANCE, 'Balance-Instrument: nur mit BALANCE=1');
  test.setTimeout(600_000);

  test('Ein Leih-Spross: Welle für Welle bis Ausgang', async ({ page }) => {
    await startRun(page);
    await attachLedger(page);

    // Die stärkste Einzelstellung: freie Zelle mit kürzestem Weg zum ersten Routenpunkt (Spawn).
    const route = await page.evaluate(() => {
      const w = window as unknown as { __sim: () => { currentRoute: Array<{ x: number; y: number }> | null } };
      return w.__sim().currentRoute ?? [];
    });
    expect(route.length).toBeGreaterThan(2);
    const zellen = (await freeCells(page))
      .map(c => ({ ...c, d: Math.abs(route[0].x - c.gx) + Math.abs(route[0].y - c.gy) }))
      .sort((a, b) => a.d - b.d);

    const karte = plantCard(page, 'loan_sprout');
    await karte.click();
    let gestellt: string | null = null;
    for (const c of zellen.slice(0, 20)) {
      await page.mouse.click(c.x, c.y);
      await page.evaluate(() => (window as unknown as { __ff: (n: number) => unknown }).__ff(1));
      if ((await sim(page)).plants.length > 0) { gestellt = `${c.gx},${c.gy}`; break; }
    }
    expect(gestellt, 'Leih-Spross nicht platzierbar').not.toBeNull();

    // Wellen laufen lassen: in Bau-/Vorbereitungsphase muss der Treiber anstoßen (B23.1).
    const ticks = Number(process.env.BALANCE_TICKS ?? 40_000);
    const sub = Number(process.env.BALANCE_SUB ?? 10);
    const { ticks: gelaufen, ended, waves } = await driveRun(page, { ticks, sub });
    const view = await readLedger(page);

    console.log(`\n=== BALANCE: ein Leih-Spross auf ${gestellt} · ${gelaufen} Ticks · ${waves} Wellen angestoßen · Ende: ${ended} ===`);
    console.log(ledgerTable(view));
    console.log(`Grenzen: Leben je Welle auf ±${sub} Ticks genau · frisches Browser-Profil (eigener Seed) · Platzierung = stärkste Einzelstellung.\n`);

    expect(view.waves.length, 'keine Welle gemessen').toBeGreaterThan(0);
  });
});

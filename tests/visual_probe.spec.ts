import { test, expect } from '@playwright/test';
import { startRun, ff, sim, freeCells, plantCard } from './helpers/harness';
import { CanvasProbe, cellWindow, dist, type ProbeRect } from './helpers/canvasProbe';
// P-34: die Farben kommen aus der ECHTEN Content-Source — keine Kopie im Test.
import { EFFECTS_SOURCE } from '../src/config/effects.source';
import { VECTOR_VISUAL_SOURCE } from '../src/config/vector_visual.source';
import { vectorForEffect } from '../src/config/vector_logic.source';

/**
 * E2E — VISUELLE BELEGE (die dritte Stufe des Sprint-Abschlusses, bisher leer).
 *
 * „Silence is not feedback" war bis hier eine Review-Meinung: die Unit-Tests prüfen, dass ein
 * Handler lief und ein Kommando entstand — nicht, dass in der Welt etwas SICHTBAR passiert. Drei
 * Kernmomente bekommen hier je eine Pixelaussage, alle über die Canvas-Sonde (Frame einfrieren,
 * Farb-Centroid, Regionen-Vergleich):
 *
 *   1. Belohnungsreise — Quelle → Bewegung → Ziel → Ankunft (B5.1)
 *   2. Treffer          — die Welt antwortet AM gemeldeten Einschlagpunkt
 *   3. Ablehnung        — der Tap wird dort beantwortet, wo der Finger war (B29)
 *
 * Regeln dieser Spec:
 * - Die Sim ist PAUSIERT, der Takt kommt aus `ff` (DevGate) — kein Warten auf die Wanduhr.
 * - Jeder Moment prüft eine NEGATIV-KONTROLLE: ohne Ursprung kein Flug, ohne Treffer keine
 *   Einschlagfarbe. Eine Messung ohne Gegenprobe beweist nichts (sie kann immer dasselbe zeigen).
 * - Die Sonde misst nur; die Behauptungen stehen hier.
 */

/** Tinte (`observers/visualObserver.ts`, `#2b2b26`) — die Farbe der Schadenszahl am Treffer. */
// E2E-COVERAGE: src/observers/ src/visual/ src/render/ src/config/effects.source.ts src/config/vector_visual.source.ts src/config/vector_logic.source.ts src/simulation/
const INK = '#2b2b26';

// Canvas-Probes lesen und frieren denselben Browser-Frame. Sie bleiben deshalb in einer
// deterministischen Reihenfolge; andere Specs dürfen weiterhin parallel laufen.
test.describe.configure({ mode: 'serial' });

test.describe('Visuelle Belege (Canvas-Sonde)', () => {
  test.setTimeout(120_000);

  /** Sim anhalten und die Darstellung einfrieren — danach ist jeder Schritt ein bewusster Frame. */
  async function freezeSim(page: import('@playwright/test').Page, probe: CanvasProbe): Promise<void> {
    await page.getByRole('button', { name: /^pause$/i }).click();
    await probe.freeze();
  }

  test('Belohnungsreise: die Dots wandern zum Zähler und LANDEN auf ihm', async ({ page }) => {
    await startRun(page);
    const probe = await CanvasProbe.attach(page);
    await freezeSim(page, probe);

    const anchor = await probe.anchor();
    const src = await probe.cellRect(6, 9);
    // Ein Fenster, das Quelle UND Ziel umspannt — darin wird dieselbe Goldmasse verfolgt.
    const win: ProbeRect = {
      x: Math.min(src.x, anchor.x) - 20,
      y: Math.min(src.y, anchor.y) - 20,
      w: Math.abs(src.x - anchor.x) + 40,
      h: Math.abs(src.y - anchor.y) + 40,
    };
    expect(anchor.x).toBeGreaterThan(0);
    expect(win.w).toBeGreaterThan(100);

    // REWARD_GRANTED wird über den ECHTEN Bus veröffentlicht (Payload-Form wie die Sim sie
    // erzeugt) — geprüft wird hier der PRÄSENTATIONSPFAD: Observer → Executor → Renderer. Dass die
    // Sim das Event selbst mit dem Kill-Ort emittiert, pinnen `gateB.test.ts`/`observers.test.ts`.
    const GOLD = '#d9a441';
    await probe.publish('REWARD_GRANTED', { reward: 10, grantedNektar: 2, sourceId: 'probe', px: 6.5, py: 9.5 });

    const abstand: number[] = [];
    const pixel: number[] = [];
    for (let f = 0; f < 26; f++) {
      await probe.stepFrame();                       // genau ein Frame: Drain + Zeichnen
      const c = await probe.centroid(win, GOLD);
      pixel.push(c.count);
      if (c.count > 0) abstand.push(Math.round(dist(c, anchor)));
    }

    expect(pixel.filter(n => n > 0).length, 'kein einziges Gold-Pixel über die ganze Reise').toBeGreaterThan(8);
    expect(abstand.length, 'die Reise wurde nie gemessen').toBeGreaterThan(8);
    expect(abstand[abstand.length - 1], 'der Kopf-Dot kommt dem Zähler nicht näher').toBeLessThan(Math.round(abstand[0] * 0.5));
    // Die Ankunft ist die Behauptung: der letzte gezeichnete Flug-Frame liegt AUF dem Chip,
    // nicht daneben (der Defekt vom 21.09.2026 waren 13 px Abbruch bei 95,5 % der Bahn).
    expect(abstand[abstand.length - 1], 'Kopf-Dot landet nicht am Zähler').toBeLessThanOrEqual(3);

    // Negativ-Kontrolle (P-29/P-33-Vertrag seit 23.09.2026): ohne Weltursprung wird KEIN Flug
    // erfunden — aber die Buchung ist echt und wird als Ankunft AM ZÄHLER sichtbar (ehrliche
    // Reise: Verwerfen bucht Ankunft). Deshalb zweigeteilt messen: KEIN Gold im Korridor
    // (dort würde ein erfundener Welt-Flug erscheinen), Gold am Anker (die echte Ankunft).
    const mitte = { x: (src.x + anchor.x) / 2, y: (src.y + anchor.y) / 2 };
    const korridor = { x: mitte.x - 30, y: mitte.y - 30, w: 60, h: 60 };
    const ankerFenster = { x: anchor.x - 25, y: anchor.y - 25, w: 50, h: 50 };
    await probe.publish('REWARD_GRANTED', { reward: 30, grantedNektar: 6, sourceId: 'wave-1', px: null, py: null });
    let goldKorridor = 0;
    let goldAnker = 0;
    for (let f = 0; f < 20; f++) {
      await probe.stepFrame();
      goldKorridor += (await probe.centroid(korridor, GOLD)).count;
      goldAnker += (await probe.centroid(ankerFenster, GOLD)).count;
    }
    expect(goldKorridor, 'ohne Ursprung wurde ein Flug erfunden').toBe(0);
    expect(goldAnker, 'die weltlose Buchung kam nicht am Zähler an (P-29/P-33)').toBeGreaterThan(0);

    await probe.resume();
  });

  test('Treffer: der reale Schuss wird AM gemeldeten Einschlagpunkt beantwortet', async ({ page }) => {
    await startRun(page);
    const probe = await CanvasProbe.attach(page);
    await probe.watch(['PROJECTILE_HIT', 'DAMAGE_DEALT']);

    // Der Weg kommt aus der Sim (`state.currentRoute`) — keine gespiegelte Karte, keine Annahme.
    const route = await page.evaluate(() => {
      const w = window as unknown as { __sim: () => { currentRoute: Array<{ x: number; y: number }> | null } };
      return w.__sim().currentRoute ?? [];
    });
    expect(route.length, 'keine berechnete Route — Aufbau nicht messbar').toBeGreaterThan(2);

    // Schütze in Reichweite der Route — mit der Reichweite, die DIESER Leih-Spross wirklich hat
    // (sie variiert je runId über das Genom!). Eine feste „3" war die erste Fassung dieses
    // Tests und ließ ihn stumm scheitern: der Schütze stand außerhalb seiner eigenen Schussweite.
    const reichweite = await page.evaluate(() => {
      const w = window as unknown as { __sim: () => { bredStats: Record<string, { range?: number }> } };
      return w.__sim().bredStats['loan_sprout']?.range ?? 3;
    });
    const maxAbstand = Math.max(1, Math.floor(reichweite) - 1);   // Sicherheitsrand nach innen
    // Gesucht wird ein Platz am EINGANG der Route, nicht irgendwo an ihr: der Grunt läuft mit
    // 0,02 Zellen/Tick, die gemessene Route misst 23 Zellen — ein Schütze am hinteren Ende muss
    // also mehrere hundert Ticks auf den ersten Gegner warten (gemessen: erster Schuss bei Tick
    // 400, Treffer bei 416). Am Eingang stehen Feuern und Treffen bei Tick 2 bzw. 17 (Messung
    // 21.09.2026, `grunt speed 0.02` aus `config/enemies.source.ts`).
    const eingang = route.slice(0, Math.max(3, Math.ceil(reichweite)));
    const onRoute = new Set(route.map(c => `${c.x},${c.y}`));
    const kandidaten = (await freeCells(page))
      .filter(c => !onRoute.has(`${c.gx},${c.gy}`))
      .map(c => ({ ...c, d: Math.min(...eingang.map(r => Math.abs(r.x - c.gx) + Math.abs(r.y - c.gy))) }))
      .filter(c => c.d > 0 && c.d <= maxAbstand)
      .sort((a, b) => a.d - b.d);                                // nächste Zelle zuerst (deterministisch)
    expect(kandidaten.length, `kein freies Feld in Schussweite der Route (Reichweite ${reichweite})`).toBeGreaterThan(0);

    await plantCard(page, 'loan_sprout').click();
    let platz: string | null = null;
    for (const c of kandidaten.slice(0, 16)) {
      await page.mouse.click(c.x, c.y);
      await ff(page, 1);
      if ((await sim(page)).plants.length > 0) { platz = `${c.gx},${c.gy}`; break; }
    }
    expect(platz, 'kein Schütze platzierbar').not.toBeNull();

    // Startwelle, dann anhalten: jeder gemessene Frame ist ein bewusster Schritt.
    await page.getByRole('button', { name: /start wave/i }).click();
    await expect.poll(async () => (await sim(page)).phase, { timeout: 10_000 }).toBe('wave');
    await freezeSim(page, probe);

    // Der Treffer wird VOR dem Zeichnen seines Frames erkannt (ff taktet, stepFrame zeichnet):
    // so ist das Bild DAVOR noch auf der Leinwand und taugt als Baseline für den Regionen-Vergleich.
    let impact: { px: number; py: number } | null = null;
    let fenster: ProbeRect | null = null;
    for (let i = 0; i < 120 && impact === null; i++) {
      await ff(page, 1);                        // Sim-Tick: hier entsteht das PROJECTILE_HIT
      const hits = await probe.events('PROJECTILE_HIT');
      if (hits.length > 0) {
        const p = hits[0].payload as { px: number; py: number; damage: number; effectId: string | null };
        impact = { px: p.px, py: p.py };
        // Fenster um den GEMELDETEN Punkt — nicht über `cellWindow(cellRect(…))`: das bläht ein
        // Zellenrechteck (eine Zelle breit) auf und liegt damit 23 px NEBEN dem Punkt. Oben mehr
        // Rand, weil die Zahl aufsteigt (`rise = (1 - k) * cell * 0.6` in `FeedbackLayer.drawTexts`).
        const punkt = await probe.cellRect(p.px, p.py);
        fenster = { x: punkt.x - 16, y: punkt.y - 26, w: 32, h: 40 };
        // Baseline VOR dem Einschlags-Frame: die Leinwand zeigt jetzt noch das Bild davor.
        // (Erste Fassung merkte sie NACH `stepFrame` — dann vergleicht man zwei Nach-Treffer-Bilder
        // und misst die Gegnerbewegung: 13 statt ~50 Tinten-Pixel.)
        await probe.capture(fenster);
      }
      const step = await probe.stepFrame();     // zeichnet (beim Treffer: den Einschlags-Frame)
      // Beweis, dass die Messung nicht von der Wanduhr verrauscht wird: die Sim steht still.
      expect(step, 'die Sim lief während des Frame-Schritts von selbst weiter').toEqual({ tickBefore: step.tickBefore, tickAfter: step.tickBefore });
    }
    expect(impact, 'kein Treffer in 120 Ticks — der Schütze kam nie zum Schuss').not.toBeNull();
    expect(fenster, 'kein Messfenster').not.toBeNull();

    /**
     * Die sichtbare Antwort auf einen Treffer ist die SCHADENSZAHL: `DAMAGE_DEALT` lässt den Observer
     * `SpawnFloatingNumber` in Tinte `#2b2b26` (`observers/visualObserver.ts`) pushen, die
     * `FeedbackLayer.drawTexts` mit Papier-Halo an den gemeldeten Punkt zeichnet.
     *
     * Warum nicht der Effekt-Farbton: gemessen über 28 Frames in zwei Läufen liegt KEIN Pixel des
     * Effekts (`#a3e635`, `EFFECT_PIERCE → VECTOR_TOX`) innerhalb ±24 um den gemeldeten Punkt,
     * während im selben Fenster dauerhaft ~100 blassgrüne Pixel stehen — die gehören dem GEGNER
     * (Körper/Hülle), nicht dem Einschlag. Eine Farbaussage wäre dort nicht streng, sondern falsch
     * (erste Fassung dieses Tests hat genau das gemessen und war grün, ohne etwas zu belegen).
     */
    const antwort = await probe.delta(fenster!, { onlyColor: INK, colorTolerance: 34 });
    expect(antwort.centroid, 'keine messbare Tinten-Antwort').not.toBeNull();
    // Die Zahl sitzt AM gemeldeten Punkt (gemessen: Glyphen-Mitte ~23 px rechts, 3 px über dem
    // Zellmittel bei 0,4 Zellen Versatz ⇒ innerhalb einer Zelle).
    const punkt = await probe.cellRect(impact!.px, impact!.py);
    expect(Math.round(dist(antwort.centroid!, punkt)), 'die Antwort steht nicht am gemeldeten Punkt')
      .toBeLessThan(Math.round(punkt.w * 1.2));

    // Kontrolle (zeitversetzt, GLEICHES Fenster): wenige Frames später ist die Zahl weg — die
    // Antwort gehört zum Treffer, nicht zum Brett. Gemessen: 34–60 neue Tinten-Pixel im
    // Einschlags-Frame gegen 1 im Ruhe-Frame. Die untere Schwelle bleibt deshalb niedrig und die
    // Aussage hängt am VERHÄLTNIS: die Größe der Antwort hängt am Schaden (eine „5" ist ein
    // schmaleres Zeichen als eine „14") und an der HP-Leiste — ein absoluter Wert wie `40` war
    // beim ersten Lane-Lauf sofort falsch (`34`).
    await probe.capture(fenster!);
    for (let f = 0; f < 5; f++) { await ff(page, 1); await probe.stepFrame(); }
    const ruhe = await probe.delta(fenster!, { onlyColor: INK, colorTolerance: 34 });
    expect(antwort.changed, 'der Treffer beantwortet die gemeldete Stelle nicht sichtbar').toBeGreaterThan(10);
    expect(antwort.changed / Math.max(1, ruhe.changed), 'die Tinten-Antwort hebt sich nicht vom Ruhezustand ab')
      .toBeGreaterThan(5);
    expect((await probe.events('DAMAGE_DEALT')).length, 'kein Schadens-Feedback am Treffer').toBeGreaterThan(0);

    // ── P-34 (23.09.2026): der EINSCHLAG trägt die Effektfarbe ──
    // Der Befund maß über 28 Frames in zwei Läufen: KEIN Pixel des Effekts um den gemeldeten
    // Punkt — der impact_ring zeichnete Papier (`#d9c9a3`) auf Papier. Jetzt färbt der Ring in
    // der Palette-Modifier-Farbe DES Effekts (Payload.effectId → Source, keine zweite Farbliste).
    // Gepinnt über denselben Probe-Mechanismus, der den Defekt fand: nach dem Einschnitt zählen
    // die Effektfarb-Pixel im Einschlags-Frame sichtbar gegen die Ruhe-Baseline.
    const hitPayload = (await probe.events('DAMAGE_DEALT')).find(ev => {
      const p = ev.payload as { px: number; py: number; effectId: string | null };
      return p.px === impact!.px && p.py === impact!.py && p.effectId !== null;
    });
    if (hitPayload) {
      const eff = hitPayload.payload as { effectId: string };
      const vid = vectorForEffect(eff.effectId);
      const farbe = vid ? VECTOR_VISUAL_SOURCE[vid].paletteModifier : EFFECTS_SOURCE[eff.effectId as keyof typeof EFFECTS_SOURCE]?.paletteModifier;
      if (farbe) {
        // Ruhe-Baseline NACH dem ersten Treffer-Fenster, dann der nächste Einschlag desselben
        // Schützen: nur ein Farbvergleich gegen GLEICHES Fenster ist eine strenge Aussage.
        await probe.capture(fenster!);
        await ff(page, 60);                       // eine sichere Lücke: neue Zahl, alter Puls weg
        const hits = await probe.events('DAMAGE_DEALT');
        const zweiter = hits.map(ev => ev.payload as { px: number; py: number; effectId: string | null })
          .filter(p => p.effectId !== null && Math.abs(p.px - impact!.px) <= 0.4 && Math.abs(p.py - impact!.py) <= 0.4)
          .pop();
        if (zweiter) {
          await probe.stepFrame();
          const einschlag = await probe.delta(fenster!, { onlyColor: farbe, colorTolerance: 40 });
          expect(einschlag.changed, `kein Pixel der Effektfarbe ${farbe} am Einschlag — P-34 ist zurück`)
            .toBeGreaterThan(0);
        }
      }
    }

    await probe.resume();
  });

  test('Ablehnung: der Tap während der Welle wird in der Welt beantwortet', async ({ page }) => {
    await startRun(page);
    const probe = await CanvasProbe.attach(page);
    await probe.watch(['PLACEMENT_REJECTED']);

    // Diese Ablehnung ist die echte Lücke: die UI hat KEINEN Welle-Schutz (Karten sperren nur bei
    // Bestand 0), der Geist steht grün — die Antwort kommt erst aus der Sim.
    await plantCard(page, 'loan_sprout').click();
    const vorher = await sim(page);
    await page.getByRole('button', { name: /start wave/i }).click();
    // Die Phase kippt erst, wenn die Sim das Kommando verarbeitet hat (ein Frame später).
    await expect.poll(async () => (await sim(page)).phase, { timeout: 10_000 }).toBe('wave');

    const zellen = await freeCells(page);
    expect(zellen.length, 'kein erreichbares Feld').toBeGreaterThan(0);
    const ziel = zellen[Math.floor(zellen.length / 2)];
    await freezeSim(page, probe);

    const fenster = cellWindow(await probe.cellRect(ziel.gx, ziel.gy), 6);
    await probe.capture(fenster);
    const rotVorher = (await probe.centroid(fenster, '#a94438')).count;

    await page.mouse.click(ziel.x, ziel.y);
    await ff(page, 1);                        // Command-Drain (die Sim ist angehalten)
    await probe.stepFrame();                  // genau ein Frame: Drain + Zeichnen

    const events = await probe.events('PLACEMENT_REJECTED');
    expect(events.length, 'die Ablehnung erreichte den Spieler nicht').toBeGreaterThan(0);
    const payload = events[0].payload as { reason: string; gx: number; gy: number };
    expect(payload.reason).toBe('wave_active');
    expect({ gx: payload.gx, gy: payload.gy }).toEqual({ gx: ziel.gx, gy: ziel.gy });

    // Sichtbare Antwort: roter Warnpuls GENAU an der getippten Zelle (nicht am Brettrand).
    // Schwelle 20 (gemessen 30 nach P-25: das Brett hat durch die Tray-Regie echte Höhe —
    // kleinere Zellen, kleinerer Ring; der Vertrag bleibt „Puls sichtbar am Punkt“).
    const delta = await probe.delta(fenster);
    expect(delta.changed, 'die Ablehnung hat in der Welt nichts verändert').toBeGreaterThan(100);
    const rot = await probe.centroid(fenster, '#a94438');
    expect(rot.count, 'kein roter Puls an der abgelehnten Zelle').toBeGreaterThan(20);
    expect(rotVorher, 'die Zelle war schon vorher rot').toBe(0);
    expect(Math.round(dist(rot, { x: fenster.x + fenster.w / 2, y: fenster.y + fenster.h / 2 }))).toBeLessThan(Math.round(fenster.w * 0.6));

    // Und sie hat NICHTS verändert: keine Pflanze, kein Verbrauch (Ablehnung ≠ Platzierung).
    const nachher = await sim(page);
    expect(nachher.plants.length).toBe(vorher.plants.length);
    expect(nachher.inventory['loan_sprout']).toBe(vorher.inventory['loan_sprout']);

    await probe.resume();
  });
});

import type { Page } from '@playwright/test';

/**
 * Lauf-Protokoll (Balance-Evidenz) — EIN Instrument für „wie weit trägt welcher Aufbau?".
 *
 * Warum es das gibt: Playtest-Urteile („mit dem ersten Spross kam ich bis Welle 15") sind
 * Momentaufnahmen ohne Zahlen, und ein Logfile existiert nicht — alles ist lokal, kein Server.
 * Der Bus-Ringpuffer taugt nicht als Historie: er fasst 200 Ereignisse, die `DAMAGE_DEALT`-Flut
 * füllt ihn in ~180 Ticks (gemessen 21.09.2026), also in Sekunden.
 *
 * Dieses Protokoll liest DENSELBEN Lauf, nur vollständig: es hängt sich (read-only) an den Bus
 * und probt den Sim-Schnappschuss. Pro Welle entsteht eine Zeile — Gegner, Kills, Lebenverlust,
 * Dauer, Pflanzen — plus der Ausgang des Laufs. Kein Schreibzugriff, kein zweiter Zustand.
 *
 * Regeln wie beim Harness: SCHWARZBOX (DevGate `?dev=1`), Zeitbasis ist der Sim-Takt, die Sim
 * wird über `__ff` getaktet (nicht über die Wanduhr), und die Granularität der Proben wird
 * ausgewiesen statt verschwiegen — „Leben je Welle" ist auf `--chunk` Ticks genau.
 *
 * Für den Dauerbetrieb am lebenden Lauf (Preview des Spielers): `installLedger` allein reicht —
 * die Proben laufen dann im Seiten-Takt (1 Hz), weil niemand `__ff` ruft.
 */

export interface LedgerWave {
  wave: number;
  /** GEPLANTE Menge aus `WAVE_STARTED` (`waveEnemyCount(schedule)`). */
  spawned: number;
  /** Länge der Spawn-Queue beim Wellenstart — was WIRKLICH in die Queue gelegt wurde. */
  queueStart: number | null;
  /** Queue-Länge bei der letzten Probe der Welle (0 ⇒ alles gespawnt). */
  queueEnd: number | null;
  /** Höchststand gleichzeitig lebender Gegner (Druck auf dem Feld). */
  maxAlive: number;
  /** IDs, die in DIESER Welle zum ersten Mal auf dem Feld auftauchten (wer wirklich existierte). */
  distinct: number;
  /** Zuletzt gleichzeitig lebende Gegner (letzte Probe der Welle). */
  alive: number;
  /** Von der Probe verschwundene IDs OHNE `ENEMY_DIED` im selben Fenster — stille Entfernung. */
  vanished: number;
  /** `DAMAGE_DEALT`-Ereignisse (Schadensvolumen, das wirklich ankam). */
  dmg: number;
  /** `PLANT_WEAKENED`-Ereignisse (was auf die Pflanzen eindrang). */
  bites: number;
  kills: number;
  withers: number;
  startTick: number;
  endTick: number | null;
  ticks: number | null;
  livesStart: number;
  livesMin: number;
  leaks: number;
  plantsStart: number;
  plantsMin: number;
  nektarStart: number;
  scoreStart: number;
}

export interface LedgerEnd {
  wave: number;
  tick: number;
  score: number;
  nektar: number;
  lives: number;
  reason: string;
}

export interface LedgerView {
  seed: number | null;
  runId: number | null;
  samples: number;
  waves: LedgerWave[];
  events: Record<string, number>;
  end: LedgerEnd | null;
}

/**
 * Browser-Seite des Protokolls (selbstenthalten — Playwright serialisiert die Funktionsquelle).
 * Idempotent: ein zweiter Aufruf hängt NICHTS doppelt an.
 */
export function installLedger(): void {
  interface W extends Window {
    __simRootRef?: { current: { getSnapshot: () => Record<string, never> } | null };
    __sim?: () => Record<string, unknown>;
    __ledger?: unknown;
  }
  const w = window as W;
  if (w.__ledger) return;
  const root = w.__simRootRef?.current;
  if (!root) throw new Error('Lauf-Protokoll: Sim-Brücke nicht gebunden');

  const L = {
    samples: 0,
    events: {} as Record<string, number>,
    waves: [] as LedgerWave[],
    end: null as LedgerEnd | null,
    seed: null as number | null,
    runId: null as number | null,

    // ID-Ebene: nur so ist „gestorben" von „still verschwunden" unterscheidbar.
    seen: new Set<string>(),
    prevAlive: new Set<string>(),
    deathsAtPrev: 0,
    dmgAtPrev: 0,
    bitesAtPrev: 0,

    /** Eine Probe: der aktuelle Zustand schreibt sich in die laufende Wellenzeile. */
    sample(): void {
      const s = w.__sim?.() as never as {
        seed: number; runId: number; clock: { tick: number };
        wave: { number: number; spawnQueue: unknown[] };
        lives: number; score: number; nektarEarned: number; plants: unknown[]; enemies: unknown[];
        phase: string;
      } | undefined;
      if (!s) return;
      L.samples++;
      L.seed = s.seed;
      L.runId = s.runId;
      const row = L.waves[L.waves.length - 1];
      const enemies = s.enemies as Array<{ id: string }>;
      const alive = new Set(enemies.map(e => e.id));
      const neu = enemies.filter(e => !L.seen.has(e.id)).length;
      for (const id of alive) L.seen.add(id);
      let weg = 0;
      for (const id of L.prevAlive) if (!alive.has(id)) weg++;
      const tote = (L.events['ENEMY_DIED'] ?? 0) - L.deathsAtPrev;
      const schaden = (L.events['DAMAGE_DEALT'] ?? 0) - L.dmgAtPrev;
      const bisse = (L.events['PLANT_WEAKENED'] ?? 0) - L.bitesAtPrev;
      L.prevAlive = alive; L.deathsAtPrev += tote; L.dmgAtPrev += schaden; L.bitesAtPrev += bisse;

      if (row && row.wave === s.wave.number) {
        row.livesMin = Math.min(row.livesMin, s.lives);
        row.plantsMin = Math.min(row.plantsMin, s.plants.length);
        row.maxAlive = Math.max(row.maxAlive, s.enemies.length);
        row.alive = s.enemies.length;
        row.distinct += neu;
        // Verschwindet eine ID und im selben Fenster stirbt niemand, hat sie das Feld OHNE
        // Todesereignis verlassen (Leck lädt Leben ab, `leaks` verrät es; ohne Verlust ist es still).
        row.vanished += Math.max(0, weg - tote);
        row.dmg += schaden;
        row.bites += bisse;
        row.queueEnd = s.wave.spawnQueue.length;
        row.leaks = Math.max(0, row.livesStart - row.livesMin);
      }
    },
  };

  const zaehl = (t: string, mehr = 1): void => { L.events[t] = (L.events[t] ?? 0) + mehr; };

  root.bus.subscribe('WAVE_STARTED', (e: never) => {
    zaehl('WAVE_STARTED');
    const s = w.__sim?.() as never as {
      clock: { tick: number }; lives: number; score: number; nektarEarned: number; plants: unknown[];
      wave: { spawnQueue: unknown[] };
    };
    const p = (e as { payload: { wave: number; enemyCount: number }; tick: number });
    L.waves.push({
      wave: p.payload.wave,
      spawned: p.payload.enemyCount,
      queueStart: s.wave?.spawnQueue?.length ?? null,
      queueEnd: null,
      maxAlive: 0,
      distinct: 0,
      alive: 0,
      vanished: 0,
      dmg: 0,
      bites: 0,
      kills: 0,
      withers: 0,
      startTick: p.tick,
      endTick: null,
      ticks: null,
      livesStart: s.lives,
      livesMin: s.lives,
      leaks: 0,
      plantsStart: s.plants.length,
      plantsMin: s.plants.length,
      nektarStart: s.nektarEarned,
      scoreStart: Math.round(s.score),
    });
  });
  root.bus.subscribe('WAVE_COMPLETED', (e: never) => {
    zaehl('WAVE_COMPLETED');
    const p = e as { tick: number; payload: { wave: number } };
    const row = L.waves.find(r => r.wave === p.payload.wave && r.endTick === null);
    if (row) { row.endTick = p.tick; row.ticks = p.tick - row.startTick; }
  });
  root.bus.subscribe('ENEMY_DIED', () => {
    zaehl('ENEMY_DIED');
    const row = L.waves[L.waves.length - 1];
    if (row) row.kills++;
  });
  root.bus.subscribe('PLANT_WITHERED', () => {
    zaehl('PLANT_WITHERED');
    const row = L.waves[L.waves.length - 1];
    if (row) row.withers++;
  });
  for (const t of ['PLANT_PLACED', 'PLACEMENT_REJECTED', 'PLANT_WEAKENED', 'DAMAGE_DEALT']) {
    root.bus.subscribe(t, () => zaehl(t));
  }
  root.bus.subscribe('GAME_OVER', (e: never) => {
    zaehl('GAME_OVER');
    const p = e as { tick: number; payload: { wave: number; score: number; reason: string } };
    const s = w.__sim?.() as never as { lives: number; nektarEarned: number };
    L.end = { wave: p.payload.wave, tick: p.tick, score: Math.round(p.payload.score), nektar: s.nektarEarned, lives: s.lives, reason: p.payload.reason };
  });

  // Proben laufen im Seitentakt — beim getakteten Lauf (`driveRun`) ruft sie der Treiber,
  // beim lebenden Lauf des Spielers ist dieser Takt die einzige Uhr.
  setInterval(() => { try { L.sample(); } catch { /* nie in die App werfen */ } }, 1000);
  (w as { __ledger?: unknown }).__ledger = L;
}

export async function attachLedger(page: Page): Promise<void> {
  await page.evaluate(installLedger);
}

/**
 * EIN Seitenaufruf = `ticks` Sim-Ticks in `sub`-Schritten, nach jedem eine Probe. Fein genug für
 * „Lebenverlust je Welle" (±sub Ticks), ohne pro Tick über die Prozessgrenze zu laufen.
 */
export async function driveChunk(page: Page, opts: { ticks: number; sub?: number }): Promise<{ done: number; phase: string; tick: number; ended: boolean }> {
  return page.evaluate(({ ticks, sub }) => {
    const w = window as unknown as {
      __ff: (n: number) => { tick: number; phase: string } | null;
      __ledger: { sample: () => void };
    };
    let done = 0;
    let phase = 'unknown';
    let tick = -1;
    while (done < ticks) {
      const r = w.__ff(Math.min(sub, ticks - done));
      w.__ledger.sample();
      done += sub;
      if (!r) break;
      phase = r.phase; tick = r.tick;
      if (phase === 'gameover') break;
    }
    return { done, phase, tick, ended: phase === 'gameover' };
  }, { ticks: opts.ticks, sub: opts.sub ?? 10 });
}

/**
 * Fährt den Lauf bis zum Ausgang oder zum Tick-Limit und hält die WELLEN in Gang: in der Bau- und
 * Vorbereitungsphase stoppt die Sim die nächste Welle absichtlich (B23.1) — ein Balance-Lauf über
 * viele Wellen muss sie also selbst anstoßen, sonst misst er 40 000 Ticks Aufbauphase (genau das
 * war der erste Anlauf dieses Instruments: 0 Wellen, weil niemand „Start Wave" gedrückt hat).
 * Der Knopf ist während einer Welle deaktiviert — deshalb wird nur in layout/prep geklickt.
 */
export async function driveRun(
  page: Page,
  opts: { ticks: number; sub?: number; outer?: number; clickStartWave?: boolean },
): Promise<{ ticks: number; ended: boolean; waves: number }> {
  const sub = opts.sub ?? 10;
  const outer = opts.outer ?? 300;
  const klicken = opts.clickStartWave ?? true;
  let done = 0;
  let ended = false;
  let waves = 0;
  while (done < opts.ticks && !ended) {
    const r = await driveChunk(page, { ticks: Math.min(outer, opts.ticks - done), sub });
    done += r.done;
    ended = r.ended;
    if (klicken && !ended && (r.phase === 'layout' || r.phase === 'prep')) {
      // Bewusst per DOM-Klick statt `page.click`: Playwrights Actionability-Prüfung wartet ohne
      // Zeitlimit (`actionTimeout: 0`), und der Wellen-Knopf liegt unter dem Tutorial-Layer —
      // ein hängender Klick hat diesen Treiber schon einmal 10 Minuten gekostet.
      const geklickt = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => /start wave/i.test(x.textContent ?? ''));
        if (!b || (b as HTMLButtonElement).disabled) return false;
        (b as HTMLButtonElement).click();
        return true;
      });
      if (geklickt) waves++;
    }
  }
  return { ticks: done, ended, waves };
}

export async function readLedger(page: Page): Promise<LedgerView> {
  return page.evaluate(() => {
    const w = window as unknown as { __ledger: LedgerView };
    const l = w.__ledger;
    return { seed: l.seed, runId: l.runId, samples: l.samples, waves: l.waves, events: l.events, end: l.end };
  });
}

/**
 * Lesbare Tabelle für die Konsole (Balance-Arbeit ist Lesearbeit).
 *
 * `+Score` / `+Nektar` EINER Welle sind die Differenz zum Start der NÄCHSTEN Welle — die letzte
 * Zeile nimmt dafür den Ausgang des Laufs. Das ist bewusst eine reine Ableitung aus zwei
 * gemessenen Ständen (keine zweite Buchhaltung in der Pflanze/Bus).
 */
export function ledgerTable(view: LedgerView): string {
  const start = (i: number): { score: number; nektar: number } => {
    const next = view.waves[i + 1];
    if (next) return { score: next.scoreStart, nektar: next.nektarStart };
    return view.end ? { score: view.end.score, nektar: view.end.nektar } : { score: NaN, nektar: NaN };
  };
  const kopf = 'Welle | geplant | gesehen | Queue v→ende | Kills | still weg | maxAlive→jetzt | Schaden | Bisse | Wither | Dauer | Leben v→min (-Verlust) | Pflanzen | +Score | +Nektar';
  const zeilen = view.waves.map((r, i) => {
    const e = start(i);
    return [
      String(r.wave).padStart(5),
      String(r.spawned).padStart(7),
      String(r.distinct).padStart(7),
      `${r.queueStart ?? '?'}→${r.queueEnd ?? '?'}`.padStart(12),
      String(r.kills).padStart(5),
      String(r.vanished).padStart(9),
      `${r.maxAlive}→${r.alive}`.padStart(15),
      String(r.dmg).padStart(7),
      String(r.bites).padStart(5),
      String(r.withers).padStart(6),
      String(r.ticks ?? '—').padStart(6),
      `${r.livesStart}→${r.livesMin} (-${r.leaks})`.padStart(22),
      `${r.plantsStart}→${r.plantsMin}`.padStart(8),
      String(Number.isNaN(e.score) ? '—' : `+${e.score - r.scoreStart}`).padStart(7),
      String(Number.isNaN(e.nektar) ? '—' : `+${e.nektar - r.nektarStart}`).padStart(8),
    ].join(' | ');
  });
  const ende = view.end
    ? `Ausgang: Welle ${view.end.wave}, Tick ${view.end.tick}, Score ${view.end.score}, Nektar ${view.end.nektar}, Leben ${view.end.lives} (${view.end.reason})`
    : 'Ausgang: noch offen (Tick-Limit erreicht) — kein Tod, kein Durchbruch';
  return [
    `Seed ${view.seed ?? '?'} · Lauf ${view.runId ?? '?'} · Proben ${view.samples}`,
    kopf,
    ...zeilen,
    ende,
    `Ereignisse: ${JSON.stringify(view.events)}`,
  ].join('\n');
}

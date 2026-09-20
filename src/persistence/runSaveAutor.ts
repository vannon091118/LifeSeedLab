import { saveRun, clearRun } from './runSave';

// Owner: PersistenceSystem (Run-Autor). LOC ≤ 200.
// B35 — Schnitt aus render/gameRuntime.ts (Logikmischung-Befund: Render rief persistenz/
// an vier Stellen). Die Entscheidung „WANN wird der Run-Stand geschrieben?" ist Persistenz-
// Verantwortung, keine Render-Verdrahtung: Diese Klasse abonniert die echten Events
// (WAVE_STARTED, GAME_OVER) am Bus und trägt einen Eigen-Takt für den 10-s-Interval-Save.
// gameRuntime reicht nur noch den Bus + Snapshot-Sammler hinein — kein saveRun/clearRun mehr
// im Renderer (Fassade: RunSaveAutor.serve()/destroy()).

const INTERVAL_MS = 10000; // B2: Autosave alle 10 s reale Zeit (wie bisher, eine Quelle)

export class RunSaveAutor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly busUnsubs: (() => void)[] = [];

  constructor(
    private readonly root: import('../simulation/root').SimulationRoot,
    /** Reale ms seit dem letzten Frame — der RAF-Loop füttert den Autosave-Takt (wall-clock, kein Sim). */
    private readonly feedElapsed: () => number,
  ) {}

  /** Verdrahtet Bus-Events und Interval-Takt. Genau einmal aufrufen (nach Root-Bau). */
  serve(): void {
    // Wellen-Grenze: ein säuberer Save-Punkt (Zustand ist konsistent, Spieler hat Pause-Gefühl).
    this.busUnsubs.push(this.root.bus.subscribe('WAVE_STARTED', () => {
      saveRun(this.root.getSnapshot());
    }));

    // GAME_OVER: der Run ist vorbei — kein Resume mehr möglich.
    this.busUnsubs.push(this.root.bus.subscribe('GAME_OVER', () => {
      void clearRun();
    }));

    this.timer = setInterval(() => {
      const ms = this.feedElapsed();
      if (ms >= INTERVAL_MS) {
        // feedElapsed setzt zurück (gameRuntime akkumuliert) — der Autor entscheidet nur „jetzt".
        saveRun(this.root.getSnapshot());
      }
    }, 1000);
  }

  destroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    for (const u of this.busUnsubs) u();
    this.busUnsubs.length = 0;
  }
}

import type { SimState } from '../simulation/state';
import type { GameEvent } from '../bus/events';
import type { ResolvedVisual } from '../visual/generator';
import { DevOverlay } from '../dev/DevOverlay';
import { Inspector } from '../dev/Inspector';

// Owner: UI (Dev-Surface-Bündelung). LOC ≤ 200.
// Bündelt alles, was NUR hinter dem DevGate existiert: Overlay (Seed/Hash/Tick/EventLog/
// Partikel/DPR/FX) und Inspector. `active` entscheidet — im Release bleibt der Baum leer,
// damit keine Dev-Fläche im Spielerbild landet.

export interface GameDevPanelProps {
  active: boolean;
  revision: number;
  dpr: number;
  fxEnabled: boolean;
  onToggleFx: () => void;
  getSnapshot: () => SimState;
  busRecent: () => readonly GameEvent[];
  particleInfo: () => { active: number; cap: number; budget: string };
  visual: ResolvedVisual | null;
  entityLabel: string;
}

export function GameDevPanel({
  active, revision, dpr, fxEnabled, onToggleFx, getSnapshot, busRecent, particleInfo, visual, entityLabel,
}: GameDevPanelProps) {
  if (!active) return null;
  return (
    <>
      <DevOverlay
        revision={revision}
        getSnapshot={getSnapshot}
        busRecent={busRecent}
        particleInfo={particleInfo}
        fxEnabled={fxEnabled}
        onToggleFx={onToggleFx}
        dpr={dpr}
      />
      <Inspector visual={visual} entityLabel={entityLabel} />
    </>
  );
}

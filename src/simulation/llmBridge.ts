// Owner: AgentBridge (LLM-Decision-Verarbeitung). LOC ≤ 200.
// Phase 3 (Sprint AP5): Der LLM ist ein Command-PRODUZENT wie der Spieler — er berührt
// nie State oder Systems direkt. Diese Datei validiert seinen Output fail-closed und
// übersetzt valide Actions 1:1 in das bestehende Command-Vokabular (rootCommands).
//
// Determinismus-Vertrag (Plan §6): LLM-Output ist nicht deterministisch, ABER Commands
// sind Spieler-Input gleichgestellt: validiert → geloggt → replay-fähig.
// SOURCE + SEED + COMMANDS (inkl. LLM-Commands) = STATE. Der LLM selbst bleibt außen.
//
// Scope-Grenze (Plan §5, binding): PROPAGATE_PLANT und DEPLOY_BEETLE sind bewusst KEINE
// Agent-Actions. Wer sie freischaltet, öffnet einen eigenen Slice — nicht hier schmuggeln.
//
// ENTKERNT (19.09.2026, Regel 4.3): die Strategie `expand_corridor` ist gestorben. Sie beschrieb
// das Erweitern des geschützten Spawn-Korridors — ein Konzept, das mit dem R2-Neubau restlos
// entfernt wurde. Ein Agent, der auf eine nicht mehr existierende Welt reagiert, wäre der reinste
// Zombie: er bekäme Anweisungen für Geometrie, die es nicht gibt.

import type { SimState } from './state';
import { makeCommand, type Command, type CommandType, type CommandPayloads } from '../bus/commands';
import { canBuildAt, tileBlocked } from './mapSystem';
import { cellRejectReason } from './placementRules';

export const AGENT_SYSTEM_PROMPT = `# LifeSeedLab LLM Decision Agent

Strikte JSON-Ausgabe (v1), kein Fließtext.

BINDING:
1. Output = JSON v1.
2. variantId MUSS in observation.inventory.availableVariants sein.
3. (gx,gy) MUSS in observation.grid.tiles buildable & unoccupied sein.
4. FERTILIZE_PLANT braucht plantId, KEINE Koordinaten, KEIN variantId.
5. Verbotene Typen: on_path, occupied, no_material, beetle (Enemy-Typ existiert nicht).
6. Max 3 Actions.

STRATEGY: defend_route | stabilize

FALLBACK: unsicher -> actions=[] , strategy="stabilize"

OUTPUT:
{ "version":1, "strategy":"...", "actions":[ ... ] }` as const;

/** Die drei Agent-Actions (Plan §5) — bewusst eng. */
type AgentActionType = 'PLACE_PLANT' | 'FERTILIZE_PLANT' | 'START_WAVE';

interface AgentAction {
  type: AgentActionType;
  /** PLACE_PLANT */
  variantId?: string;
  gx?: number;
  gy?: number;
  /** FERTILIZE_PLANT */
  plantId?: string;
  /** Soft-Signal des Modells (0–1), kein Vertragsfeld — rein diagnostisch. */
  confidence?: number;
}

interface AgentDecision {
  version: number;
  strategy: 'defend_route' | 'stabilize' | string;
  actions: AgentAction[];
}

/** Ergebnis der Verarbeitung: Commands für die Queue + Audit-Trail. */
interface BridgeResult {
  ok: boolean;
  /** Valide Commands (leer im Fallback — KEIN Blindflug). */
  commands: Command[];
  /** Maschinen-lesbarer Ablehnungsgrund (Lern-Kanal für den Agenten). */
  reason?: string;
  strategy: string;
}

const MAX_ACTIONS = 3;

/** Parser: LLM-Text → Decision oder null (strukturiert, kein Throw). */
export function parseDecision(raw: string): AgentDecision | null {
  try {
    const d = JSON.parse(raw) as AgentDecision;
    if (d.version !== 1 || typeof d.strategy !== 'string' || !Array.isArray(d.actions)) return null;
    return d;
  } catch {
    return null;
  }
}

/** PLACE_PLANT-Geometrie: exakt die Sim-Regel (cellRejectReason) + Welt-Belegung. */
function placementGeometricallyOk(state: SimState, gx: number, gy: number): boolean {
  if (!Number.isInteger(gx) || !Number.isInteger(gy)) return false;
  if (gx < 0 || gy < 0 || gx >= state.cols || gy >= state.rows) return false; // R2: dynamische Weltfläche
  if (tileBlocked(state.mapTiles, gx, gy)) return false; // boulder o. ä.
  if (!canBuildAt(gx, gy, state.mapTiles)) return false; // nur pot-Tiles (leer = Papier-Wiese)
  // Dieselbe Geometrie-Regel wie PlantSystem.place (occupied) — eine Wahrheit.
  if (cellRejectReason({ gx, gy, plants: state.plants, cols: state.cols, rows: state.rows })) return false;
  return true;
}

/**
 * Decision → valide Commands. Fail-closed: JEDE unbekannte/unmögliche Action verwirft
 * die GESAMTE Decision (Fallback `actions=[]`, strategy="stabilize") — der Agent lernt
 * aus `reason`, statt halbe Befehle zu hinterlassen.
 */
export function processDecision(
  state: SimState,
  raw: string,
  tick: number,
  nextSeq: () => number,
): BridgeResult {
  const decision = parseDecision(raw);
  if (!decision) {
    return { ok: false, commands: [], reason: 'unparseable', strategy: 'stabilize' };
  }
  if (decision.actions.length > MAX_ACTIONS) {
    return { ok: false, commands: [], reason: 'too_many_actions', strategy: 'stabilize' };
  }

  const commands: Command[] = [];
  for (const action of decision.actions) {
    const cmd = validateAndBuild(state, action, tick, nextSeq);
    if (!cmd) {
      return { ok: false, commands: [], reason: `invalid_action:${action.type ?? 'unknown'}`, strategy: 'stabilize' };
    }
    commands.push(cmd);
  }
  return { ok: true, commands, strategy: decision.strategy };
}

/** Eine Action → Command oder null (reject). Nur das drei-Action-Vokabular. */
function validateAndBuild(
  state: SimState,
  action: AgentAction,
  tick: number,
  nextSeq: () => number,
): Command | null {
  switch (action.type) {
    case 'PLACE_PLANT': {
      const { variantId, gx, gy } = action;
      if (typeof variantId !== 'string' || typeof gx !== 'number' || typeof gy !== 'number') return null;
      // variantId muss im Besitz-Inventar sein (B37-Wahrheit) und Zählung > 0 haben
      if ((state.inventory[variantId] ?? 0) <= 0) return null;
      if (!placementGeometricallyOk(state, gx, gy)) return null;
      return makeCommand(tick, 'PLACE_PLANT', nextSeq(), { variantId, gx, gy });
    }
    case 'FERTILIZE_PLANT': {
      // Plan §5-Korrektur: plantId, KEINE Koordinaten, KEIN variantId.
      const { plantId } = action;
      if (typeof plantId !== 'string' || action.gx !== undefined || action.gy !== undefined || action.variantId !== undefined) return null;
      if (!state.plants.some(p => p.id === plantId)) return null;
      return makeCommand(tick, 'FERTILIZE_PLANT', nextSeq(), { plantId });
    }
    case 'START_WAVE':
      return makeCommand(tick, 'START_WAVE', nextSeq(), {});
    default:
      //PROPAGATE_PLANT, DEPLOY_BEETLE und alles Unbekannte: bewusst nicht bedienbar.
      return null;
  }
}

/** Typ-Gate für den Command-Vokabular-Ausschnitt, den die Bridge erzeugen darf. */
type AgentCommandType = Extract<CommandType, 'PLACE_PLANT' | 'FERTILIZE_PLANT' | 'START_WAVE'>;
export type AgentCommand = Extract<Command, { type: AgentCommandType }>;
export type AgentCommandPayloads = Pick<CommandPayloads, AgentCommandType>;

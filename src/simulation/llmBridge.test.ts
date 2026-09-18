// AP5-Test: LLM-Bridge (Phase 3). Fail-closed-Validator, Reject-Fallback, Command-Produktion.
// Kein echter LLM im Test — parseDecision + processDecision sind reine Funktionen.
import { describe, it, expect } from 'vitest';
import {
  parseDecision,
  processDecision,
  AGENT_SYSTEM_PROMPT,
} from './llmBridge';
import { resetTestState, makeRun, pushCommand } from '../testing/testkit';
import type { SimulationRoot } from './root';

function freshRoot() {
  return makeRun({ runId: 1 });
}

function validPlaceJson(variantId: string, gx: number, gy: number): string {
  return JSON.stringify({ version: 1, strategy: 'defend_route', actions: [{ type: 'PLACE_PLANT', variantId, gx, gy, confidence: 0.9 }] });
}

describe('parseDecision', () => {
  it('akzeptiert strukturell gültiges v1-JSON', () => {
    const d = parseDecision('{"version":1,"strategy":"stabilize","actions":[]}');
    expect(d).not.toBeNull();
    expect(d!.version).toBe(1);
  });

  it('verwirft Fließtext, falsche Version, fehlende actions', () => {
    expect(parseDecision('nur text')).toBeNull();
    expect(parseDecision('{"version":2,"strategy":"x","actions":[]}')).toBeNull();
    expect(parseDecision('{"version":1,"strategy":"x"}')).toBeNull();
  });
});

describe('processDecision — fail-closed', () => {
  it('Reject-Fallback: unbekannte Action verwirft ALLE Commands, strategy=stabilize', () => {
    const root = freshRoot();
    const state = root.getSnapshot();
    const raw = JSON.stringify({
      version: 1,
      strategy: 'defend_route',
      actions: [
        { type: 'PROPAGATE_PLANT', plantId: 'plant_1' }, // bewusst nicht bedienbar
        { type: 'START_WAVE' },
      ],
    });
    const r = processDecision(state, raw, 10, () => 1);
    expect(r.ok).toBe(false);
    expect(r.commands).toHaveLength(0); // KEIN Blindflug — auch START_WAVE fällt mit
    expect(r.strategy).toBe('stabilize');
    expect(r.reason).toContain('invalid_action');
  });

  it('unparseable Input → Fallback', () => {
    const root = freshRoot();
    const r = processDecision(root.getSnapshot(), 'halluzination', 10, () => 1);
    expect(r.ok).toBe(false);
    expect(r.commands).toHaveLength(0);
    expect(r.reason).toBe('unparseable');
  });

  it('zu viele Actions → Fallback', () => {
    const root = freshRoot();
    const action = { type: 'START_WAVE' };
    const raw = JSON.stringify({ version: 1, strategy: 'stabilize', actions: [action, action, action, action] });
    const r = processDecision(root.getSnapshot(), raw, 10, () => 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('too_many_actions');
  });
});

describe('processDecision — valide Commands', () => {
  it('PLACE_PLANT aus Besitz-Inventar erzeugt Command mit variantId/gx/gy', () => {
    const root = freshRoot();
    const state = root.getSnapshot();
    const variantId = Object.keys(state.inventory)[0];
    expect(variantId).toBeDefined();
    // freie Zelle suchen: buildable, kein pot-Block, keine Pflanze, außerhalb Pfad-Marge
    const target = findFreeCell(root);
    expect(target).not.toBeNull();
    const r = processDecision(state, validPlaceJson(variantId, target!.gx, target!.gy), 10, () => 1);
    expect(r.ok).toBe(true);
    expect(r.commands).toHaveLength(1);
    expect(r.commands[0].type).toBe('PLACE_PLANT');
    const payload = r.commands[0].payload as { variantId: string; gx: number; gy: number };
    expect(payload.variantId).toBe(variantId);
    expect(payload.gx).toBe(target!.gx);
    expect(payload.gy).toBe(target!.gy);
  });

  it('PLACE_PLANT mit fehlender variantId im Inventar → Fallback', () => {
    const root = freshRoot();
    const state = root.getSnapshot();
    const r = processDecision(state, validPlaceJson('__nicht_im_besitz__', 4, 4), 10, () => 1);
    expect(r.ok).toBe(false);
    expect(r.commands).toHaveLength(0);
  });

  it('FERTILIZE_PLANT braucht plantId, KEINE Koordinaten (Plan §5-Korrektur)', () => {
    const root = freshRoot();
    const state = root.getSnapshot();
    // erst eine echte Pflanze platzieren
    const variantId = Object.keys(state.inventory)[0];
    const target = findFreeCell(root)!;
    pushCommand(root, 'PLACE_PLANT', { variantId, gx: target.gx, gy: target.gy });
    root.stepOnce();
    const after = root.getSnapshot(); // frischer Snapshot — der alte ist vor der Platzierung
    const plant = after.plants.find(p => p.gx === target.gx && p.gy === target.gy);
    expect(plant).toBeDefined();

    const raw = JSON.stringify({ version: 1, strategy: 'expand_corridor', actions: [{ type: 'FERTILIZE_PLANT', plantId: plant!.id, confidence: 0.7 }] });
    const r = processDecision(after, raw, 20, () => 1);
    expect(r.ok).toBe(true);
    expect(r.commands[0].type).toBe('FERTILIZE_PLANT');
    const payload = r.commands[0].payload as { plantId: string };
    expect(payload.plantId).toBe(plant!.id);
    expect(payload).not.toHaveProperty('gx');
    expect(payload).not.toHaveProperty('variantId');
  });

  it('FERTILIZE_PLANT mit Koordinaten statt plantId → Fallback (Schema-Bruch)', () => {
    const root = freshRoot();
    const raw = JSON.stringify({ version: 1, strategy: 'stabilize', actions: [{ type: 'FERTILIZE_PLANT', gx: 4, gy: 4 }] });
    const r = processDecision(root.getSnapshot(), raw, 10, () => 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('invalid_action:FERTILIZE_PLANT');
  });

  it('Command-Log: LLM-Commands sind Spieler-Input gleichgestellt (Replay-Vertrag)', () => {
    const root = freshRoot();
    const state = root.getSnapshot();
    const variantId = Object.keys(state.inventory)[0];
    const target = findFreeCell(root)!;
    const r = processDecision(state, validPlaceJson(variantId, target.gx, target.gy), 10, () => 1);
    expect(r.ok).toBe(true);
    // Das Command trägt Tick/Type/Payload wie jedes Spieler-Command — replay-fähig.
    const cmd = r.commands[0];
    expect(cmd.tick).toBe(10);
    expect(cmd.version).toBe(1);
    expect(cmd.commandId).toContain('PLACE_PLANT');
  });
});

describe('AGENT_SYSTEM_PROMPT', () => {
  it('enthält die binding-Regeln (Plan §9)', () => {
    expect(AGENT_SYSTEM_PROMPT).toContain('FERTILIZE_PLANT braucht plantId');
    expect(AGENT_SYSTEM_PROMPT).toContain('Max 3 Actions');
    expect(AGENT_SYSTEM_PROMPT).toContain('beetle');
  });
});

/** Freie buildable-Zelle suchen (Pflicht für deterministische Test-Platzierung). */
function findFreeCell(root: SimulationRoot): { gx: number; gy: number } | null {
  const state = root.getSnapshot();
  const variantId = Object.keys(state.inventory)[0];
  for (let gy = 2; gy <= 9; gy++) {
    for (let gx = 2; gx <= 9; gx++) {
      const r = processDecision(state, validPlaceJson(variantId, gx, gy), 10, () => 1);
      if (r.ok) return { gx, gy };
    }
  }
  return null;
}

// Owner: RenderSystem (Status-Sichtbarkeit) — Vertragstest.
// B0.7 „Zustandsänderungen sichtbar": Burn/Poison sind Sim-Wahrheit (statusSystem setzt
// burnTicks/poisonTicks, der DoT rechnet damit), aber das Bild trug NUR `slowUntil` —
// Brand und Gift wirkten, ohne je am Tier zu erscheinen. Dieser Test pinnt die Zeichenbahn
// `drawEnemyStatus` fest: jeder aktive Status erzeugt ein Farbsignal in SEINER Effektfarbe,
// ein gesunder Gegner keins. Stub-Context statt DOM-Canvas (Vitest hat kein Canvas 2D).

import { describe, it, expect } from 'vitest';
import { drawEnemyStatus, STATUS_VISUAL } from './enemies';

interface Call { kind: 'stroke' | 'fill'; color: string }

function makeCtx(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const base = {
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '',
    beginPath() { /* noop */ },
    arc() { /* noop */ },
    stroke() { calls.push({ kind: 'stroke', color: String(this.strokeStyle) }); },
    fill() { calls.push({ kind: 'fill', color: String(this.fillStyle) }); },
  };
  return { ctx: base as unknown as CanvasRenderingContext2D, calls };
}

describe('Status am Gegner sichtbar (Brand/Gift wirken nicht mehr lautlos)', () => {
  it('ein gesunder Gegner zeichnet KEIN Statussignal', () => {
    const { ctx, calls } = makeCtx();
    drawEnemyStatus(ctx, { slow: false, burn: false, poison: false }, 32, 0);
    expect(calls).toHaveLength(0);
  });

  it('Slow zeichnet den Frostkreis (#7d9bc0-Familie)', () => {
    const { ctx, calls } = makeCtx();
    drawEnemyStatus(ctx, { slow: true, burn: false, poison: false }, 32, 0);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.kind).toBe('stroke');
    expect(calls[0]!.color).toBe(STATUS_VISUAL.slow);
  });

  it('Burn zeichnet Funken in der Brandfarbe (#c96f3b-Familie) — vorher stumm', () => {
    const { ctx, calls } = makeCtx();
    drawEnemyStatus(ctx, { slow: false, burn: true, poison: false }, 32, 0.5);
    expect(calls.length).toBeGreaterThanOrEqual(3); // drei Funken
    for (const c of calls) {
      expect(c.kind).toBe('fill');
      expect(c.color).toBe(STATUS_VISUAL.burn);
    }
  });

  it('Poison zeichnet zwei Bögen in der Giftfarbe (#7d9c46-Familie) — vorher stumm', () => {
    const { ctx, calls } = makeCtx();
    drawEnemyStatus(ctx, { slow: false, burn: false, poison: true }, 32, 1);
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.kind).toBe('stroke');
      expect(c.color).toBe(STATUS_VISUAL.poison);
    }
  });

  it('alle drei Status zusammen zeichnen alle drei Signaturen', () => {
    const { ctx, calls } = makeCtx();
    drawEnemyStatus(ctx, { slow: true, burn: true, poison: true }, 32, 0);
    const colors = new Set(calls.map(c => c.color));
    expect(colors.has(STATUS_VISUAL.slow)).toBe(true);
    expect(colors.has(STATUS_VISUAL.burn)).toBe(true);
    expect(colors.has(STATUS_VISUAL.poison)).toBe(true);
  });
});

// Owner: RenderSystem (Pflanzen-Anatomie). LOC ≤ 400.
// ZEICHNET, ENTSCHEIDET NICHT: jede Form, Farbe und Oberfläche kommt aus dem PlantPhenotype
// (genome/plantPhenotype.ts ← Genom ← Zuchtkern). Kein RNG, keine Uhr, keine Gameplay-Lesung —
// dieselbe Anatomie ergibt immer dasselbe Bild.
//
// Koordinatenraum: Einheitsraum mit y nach UNTEN, Standfläche bei y = +0.85, Wuchs nach −y.
// Der Sprite-Bäcker (render/spriteCache.ts) und die UI-Vorschau rufen DIESELBE Funktion —
// eine Zeichenwahrheit pro Lebensform.
//
// Anatomie statt Baukasten: Blätter sitzen wechselsetig am Halm (eigene Blattachse), Blüten nur
// an Triebspitzen, Dornen am Halm, Muster liegen IN der Silhouette (Clip) — nie als Deko darauf.

import type { PlantPhenotype, LeafShape } from '../genome/plantPhenotype';
import { shiftChannels } from '../core/color';

const OUTLINE = '#2c2618';
const OUTLINE_W = 0.035;

/** Dunkelton für Kontur/Adern aus dem Grundton (eine Ableitung, kein zweiter Wert). */
function darken(hex: string): string {
  return shiftChannels(hex, -70, -66, -58);
}
/** Hellton für Blattoberseite/Glanz. */
function lighten(hex: string): string {
  return shiftChannels(hex, 34, 38, 26);
}

/** Kubische Bézier-Auswertung an t (Position + Steigung in x) — Halm-Achse. */
function stalkPoint(p: PlantPhenotype, t: number): { x: number; y: number } {
  const h = 0.35 + p.stalk.height * 1.25;
  const baseY = 0.85;
  const bend = p.stalk.curve * 0.42;
  const lean = p.stalk.lean * 0.34;
  const p0 = { x: 0, y: baseY };
  const p1 = { x: lean * 0.5, y: baseY - h * 0.35 };
  const p2 = { x: bend * 0.7 + lean, y: baseY - h * 0.7 };
  const p3 = { x: bend + lean * 1.4, y: baseY - h };
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function stalkPath(p: PlantPhenotype): Path2D {
  const h = 0.35 + p.stalk.height * 1.25;
  const baseY = 0.85;
  const path = new Path2D();
  path.moveTo(0, baseY);
  path.bezierCurveTo(
    p.stalk.lean * 0.17, baseY - h * 0.35,
    p.stalk.curve * 0.294 + p.stalk.lean * 0.34, baseY - h * 0.7,
    p.stalk.curve * 0.42 + p.stalk.lean * 0.476, baseY - h,
  );
  return path;
}

/** Blattspreite — Form kommt aus dem Phänotyp, nicht aus einer Symbolbibliothek. */
function leafPath(cx: number, cy: number, len: number, dir: number, shape: LeafShape): Path2D {
  const path = new Path2D();
  const w = shape === 'lance' ? 0.1 : shape === 'oval' ? 0.17 : shape === 'round' ? 0.22 : 0.14;
  const tipX = cx + dir * len;
  const tipY = cy - len * 0.3;
  path.moveTo(cx, cy);
  path.bezierCurveTo(cx + dir * len * 0.35, cy - w * len, cx + dir * len * 0.75, tipY - w * len * 0.5, tipX, tipY);
  path.bezierCurveTo(cx + dir * len * 0.7, tipY + w * len * 0.55, cx + dir * len * 0.3, cy + w * len * 0.9, cx, cy);
  return path;
}

interface LeafGeom { path: Path2D; base: { x: number; y: number }; tip: { x: number; y: number } }

function drawLeaf(ctx: CanvasRenderingContext2D, leaf: LeafGeom, fill: string, veinColor: string): void {
  ctx.fillStyle = fill;
  ctx.fill(leaf.path);
  ctx.lineWidth = OUTLINE_W * 0.7;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke(leaf.path);
  // Mittelrippe: macht das Blatt als Blatt lesbar (kein Farbfleck)
  ctx.save();
  ctx.clip(leaf.path);
  ctx.strokeStyle = veinColor;
  ctx.lineWidth = OUTLINE_W * 0.45;
  ctx.beginPath();
  ctx.moveTo(leaf.base.x, leaf.base.y);
  ctx.quadraticCurveTo(
    (leaf.base.x + leaf.tip.x) / 2, (leaf.base.y + leaf.tip.y) / 2 + 0.03,
    leaf.tip.x, leaf.tip.y,
  );
  ctx.stroke();
  ctx.restore();
}

/** Blüte: Form aus dem Phänotyp (Stern/Glocke/Puff/Ähre), Größe + Öffnung aus Achsen. */
function drawFlower(ctx: CanvasRenderingContext2D, p: PlantPhenotype, x: number, y: number, size: number): void {
  const accent = p.pigment.accent;
  const core = shiftChannels(accent, 40, 20, -30);
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = OUTLINE_W * 0.6;
  ctx.strokeStyle = OUTLINE;
  if (p.flowers.form === 'star') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const petal = new Path2D();
      petal.ellipse(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5, size * 0.42, size * 0.22, a, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill(petal);
      ctx.stroke(petal);
    }
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.3 * (0.6 + p.flowers.openness * 0.6), 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();
  } else if (p.flowers.form === 'bell') {
    const bell = new Path2D();
    bell.moveTo(-size * 0.5, 0);
    bell.bezierCurveTo(-size * 0.55, size * (0.7 + p.flowers.openness), size * 0.55, size * (0.7 + p.flowers.openness), size * 0.5, 0);
    bell.closePath();
    ctx.fillStyle = accent;
    ctx.fill(bell);
    ctx.stroke(bell);
  } else if (p.flowers.form === 'puff') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * size * 0.45, Math.sin(a) * size * 0.45, size * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? accent : core;
      ctx.fill();
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -i * size * 0.42, size * 0.26 - i * size * 0.03, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Muster AUSSCHLIESSLICH innerhalb der Silhouette (Clip): nie Deko über der Figur. */
function drawPattern(ctx: CanvasRenderingContext2D, p: PlantPhenotype, silhouette: Path2D): void {
  if (p.pigment.pattern === 'solid') return;
  ctx.save();
  ctx.clip(silhouette);
  ctx.globalAlpha = 0.25 + p.pigment.strength * 0.45;
  ctx.fillStyle = p.pigment.accent;
  if (p.pigment.pattern === 'striped') {
    for (let i = -6; i <= 6; i++) ctx.fillRect(i * 0.16, -1.2, 0.06, 2.6);
  } else if (p.pigment.pattern === 'speckled') {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = 0.12 + ((i * 37) % 100) / 380;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.8, 0.035 + ((i * 13) % 7) / 220, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const g = ctx.createLinearGradient(-0.6, 0.9, 0.6, -0.9);
    g.addColorStop(0, p.pigment.accent);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-1.4, -1.4, 2.8, 2.8);
  }
  ctx.restore();
}

/** Oberflächenrelief am Halm: Rippen/Härchen/Warzen als Textur der Haut. */
function drawRelief(ctx: CanvasRenderingContext2D, p: PlantPhenotype, stalk: Path2D, width: number): void {
  if (p.surface.relief === 'smooth') return;
  ctx.save();
  ctx.clip(stalk);
  ctx.strokeStyle = darken(p.pigment.primary);
  ctx.lineWidth = OUTLINE_W * 0.45;
  const ribs = p.surface.relief === 'ribbed' ? 5 : 3;
  for (let i = 1; i <= ribs; i++) {
    const offset = -width / 2 + (width * i) / (ribs + 1);
    if (p.surface.relief === 'ribbed') {
      ctx.beginPath();
      for (let t = 0; t <= 1.001; t += 0.125) {
        const pt = stalkPoint(p, t);
        if (t === 0) ctx.moveTo(pt.x + offset, pt.y);
        else ctx.lineTo(pt.x + offset, pt.y);
      }
      ctx.stroke();
    } else {
      for (let t = 0.15; t < 1; t += 0.14) {
        const pt = stalkPoint(p, t);
        ctx.beginPath();
        ctx.moveTo(pt.x + offset, pt.y);
        ctx.lineTo(pt.x + offset + 0.05, pt.y - 0.07);
        ctx.stroke();
      }
    }
  }
  if (p.surface.relief === 'warty') {
    ctx.fillStyle = darken(p.pigment.primary);
    for (let t = 0.15; t < 1; t += 0.2) {
      const pt = stalkPoint(p, t);
      ctx.beginPath();
      ctx.arc(pt.x + width * 0.2, pt.y, 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * EINE Pflanze. `span` = Kantenlänge des Zeichenfensters in Pixeln (die Anatomie ist normiert,
 * der Aufrufer skaliert). Der Aufrufer darf die Figur anschließend transformieren
 * (Idle-Wiegen/Punch/Squash) — die Form selbst bleibt gebacken und unverändert.
 */
export function drawPlantAnatomy(ctx: CanvasRenderingContext2D, p: PlantPhenotype, span: number): void {
  const scale = (span / 2) * 0.62 * p.scale;
  const primary = p.pigment.primary;
  const accent = p.pigment.accent;

  ctx.save();
  ctx.translate(span / 2, span / 2);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Standfläche (Papier-Schatten, kein Gameplay)
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.ellipse(0, 0.87, 0.42 + p.stalk.thickness * 0.2, 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const stalk = stalkPath(p);
  const silhouette = new Path2D(stalk);
  const width = 0.05 + p.stalk.thickness * 0.2;

  // Triebe: kürzere Halme, jeweils mit Blattbüschel (und Blüte an der Spitze)
  const branchTips: { x: number; y: number }[] = [];
  const branchStems: Path2D[] = [];
  for (let b = 0; b < p.branches.count; b++) {
    const t = p.branches.startAt + b * (0.5 / Math.max(1, p.branches.count));
    if (t > 0.95) break;
    const pt = stalkPoint(p, t);
    const side = b % 2 === 0 ? -1 : 1;
    const len = 0.22 + p.branches.spread * 0.3;
    const tipX = pt.x + side * len;
    const tipY = pt.y - len * 0.7;
    const branch = new Path2D();
    branch.moveTo(pt.x, pt.y);
    branch.bezierCurveTo(pt.x + side * len * 0.4, pt.y - len * 0.2, tipX - side * 0.03, tipY + len * 0.2, tipX, tipY);
    branchStems.push(branch);
    branchTips.push({ x: tipX, y: tipY });
  }

  // Blätter: die STELLUNG ist die sichtbare Folge der Interaktions-Achse `rhythm` —
  // wechselständig (ein Blatt je Knoten) · gegenständig (Paar) · quirlig (drei rund um den Knoten).
  const leaves: LeafGeom[] = [];
  const perNode = p.leaves.arrangement === 'whorled' ? 3 : p.leaves.arrangement === 'opposite' ? 2 : 1;
  const nodes = Math.max(1, Math.ceil(p.leaves.count / perNode));
  const step = 0.62 / nodes;
  for (let n = 0; n < nodes; n++) {
    const t = 0.22 + n * step;
    if (t > 0.97) break;
    const pt = stalkPoint(p, t);
    const sides = perNode === 1 ? [n % 2 === 0 ? -1 : 1]
      : perNode === 2 ? [-1, 1]
      : [-1, 1, n % 2 === 0 ? -0.5 : 0.5];
    for (const side of sides) {
      const asym = 1 + (side > 0 ? 1 : -1) * p.asymmetry * 0.35;
      const len = (0.2 + p.leaves.size * 0.34) * asym;
      const base = { x: pt.x + side * width * 0.4, y: pt.y + p.leaves.droop * 0.18 };
      const tip = { x: base.x + side * len, y: base.y - len * 0.3 };
      const path = leafPath(base.x, base.y, len, side, p.leaves.shape);
      leaves.push({ path, base, tip });
      silhouette.addPath(path);
    }
  }
  // Blattbüschel an den Triebspitzen
  for (const bt of branchTips) {
    const base = { x: bt.x, y: bt.y + 0.04 };
    const len = 0.16 + p.leaves.size * 0.14;
    const tip = { x: base.x - len * 0.4, y: base.y - len * 0.3 };
    const path = leafPath(base.x, base.y, len, -1, p.leaves.shape);
    leaves.push({ path, base, tip });
    silhouette.addPath(path);
  }

  // Halm + Triebe: erst Kontur (dunkel, breiter), dann Füllung — dieselbe Reihenfolge wie
  // in den übrigen Primitives (Silhouette mit Rand, kein schwebender Strich).
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = width + OUTLINE_W * 1.6;
  ctx.stroke(stalk);
  for (const branch of branchStems) {
    ctx.lineWidth = width * 0.6 + OUTLINE_W * 1.2;
    ctx.stroke(branch);
  }
  ctx.strokeStyle = primary;
  ctx.lineWidth = width;
  ctx.stroke(stalk);
  for (const branch of branchStems) {
    ctx.lineWidth = width * 0.6;
    ctx.stroke(branch);
  }

  drawRelief(ctx, p, stalk, width);
  for (let i = 0; i < leaves.length; i++) drawLeaf(ctx, leaves[i]!, i === 0 ? lighten(primary) : primary, darken(primary));

  // Dornen: das DRESS ist die sichtbare Folge der Interaktions-Achse `guard` —
  // Einzeldornen · dichter Dornenwald (beidseitig) · Schutzkappe (überlappende Platten).
  const dress = p.protection.dress;
  const perSide = dress === 'armour' ? 16 : dress === 'thicket' ? 14 : dress === 'prickly' ? 10 : 8;
  const thornCount = Math.round(p.protection.thorns * perSide);
  const thornLen = (0.1 + p.protection.length * 0.14) * (dress === 'thicket' ? 0.75 : dress === 'armour' ? 1.15 : 1);
  const bothSides = dress === 'thicket' || dress === 'armour';
  for (let i = 0; i < thornCount; i++) {
    const t = 0.12 + i * (0.8 / Math.max(1, thornCount));
    const pt = stalkPoint(p, t);
    const first = i % 2 === 0 ? -1 : 1;
    for (const side of bothSides ? [-1, 1] : [first]) {
      const thorn = new Path2D();
      if (dress === 'armour') {
        thorn.moveTo(pt.x + side * thornLen * 0.2, pt.y - thornLen * 0.6);
        thorn.lineTo(pt.x + side * thornLen, pt.y - thornLen * 0.15);
        thorn.lineTo(pt.x + side * thornLen * 0.3, pt.y + thornLen * 0.55);
      } else {
        thorn.moveTo(pt.x, pt.y);
        thorn.lineTo(pt.x + side * thornLen, pt.y - thornLen * 0.75);
        thorn.lineTo(pt.x + side * thornLen * 0.28, pt.y + thornLen * 0.2);
      }
      thorn.closePath();
      ctx.fillStyle = accent;
      ctx.fill(thorn);
      ctx.lineWidth = OUTLINE_W * 0.5;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke(thorn);
    }
  }

  drawPattern(ctx, p, silhouette);

  // Blüten: Halmspitze + jede Triebspitze
  if (p.flowers.form !== 'none') {
    const total = Math.max(1, p.flowers.count);
    const tip = stalkPoint(p, 1);
    drawFlower(ctx, p, tip.x, tip.y - 0.05, 0.1 + p.flowers.size * 0.14);
    for (let i = 1; i < total && i - 1 < branchTips.length; i++) {
      const bt = branchTips[i - 1]!;
      drawFlower(ctx, p, bt.x, bt.y - 0.02, 0.07 + p.flowers.size * 0.1);
    }
  }

  ctx.restore();
}

/** Idle-Bewegung: Amplitude aus dem Phänotyp (Wiegen/Wippen/Puls) — reine Präsentation. */
export function plantSway(p: PlantPhenotype, timeMs: number): number {
  if (p.motion.style === 'still') return 0;
  const freq = p.motion.style === 'pulse' ? 0.0016 : p.motion.style === 'whip' ? 0.0026 : 0.0011;
  return Math.sin(timeMs * freq) * (0.02 + p.motion.sway * 0.07);
}

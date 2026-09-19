// Owner: RenderSystem (Käfer-Anatomie). LOC ≤ 400.
// ZEICHNET, ENTSCHEIDET NICHT: jede Form, Struktur und Farbe kommt aus dem BeetlePhenotype
// (genome/beetlePhenotype.ts ← Genom ← Zuchtkern). Kein RNG, keine Uhr, keine Gameplay-Lesung.
//
// Koordinatenraum: normiert, y nach UNTEN, Blick von oben, Kopf nach −y, Standfläche bei y=0.
// Der Sprite-Bäcker (render/beetleSprites.ts) und jede UI-Vorschau rufen DIESELBE Funktion —
// eine Zeichenwahrheit pro Lebensform.
//
// Anatomie statt Ikone: der Käfer hat Kopf, Halsschild, Hinterleib mit Segmenten, sechs
// gegliederte Beine, Fühler, Mandibeln und Flügeldecken. Ein Farbpunkt war die alte Identität;
// sie ist GESTORBEN.

import type { BeetlePhenotype } from '../genome/beetlePhenotype';
import { shiftChannels } from '../core/color';

const OUTLINE = '#2b2118';
const OUTLINE_W = 0.03;

const darken = (hex: string): string => shiftChannels(hex, -66, -60, -52);
const lighten = (hex: string): string => shiftChannels(hex, 30, 32, 20);

/** Bein: Hüfte → Schenkel → Schiene als echte Gliederkette (Winkel aus `stance`). */
function drawLeg(
  ctx: CanvasRenderingContext2D,
  y: number,
  side: number,
  spread: number,
  length: number,
  fill: string,
): void {
  const hipX = side * 0.16 * (0.8 + spread * 0.4);
  const kneeX = hipX + side * length * 0.5;
  const kneeY = y - length * 0.22;
  const footX = kneeX + side * length * 0.42;
  const footY = y + length * 0.34;

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.055;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hipX, y);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(hipX, y);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();
}

/** Mandibel: Hakenkiefer mit Bezier-Krümmung — Länge und Breite aus dem Phänotyp. */
function drawMandible(ctx: CanvasRenderingContext2D, p: BeetlePhenotype, side: number, fill: string): void {
  const len = 0.08 + p.head.mandibleLength * 0.2;
  const w = 0.02 + p.head.mandibleWidth * 0.05;
  const y = -0.34 - p.head.size * 0.16;
  const x = side * (0.06 + p.head.mandibleWidth * 0.06);

  const jaw = new Path2D();
  jaw.moveTo(x, y);
  jaw.bezierCurveTo(x + side * w, y - len * 0.5, x + side * len * 0.75, y + len * 0.1, x + side * len * 0.25, y + len);
  jaw.bezierCurveTo(x + side * len * 0.4, y + len * 0.3, x + side * w * 0.5, y - len * 0.2, x, y);
  ctx.fillStyle = fill;
  ctx.fill(jaw);
  ctx.lineWidth = OUTLINE_W * 0.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke(jaw);
}

/** Fühler: gegliederte Schnur mit Knick (Anzahl/Länge aus dem Phänotyp). */
function drawAntenna(ctx: CanvasRenderingContext2D, p: BeetlePhenotype, side: number, fill: string): void {
  const len = 0.1 + p.antennae.length * 0.26;
  const segments = p.antennae.count === 4 ? 4 : 3;
  let x = side * (0.05 + p.head.size * 0.05);
  let y = -0.42 - p.head.size * 0.18;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.032;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    x += side * len * (0.28 - t * 0.08);
    y -= len * (0.34 - t * 0.05);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = 0.016;
  ctx.stroke();
}

/** Panzerkleid (Interaktions-Achse `chitin`): Platten, Schuppen, Buckel oder Panzerrand. */
function drawChitin(ctx: CanvasRenderingContext2D, p: BeetlePhenotype, clip: Path2D): void {
  ctx.save();
  ctx.clip(clip);
  ctx.strokeStyle = darken(p.pigment.primary);
  ctx.fillStyle = darken(p.pigment.primary);
  const dress = p.dress;
  if (dress === 'plated') {
    ctx.lineWidth = OUTLINE_W * 0.45;
    for (let i = 1; i <= 4; i++) {
      const y = -0.2 + i * 0.16;
      ctx.beginPath();
      ctx.arc(0, y - 0.14, 0.36, 0.25, Math.PI - 0.25);
      ctx.stroke();
    }
  } else if (dress === 'scaled') {
    ctx.lineWidth = OUTLINE_W * 0.35;
    for (let row = 0; row < 4; row++) {
      for (let col = -2; col <= 2; col++) {
        const y = -0.18 + row * 0.15 + (col % 2 === 0 ? 0 : 0.04);
        ctx.beginPath();
        ctx.arc(col * 0.13, y, 0.055, 0.15, Math.PI - 0.15);
        ctx.stroke();
      }
    }
  } else if (dress === 'studded') {
    for (let row = 0; row < 5; row++) {
      for (let col = -2; col <= 2; col++) {
        const y = -0.22 + row * 0.13;
        ctx.beginPath();
        ctx.arc(col * 0.12 + (row % 2 === 0 ? 0.03 : -0.03), y, 0.032, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // armoured: dicker Panzerrand + Rippen (der Käfer wirkt gepanzert, nicht dekoriert)
    ctx.lineWidth = OUTLINE_W * 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.34, 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = OUTLINE_W * 0.4;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 0.16, -0.34);
      ctx.lineTo(i * 0.2, 0.34);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Muster IN den Flügeldecken (Clip) — nie Deko über der Figur. */
function drawPattern(ctx: CanvasRenderingContext2D, p: BeetlePhenotype, clip: Path2D): void {
  if (p.pigment.pattern === 'solid') return;
  ctx.save();
  ctx.clip(clip);
  ctx.globalAlpha = 0.28 + p.pigment.strength * 0.45;
  ctx.fillStyle = p.pigment.accent;
  if (p.pigment.pattern === 'bands') {
    for (let i = 0; i < 3; i++) ctx.fillRect(-0.4, -0.26 + i * 0.2, 0.8, 0.07);
  } else if (p.pigment.pattern === 'spots') {
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 0.16, Math.sin(a) * 0.2, 0.045 + (i % 3) * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = p.pigment.accent;
    ctx.lineWidth = 0.014;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 0.12, 0, 0.1, 0.3, 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Panzerform der Flügeldecken: Kuppel, flach, gerippt oder bedornt. */
function elytraPath(p: BeetlePhenotype): Path2D {
  const halfW = 0.16 + p.body.width * 0.2;
  const len = 0.3 + p.body.length * 0.4;
  const path = new Path2D();
  path.moveTo(0, -len * 0.55);
  const bulge = p.carapace.form === 'flat' ? 0.85 : p.carapace.form === 'dome' ? 1.12 : 1;
  path.bezierCurveTo(halfW * bulge, -len * 0.5, halfW * 1.05, len * 0.1, 0, len * 0.5);
  path.bezierCurveTo(-halfW * 1.05, len * 0.1, -halfW * bulge, -len * 0.5, 0, -len * 0.55);
  return path;
}

/**
 * EIN Käfer. `span` = Kantenlänge des Zeichenfensters in Pixeln; die Anatomie ist normiert,
 * der Aufrufer skaliert. Der Aufrufer darf anschließend transformieren (Lauf-Bob, Biss) —
 * die Form selbst bleibt gebacken und unverändert.
 */
export function drawBeetleAnatomy(ctx: CanvasRenderingContext2D, p: BeetlePhenotype, span: number): void {
  const scale = (span / 2) * 0.72 * p.scale;
  const primary = p.pigment.primary;
  const shell = p.carapace.form === 'spiked' ? lighten(primary) : primary;

  ctx.save();
  ctx.translate(span / 2, span / 2);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Standfläche
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.ellipse(0, 0.46, 0.3 + p.body.width * 0.14, 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Beine (unter dem Körper): drei Paare, Vorder-, Mittel-, Hinterbeine
  const legRows = [-0.16, 0.02, 0.2];
  for (const y of legRows) {
    for (const side of [-1, 1]) {
      const asym = 1 + (side > 0 ? 1 : -1) * p.asymmetry * 0.25;
      drawLeg(ctx, y * (0.6 + p.body.length * 0.6), side, p.legs.stance, p.legs.length * 0.5 * asym, darken(primary));
    }
  }

  // Hinterleib-Segmente (unter den Decken sichtbar an den Rändern)
  ctx.fillStyle = darken(primary);
  for (let i = 0; i < 3; i++) {
    const y = 0.16 + i * 0.09;
    ctx.beginPath();
    ctx.ellipse(0, y, 0.16 + p.body.width * 0.16 - i * 0.015, 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mandibeln + Fühler VOR dem Kopf zeichnen, damit sie hinter ihm verschwinden
  for (const side of [-1, 1]) {
    drawMandible(ctx, p, side, lighten(p.pigment.accent));
    if (p.antennae.count > 0) drawAntenna(ctx, p, side, darken(primary));
    if (p.antennae.count === 4) drawAntenna(ctx, p, side * 0.55, darken(primary));
  }

  // Kopf + Halsschild
  const headR = 0.1 + p.head.size * 0.14;
  ctx.fillStyle = shiftChannels(primary, -18, -16, -12);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = OUTLINE_W;
  ctx.beginPath();
  ctx.ellipse(0, -0.44 - p.head.size * 0.1, headR, headR * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const thoraxW = 0.13 + p.body.width * 0.16;
  ctx.beginPath();
  ctx.ellipse(0, -0.24 - p.body.length * 0.06, thoraxW, 0.08 + p.head.thoraxRatio * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = shiftChannels(primary, -8, -6, -4);
  ctx.fill();
  ctx.stroke();

  // Flügeldecken (die Hauptsilhouette) + Panzerkleid + Muster
  const elytra = elytraPath(p);
  ctx.fillStyle = shell;
  ctx.fill(elytra);
  ctx.lineWidth = OUTLINE_W * 1.2;
  ctx.stroke(elytra);
  drawChitin(ctx, p, elytra);
  drawPattern(ctx, p, elytra);

  // Naht zwischen den Decken (geteilt vs. geschlossen) — die Decken sind kein Anstrich.
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = OUTLINE_W * 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -0.2 - p.body.length * 0.1);
  ctx.lineTo(0, 0.16 + p.body.length * 0.32);
  ctx.stroke();
  if (p.elytra.split) {
    const spread = 0.04 + p.elytra.spread * 0.12;
    ctx.strokeStyle = lighten(primary);
    ctx.lineWidth = OUTLINE_W * 0.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * spread, -0.2);
      ctx.lineTo(side * (spread + 0.06), 0.26);
      ctx.stroke();
    }
  }

  // Dornen auf dem Panzer (Form 'spiked') — Schutzstruktur, kein Ornament
  if (p.carapace.form === 'spiked') {
    for (let i = 0; i < 5; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const t = 0.3 + (i / 5) * 0.5;
      const x = side * (0.16 + p.body.width * 0.14);
      const y = -0.24 + t * 0.5;
      ctx.fillStyle = lighten(p.pigment.accent);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + side * 0.09, y - 0.05);
      ctx.lineTo(x + side * 0.02, y + 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = OUTLINE_W * 0.4;
      ctx.stroke();
    }
  }

  // Glanz (Oberfläche): ein Specular auf der Kuppel — Material, keine Deko
  if (p.carapace.sheen > 0.2) {
    ctx.globalAlpha = 0.16 + p.carapace.sheen * 0.34;
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath();
    ctx.ellipse(-0.1, -0.12, 0.08, 0.16, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/** Lauf-Bob: Amplitude aus dem Bewegungsstil — reine Präsentation, kein Gameplay-Einfluss. */
export function beetleBob(p: BeetlePhenotype, timeMs: number): number {
  const freq = p.motion.style === 'dash' ? 0.006 : p.motion.style === 'hop' ? 0.004 : p.motion.style === 'scuttle' ? 0.003 : 0.0018;
  const amp = p.motion.style === 'hop' ? 0.09 : p.motion.style === 'dash' ? 0.05 : 0.035;
  return Math.abs(Math.sin(timeMs * freq)) * amp;
}

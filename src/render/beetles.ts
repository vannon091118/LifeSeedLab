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
import { GAIT_STEPS_PER_CYCLE, bobAmplitudeOf } from './beetleGait';
// Tusche, Farbhelfer und die erweiterten Organe (Flügel, Pelz, Stachel, Halschild, Sprungbeine)
// kommen aus EINEM Organ-Modul — die Zeichenwahrheit der Käfer liegt dort, nicht doppelt hier.
import {
  BEETLE_INK as OUTLINE, BEETLE_INK_W as OUTLINE_W, ORGAN_GATES,
  beetleDarken as darken, beetleLighten as lighten,
  drawJumpLeg, drawPelage, drawPronotum, drawStinger, drawWings,
} from './beetleOrgans';

/**
 * Bein-Phase im Tripod-Gang: Vorder- und Hinterbein der einen Seite laufen mit dem Mittelbein
 * der anderen — das ist der Dreibein-Schritt echter Insekten. `row` 0..2 (vorn..hinten),
 * `side` −1|1. Ergebnis 0..1 (0 = Tritt nach vorn, 0.5 = gegenüberliegendes Dreibein).
 */
export function legPhase(row: number, side: number, gait: number): number {
  const inFirstTripod = (row + (side > 0 ? 1 : 0)) % 2 === 0;
  const p = gait + (inFirstTripod ? 0 : 0.5);
  return p - Math.floor(p);
}

/**
 * Bein: Hüfte → Schenkel → Schiene als echte Gliederkette. `swing` (0..1) verschiebt den Fuß
 * nach vorn/hinten und HEBT ihn beim Vorschwung — die Kette knickt mit, deshalb sieht es aus wie
 * ein Schritt und nicht wie ein Pendel.
 *
 * Koordinaten: Kopfnach vorn ist −y. Schritt nach vorn = kleineres y.
 */
function drawLeg(
  ctx: CanvasRenderingContext2D,
  y: number,
  side: number,
  spread: number,
  length: number,
  fill: string,
  swing = 0,
): void {
  // Ein voller Schritt: Vorschwung in der ersten Hälfte, Standbein schiebt in der zweiten.
  const cycle = swing * Math.PI * 2;
  const reach = Math.cos(cycle);           // +1 hinten, −1 vorn
  const lift = Math.max(0, Math.sin(cycle)); // angehoben nur beim Vorschwung

  const hipX = side * 0.16 * (0.8 + spread * 0.4);
  const stride = length * 0.55;
  const kneeX = hipX + side * length * 0.5;
  const kneeY = y - length * 0.22 - lift * stride * 0.25;
  const footX = kneeX + side * length * 0.42;
  const footY = y + length * 0.34 + reach * stride - lift * length * 0.42;

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
 *
 * `gait` (0..1) ist die Schrittphase aus dem `GaitTracker` (Strecke, nicht Zeit). Ohne Angabe
 * steht das Tier (Vorschau, Portrait) — dann ist die Bein-Stellung die Ruhestellung.
 */
export function drawBeetleAnatomy(ctx: CanvasRenderingContext2D, p: BeetlePhenotype, span: number, gait = 0): void {
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
  // Sprungbeine (Organ-Achse): das HINTERBEIN wird zum verdickten Sprungbein, wenn das Genom es
  // hergibt. Der Körperbau erklärt die Bewegung — nicht umgekehrt.
  const jump = p.organs.jumpLegs >= ORGAN_GATES.jumpLegs
    ? (p.organs.jumpLegs - ORGAN_GATES.jumpLegs) / (1 - ORGAN_GATES.jumpLegs)
    : 0;
  legRows.forEach((row, index) => {
    const hind = index === legRows.length - 1;
    for (const side of [-1, 1]) {
      const asym = 1 + (side > 0 ? 1 : -1) * p.asymmetry * 0.25;
      const y = row * (0.6 + p.body.length * 0.6);
      const length = p.legs.length * 0.5 * asym;
      // Beim Sprungbein übernimmt die Organ-Zeichnung den Schritt (sie kennt die eigene Form).
      if (hind && jump > 0) drawJumpLeg(ctx, y, side, p.legs.stance, length, darken(primary), jump);
      else drawLeg(ctx, y, side, p.legs.stance, length, darken(primary), legPhase(index, side, gait));
    }
  });

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

  // Halschild über dem Thorax (Organ-Achse) — bei Hirschkäfer-artigen Tieren der auffälligste Teil.
  drawPronotum(ctx, p);

  // Flügel UNTER den Decken: die Membranen kommen seitlich hervor, das Tier KANN fliegen.
  drawWings(ctx, p);

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

  // Stachel am Hinterleibsende (Organ-Achse) — sichtbar, was das Tier wehren kann.
  drawStinger(ctx, p);

  // Pelz als Saum über der fertigen Silhouette (Organ-Achse) — das Merkmal, das Hummel von
  // Wespe trennt. Zuletzt, damit der Flaum über Kontur und Muster liegt wie echtes Fell.
  drawPelage(ctx, p);

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

/**
 * Lauf-Bob: hängt an der GANG-PHASE, nicht an der Uhr (B41). Zwei Hübe je Zyklus = ein Hub je
 * Schritt, deshalb steigt der Körper genau dann, wenn ein Dreibein tritt. Steht das Tier, steht
 * auch der Bob — vorher zappelte es an Ort und Stelle weiter.
 */
export function beetleBob(p: BeetlePhenotype, gait: number): number {
  const humps = Math.abs(Math.sin(gait * Math.PI * GAIT_STEPS_PER_CYCLE));
  return humps * bobAmplitudeOf(p);
}

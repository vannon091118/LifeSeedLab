// Owner: RenderSystem (Käfer-Organe). LOC ≤ 400.
// MODULARE ERWEITERUNG (Regel 4.4): die Organe wachsen als eigene Zeichenfunktionen HIER an,
// statt als weitere `if`-Zweige in der Hauptanatomie. Eine neue Körperachse = eine neue Funktion
// plus ein Aufruf — nie ein gewachsener Monolith.
//
// ZEICHNET, ENTSCHEIDET NICHT: jede Länge, jeder Winkel und jede Dichte kommt aus dem
// BeetlePhenotype. Kein RNG, keine Uhr — die „Streuung" der Härchen ist eine Index-Arithmetik,
// damit dasselbe Tier auf jeder Maschine gleich aussieht.
//
// Diese Datei besitzt auch die TUSCHE (Konturfarbe/-breite) und die Farbhelfer der Käferzeichnung
// — eine Wahrheit für Anatomie und Organe, damit beide nicht auseinanderdriften können.

import type { BeetlePhenotype } from '../genome/beetlePhenotype';
import { shiftChannels } from '../core/color';

export const BEETLE_INK = '#2b2118';
export const BEETLE_INK_W = 0.03;

export const beetleDarken = (hex: string): string => shiftChannels(hex, -66, -60, -52);
export const beetleLighten = (hex: string): string => shiftChannels(hex, 30, 32, 20);

/** Schwellen, ab denen ein Organ überhaupt sichtbar wird (Source-Nähe: Form aus dem Genom). */
const WING_MIN = 0.25;
const PELAGE_MIN = 0.22;
const STING_MIN = 0.3;
const PRONOTUM_MIN = 0.42;
const JUMP_MIN = 0.4;

/**
 * Flügel: zwei häutige Membranen, die seitlich unter den Decken hervorkommen. Ohne diese Achse
 * gab es kein Tier, das fliegen KANN — eine „Hummel" war zwangsläufig ein Käfer.
 */
export function drawWings(ctx: CanvasRenderingContext2D, p: BeetlePhenotype): void {
  if (p.organs.wings < WING_MIN) return;
  const reach = (p.organs.wings - WING_MIN) / (1 - WING_MIN);
  const span = 0.3 + reach * 0.46;
  for (const side of [-1, 1]) {
    const wing = new Path2D();
    wing.moveTo(side * 0.07, -0.2);
    wing.bezierCurveTo(side * (0.16 + span * 0.3), -0.32 - reach * 0.06, side * (0.24 + span * 0.62), 0.04, side * (0.08 + span * 0.44), 0.2);
    wing.bezierCurveTo(side * (0.05 + span * 0.18), 0.05, side * 0.05, -0.12, side * 0.07, -0.2);
    ctx.globalAlpha = 0.3 + reach * 0.3;
    ctx.fillStyle = beetleLighten(p.pigment.accent);
    ctx.fill(wing);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = BEETLE_INK;
    ctx.lineWidth = BEETLE_INK_W * 0.4;
    ctx.stroke(wing);
    // Flügelader — die Membran ist eine Struktur, kein Farbfleck.
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(side * 0.07, -0.18);
    ctx.lineTo(side * (0.16 + span * 0.5), 0.14);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/**
 * Pelz: dichter Flaum am Außenrand von Brust und Hinterleib. Der Pelz ist das Merkmal, das eine
 * Hummel von einer Wespe trennt — deshalb sitzt er als eigener Saum auf der Silhouette.
 */
export function drawPelage(ctx: CanvasRenderingContext2D, p: BeetlePhenotype): void {
  if (p.organs.pelage < PELAGE_MIN) return;
  const reach = (p.organs.pelage - PELAGE_MIN) / (1 - PELAGE_MIN);
  const density = 14 + Math.round(reach * 16);
  const hair = 0.03 + reach * 0.05;
  ctx.strokeStyle = beetleLighten(p.pigment.accent);
  ctx.lineWidth = BEETLE_INK_W * 0.28;
  ctx.lineCap = 'round';
  for (let i = 0; i < density; i++) {
    const t = i / density;
    // Index-Arithmetik statt Zufall: dasselbe Tier, dasselbe Fell (Determinismus-Regel).
    const ring = i % 3 === 0 ? 1.1 : i % 3 === 1 ? 1 : 0.9;
    const wobble = ((i * 7) % 5) / 5 - 0.5;
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (0.14 + p.body.width * 0.22) * ring;
    const y = -0.2 + t * 0.56 + wobble * 0.03;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + side * hair, y - hair * 0.35);
    ctx.stroke();
  }
}

/** Stachel: Wehrdorn am Hinterleibsende. Länge kommt aus der Achse, nie aus dem Bild. */
export function drawStinger(ctx: CanvasRenderingContext2D, p: BeetlePhenotype): void {
  if (p.organs.stinger < STING_MIN) return;
  const reach = (p.organs.stinger - STING_MIN) / (1 - STING_MIN);
  const len = 0.08 + reach * 0.16;
  const tail = 0.3 + p.body.length * 0.3;
  const spike = new Path2D();
  spike.moveTo(-0.035, tail);
  spike.lineTo(0, tail + len);
  spike.lineTo(0.035, tail);
  spike.closePath();
  ctx.fillStyle = beetleDarken(p.pigment.accent);
  ctx.fill(spike);
  ctx.strokeStyle = BEETLE_INK;
  ctx.lineWidth = BEETLE_INK_W * 0.45;
  ctx.stroke(spike);
}

/**
 * Halschild: die Platte zwischen Kopf und Decken. Bei Hirschkäfer-artigen Tieren ist sie der
 * auffälligste Teil — vorher war das Thorax-Ellipsoid für jedes Tier identisch.
 */
export function drawPronotum(ctx: CanvasRenderingContext2D, p: BeetlePhenotype): void {
  if (p.organs.pronotum < PRONOTUM_MIN) return;
  const reach = (p.organs.pronotum - PRONOTUM_MIN) / (1 - PRONOTUM_MIN);
  const w = (0.13 + p.body.width * 0.16) * (1.15 + reach * 0.55);
  const h = (0.08 + p.head.thoraxRatio * 0.08) * (1 + reach * 0.35);
  ctx.fillStyle = shiftChannels(p.pigment.primary, -4, -3, -2);
  ctx.strokeStyle = BEETLE_INK;
  ctx.lineWidth = BEETLE_INK_W;
  ctx.beginPath();
  ctx.ellipse(0, -0.24 - p.body.length * 0.06, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Schildkante in der Mitte — das Schild ist ein Bauteil, keine Verdickung.
  ctx.lineWidth = BEETLE_INK_W * 0.4;
  ctx.beginPath();
  ctx.moveTo(-w * 0.7, -0.24 - p.body.length * 0.06);
  ctx.lineTo(w * 0.7, -0.24 - p.body.length * 0.06);
  ctx.stroke();
}

/** Sprungbein: verdickter Schenkel am Hinterbein — der Körperbau, der hüpfen erklärt. */
export function drawJumpLeg(
  ctx: CanvasRenderingContext2D,
  y: number,
  side: number,
  spread: number,
  length: number,
  fill: string,
  jump: number,
): void {
  const hipX = side * 0.16 * (0.8 + spread * 0.4);
  const kneeX = hipX + side * length * (0.5 + jump * 0.2);
  const kneeY = y - length * (0.22 + jump * 0.3);
  const footX = kneeX + side * length * 0.42;
  const footY = y + length * 0.34;

  ctx.strokeStyle = BEETLE_INK;
  ctx.lineWidth = 0.055 + jump * 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hipX, y);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();

  // Verdickter Schenkel — die Sprungmuskulatur ist sichtbar, nicht behauptet.
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse((hipX + kneeX) / 2, (y + kneeY) / 2, length * (0.1 + jump * 0.08), length * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = BEETLE_INK;
  ctx.lineWidth = BEETLE_INK_W * 0.4;
  ctx.stroke();
}

/** Sichtbarkeits-Schwellen für die Anatomie (ein Ort, nicht verstreut). */
export const ORGAN_GATES = { wings: WING_MIN, pelage: PELAGE_MIN, stinger: STING_MIN, pronotum: PRONOTUM_MIN, jumpLegs: JUMP_MIN } as const;

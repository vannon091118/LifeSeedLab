// Owner: UI (Präsentation, read-only). LOC ≤ 200.
// EIN Weg, ein Wesen zu zeigen: dieselbe Anatomie-Zeichenfunktion, die auch das Feld benutzt
// (render/plants.ts, render/beetles.ts). Vorher zeigte die UI farbige Flächen („44×44-Rechteck“)
// — die Karte konnte damit ein anderes Wesen versprechen als das Feld lieferte (Befund B27).
//
// Kein RNG, kein Zustand, keine Entscheidung: die Vorschau bekommt den fertigen Phänotyp.

import { useEffect, useRef } from 'react';
import { drawPlantAnatomy } from '../render/plants';
import { drawBeetleAnatomy } from '../render/beetles';
import { genomeToVisualInput } from '../genome/visualMap';
import { GAME_SEED } from '../config';
import type { PlantVariant } from '../types';
import type { PlantPhenotype } from '../genome/plantPhenotype';
import type { BeetlePhenotype } from '../genome/beetlePhenotype';

type Props = { size?: number; className?: string; title?: string };

function useAnatomyCanvas(
  draw: (ctx: CanvasRenderingContext2D, span: number) => void,
  size: number,
  label: string,
) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(size * dpr);
    canvas.width = px;
    canvas.height = px;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, px, px);
    draw(ctx, px);
  }, [draw, size, label]);
  return ref;
}

/** EINE Pflanze als Bild — Silhouette, Blattstellung, Dornenkleid, Muster inklusive. */
export function PlantCanvas({ phenotype, size = 72, className, title }: Props & { phenotype: PlantPhenotype }) {
  const ref = useAnatomyCanvas(
    (ctx, span) => drawPlantAnatomy(ctx, phenotype, span),
    size,
    title ?? 'plant',
  );
  return <canvas ref={ref} className={className} role="img" aria-label={title ?? 'Pflanze'} />;
}

/**
 * EINE Pflanzen-KACHEL für Listen (Hub, Gewächshaus, Shop): der Phänotyp wird mit derselben
 * Ableitung gebaut wie im Feld (`genomeToVisualInput`) — die Karte kann damit kein anderes
 * Wesen ankündigen als das, das später steht. Der Hub malte hier als letzte Fläche noch einen
 * Farbpunkt (B27); seit 20.09.2026 zeigt auch er die Anatomie.
 *
 * Unbekannte (Alt-Save-)IDs bleiben neutral grau: lieber kein Bild als ein gelogenes.
 */
export function PlantVariantThumb({ variant, size = 44, className, title }: { variant?: PlantVariant } & Props) {
  if (!variant) {
    return (
      <span
        className={className}
        aria-hidden
        style={{ width: size, height: size, borderRadius: 8, background: '#ddd', border: '2px solid var(--ink)', display: 'block', flexShrink: 0 }}
      />
    );
  }
  return (
    <PlantCanvas
      phenotype={genomeToVisualInput(variant, GAME_SEED).phenotype}
      size={size}
      className={className}
      title={title ?? variant.name}
    />
  );
}

/** EIN Käfer als Bild — Panzer, Mandibeln, Beine, Panzerkleid inklusive. */
export function BeetleCanvas({ phenotype, size = 72, className, title }: Props & { phenotype: BeetlePhenotype }) {
  const ref = useAnatomyCanvas(
    (ctx, span) => drawBeetleAnatomy(ctx, phenotype, span),
    size,
    title ?? 'beetle',
  );
  return <canvas ref={ref} className={className} role="img" aria-label={title ?? 'Käfer'} />;
}

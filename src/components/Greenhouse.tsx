import { useState } from 'react';
import type { MetaSave, PlantVariant, PendingCross } from '../types';
import type { TranslationKey } from '../i18n';
import { useI18n } from '../i18n';
import { rollGachaCross, crossPair, deriveBreedSeed, deriveGachaSeed, createBaseVariants, type GachaRoll } from '../genome';
import { consumeSeedAndEnqueueCross, keepCross, isCrossReady, plantSeedlingIntoPot, buyRearingSlot } from '../meta';
import { wavesToUnlockFor, rearingSlotGate, REARING_SLOTS_MAX } from '../config/economy.source';
import { helpText } from '../i18n/help';
import { genomeToVisualInput } from '../genome/visualMap';
import { PlantCanvas } from './PhenotypeCanvas';
import { GAME_SEED } from '../config';

// Owner: UI (Greenhouse screen). LOC ≤ 400.
// GEWÄCHSHAUS — fachlich getrennt vom SeedShop (P2): Hier wird AUSSÄT + REIFUNG +
// ERGEBNIS-Übernahme gespielt. Kauf von Samen gehört in den SeedShop (eigene Datei,
// gleiche Meta-Owner). Keine Dopplung: consumeSeedAndEnqueueCross/keepCross
// bleiben die einzigen Writer in persistence/.

const BASES: PlantVariant[] = createBaseVariants();

type Props = {
  meta: MetaSave;
  onMetaChange: (m: MetaSave) => void;
  onClose: () => void;
};

export function Greenhouse({ meta, onMetaChange, onClose }: Props) {
  const { t, lang } = useI18n();
  const [lastRoll, setLastRoll] = useState<GachaRoll | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  /** Aktuell gezogener Keimling (Drag&Drop-Quelle) — null = nichts in der Hand. */
  const [heldSeedling, setHeldSeedling] = useState<string | null>(null);
  /**
   * ELTERNWAHL (Playtest-Befund „Aussäen würfelt Myzel × Wurzelmauer automatisch", 19.09.2026):
   * Der Spieler bestimmt das Paar — nicht der Würfel. A und B sind zwei Tipps auf die eigenen
   * Pflanzen; ein dritter Tipp auf dieselbe Karte nimmt sie wieder heraus.
   */
  const [parentA, setParentA] = useState<string | null>(null);
  const [parentB, setParentB] = useState<string | null>(null);
  const pickParent = (id: string) => {
    if (parentA === id) { setParentA(parentB); setParentB(null); return; }
    if (parentB === id) { setParentB(null); return; }
    if (parentA === null) { setParentA(id); return; }
    if (parentB === null) { setParentB(id); return; }
    setParentA(parentB); setParentB(id);
  };

  /**
   * Trait-Tag in der Anzeige: Gen-IDs sind sprachneutral (`trait.<id>`), Alt-Saves tragen
   * noch die früheren englischen Labels — die bleiben als Rohtext stehen (kein Datenverlust,
   * neue Pflanzen sind übersetzt).
   */
  const traitTagLabel = (trait: string): string => {
    if (trait.includes(' ')) return trait; // Alt-Save-Label (z. B. „rapid fire“)
    return t(`trait.${trait}` as TranslationKey);
  };

  const owned: PlantVariant[] = useMemoOwned(meta);

  // B18.3: Aussaat ist frei (B17.3 keimt Käufe direkt — ein Stash-Gate würde die Zucht
  // für immer sperren). Die Kosten liegen im Elternverbrauch beim Keep.
  // B20: fail-closed ODER je Quelle — volle Reifungs-Queue sperrt die Aussaat, sonst
  // würde `capped()` stillschweigend den ÄLTESTEN (fast reifen) Eintrag werfen.
  // Die Queue-Grenze ist der GEKAUFTE Reifungsplatz (3..12) — nicht die harte Obergrenze.
  const queueFull = meta.pendingCrosses.length >= meta.rearingSlots;
  // B34: Reife Einträge in der Queue — sie sind der Ausweg aus der vollen Queue (erst abholen).
  const readyCount = meta.pendingCrosses.filter(c => isCrossReady(meta, c.crossIndex)).length;
  const parentsReady = parentA !== null && parentB !== null && parentA !== parentB;
  const canSow = owned.length >= 2 && parentsReady && !queueFull;
  // Reifungsplatz-Zukauf (Entscheidung 19.09.2026): Preis UND Wellenmarke zusammen.
  const slotGate = rearingSlotGate(meta.rearingSlots);
  const canBuySlot = slotGate !== null && meta.nektar >= slotGate.nektar && meta.bestWave >= slotGate.wave;

  /** Keimling in Topf N einsetzen (Drop-Ziel; heldSeedling ist die Hand). */
  const handleDropIntoPot = (potIndex: number) => {
    if (!heldSeedling) return;
    const m = plantSeedlingIntoPot(heldSeedling, potIndex);
    if (m) {
      onMetaChange(m);
      setHeldSeedling(null);
    }
  };

  const handleSow = () => {
    if (!canSow) return;
    const a = owned.find(v => v.id === parentA);
    const b = owned.find(v => v.id === parentB);
    if (!a || !b) return;
    const crossIndex = meta.breedGeneration;
    // Die Kreuzung läuft über die GEWÄHLTEN Eltern (`crossPair`, deterministisch aus beiden
    // IDs + Generation). Der Seed wird mitgespeichert, damit die Reifungs-Zeile denselben
    // Nachkommen rekonstruieren kann, falls ein Altsave kein `child` trägt.
    const gachaSeed = deriveBreedSeed(a.id, b.id, crossIndex);
    const roll = crossPair(a, b, crossIndex);
    if (!roll) return;
    // ATOMAR: Seed-Verbrauch + Cross-Enqueue in EINEM Persistenzschritt —
    // kein Zustand mehr möglich, in dem der Seed verbrannt ist, aber keine Kreuzung wartet.
    // B19: das Kind + Eltern werden MIT persistiert — der Claim hängt nur am Wellen-Timer.
    const m = consumeSeedAndEnqueueCross(gachaSeed, crossIndex, meta.totalWavesSurvived, roll.child, roll.parentA.id, roll.parentB.id);
    if (!m) return;
    setLastRoll(roll);
    onMetaChange(m);
  };

  const handleKeep = async (roll: GachaRoll) => {
    // Reifungs-Vertrag: behalten erst nach X überlebten Wellen (economy.source).
    // Ein Gate (isCrossReady), fail-closed — UI liest nur (B14.4).
    if (!isCrossReady(meta, roll.crossIndex)) return;
    // B1: Keep verbraucht je 1× beider Eltern + bucht die Queue aus (ein Writer, ein Schritt).
    const m = keepCross(roll.child, roll.parentA.id, roll.parentB.id, roll.crossIndex);
    if (!m) {
      setShareNote(t('shop.parentsGone'));
      setTimeout(() => setShareNote(null), 2200);
      return;
    }
    onMetaChange(m);
    setLastRoll(null);
    // Discovery-Chain: append-only, hash-linked, lokale Deduplizierung
    try {
      const { appendDiscovery } = await import('../discovery/codex');
      const { hashGenome } = await import('../discovery/chain');
      const res = appendDiscovery({
        genome: roll.child.genome,
        parents: [roll.parentA.id, roll.parentB.id],
        seed: deriveGachaSeed(roll.crossIndex),
        generation: roll.crossIndex,
      });
      if (res.appended) setShareNote(`${t('discovery.appended')}: ${hashGenome(roll.child.genome)}`);
      else if (res.reason) setShareNote(t('discovery.duplicate'));
      setTimeout(() => setShareNote(null), 2200);
    } catch {
      // discovery is additive — never block the claim
    }
  };

  const handleShareSeed = async (roll: GachaRoll) => {
    const { appendDiscovery, seedShareText } = await import('../discovery/codex');
    // ensure entry exists before sharing (idempotent due to tryAppend)
    appendDiscovery({
      genome: roll.child.genome,
      parents: [roll.parentA.id, roll.parentB.id],
      seed: deriveGachaSeed(roll.crossIndex),
      generation: roll.crossIndex,
    });
    const text = seedShareText(deriveGachaSeed(roll.crossIndex), roll.crossIndex, roll.child.genome);
    try {
      await navigator.clipboard.writeText(text);
      setShareNote(t('codex.copied'));
    } catch {
      setShareNote(text);
    }
    setTimeout(() => setShareNote(null), 1800);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t('greenhouse.title')}</h2>
          <div style={styles.headerRight}>
            <span style={styles.stash}>{t('shop.pending').replace('{n}', String(meta.pendingCrosses.length)).replace('{m}', String(meta.rearingSlots))}</span>
            <button onClick={onClose} style={styles.closeBtn} aria-label={t('common.close')}>✕</button>
          </div>
        </div>
        <p style={styles.desc}>{t('greenhouse.desc')}</p>
        {shareNote && <div style={styles.shareNote}>{shareNote}</div>}

        {/* ── Einstiegs-Loop: TÖPFE — die physischen Platzierungsplätze ──
            Drei Slots (GREENHOUSE_POT_SLOTS), keine automatische Erweiterung (PvP später).
            Keimling anfassen → auf freien Topf tippen = eingesetzt. */}
        <div style={styles.potsRow}>
          {meta.pots.map(( occupant, i) => (
            <button
              key={i}
              onClick={() => handleDropIntoPot(i)}
              disabled={occupant !== null || !heldSeedling}
              data-tut={`pot-${i}`}
              aria-label={occupant ? t('greenhouse.potOccupied') : t('greenhouse.potFree')}
              style={{
                ...styles.pot,
                opacity: occupant ? 1 : heldSeedling ? (meta.pots[i] === null ? 1 : 0.4) : 0.8,
                borderColor: heldSeedling && !occupant ? 'var(--leaf-dark)' : 'var(--ink)',
              }}
            >
              {occupant
                ? <>
                    <PlantThumb variant={findVariant(occupant, meta)} size={34} />
                    <span style={styles.potName}>{variantName(occupant, meta)}</span>
                  </>
                : <span style={styles.potEmpty}>{heldSeedling ? t('greenhouse.potDropHere') : t('greenhouse.potFree')}</span>
              }
            </button>
          ))}
        </div>

        {/* Keimlings-Tray: ungepflanzte Käufe — die Drag-Quelle. */}
        {meta.seedlings.length > 0 && (
          <div style={styles.seedlingRow}>
            <span style={styles.sectionTitle}>{t('greenhouse.seedlings').replace('{n}', String(meta.seedlings.length))}</span>
            {meta.seedlings.map(id => (
              <button
                key={id}
                onClick={() => setHeldSeedling(held => (held === id ? null : id))}
                data-tut="seedling"
                aria-pressed={heldSeedling === id}
                style={{
                  ...styles.seedling,
                  borderColor: heldSeedling === id ? 'var(--leaf-dark)' : 'var(--ink)',
                  background: heldSeedling === id ? '#eef7e6' : '#fff',
                }}
              >
                🌱 {variantName(id, meta)}
              </button>
            ))}
          </div>
        )}

        {/* Spieler-Hilfe (B20): zusammenklappbar — erklärt den kostenlosen Loop */}
        <button
          onClick={() => setHelpOpen(o => !o)}
          aria-expanded={helpOpen}
          style={styles.helpToggle}
        >
          {helpText('help.greenhouse.toggle', lang)}
        </button>
        {helpOpen && <div style={styles.helpBox}>{helpText('help.greenhouse', lang)}</div>}

        {/* Aussaat */}
        {/* ELTERNWAHL: das Kernversprechen der Zucht ist eine Entscheidung, kein Wurf. */}
        <div style={styles.parentRow}>
          <span style={styles.sectionTitle}>{t('greenhouse.parents')}</span>
          {owned.map(v => {
            const isA = parentA === v.id;
            const isB = parentB === v.id;
            return (
              <button
                key={v.id}
                onClick={() => pickParent(v.id)}
                aria-pressed={isA || isB}
                style={{ ...styles.parentCard, ...(isA || isB ? styles.parentCardActive : {}) }}
                title={v.name}
              >
                <PlantThumb variant={v} size={40} />
                <span style={styles.parentName}>{v.name}</span>
                {(isA || isB) && <span style={styles.parentBadge}>{isA ? 'A' : 'B'}</span>}
              </button>
            );
          })}
        </div>
        <div style={styles.parentLine}>
          {t('greenhouse.parentsChosen')
            .replace('{a}', parentA ? variantName(parentA, meta) : '—')
            .replace('{b}', parentB ? variantName(parentB, meta) : '—')}
        </div>

        <button onClick={handleSow} disabled={!canSow} style={{ ...styles.sowBtn, opacity: canSow ? 1 : 0.4 }}>
          🌱 {canSow ? t('shop.sow') : t('shop.sowPickParents')}
        </button>
        {!canSow && queueFull && (
          <div style={readyCount > 0 ? { ...styles.hint, color: 'var(--leaf-dark)', borderColor: 'var(--leaf-dark)' } : styles.hint}>
            {readyCount > 0
              ? t('shop.queueFullReady').replace('{r}', String(readyCount))
              : t('shop.sowEmpty').replace('{n}', String(meta.pendingCrosses.length)).replace('{m}', String(meta.rearingSlots))}
          </div>
        )}
        {!canSow && owned.length < 2 && <div style={styles.hint}>{t('shop.needTwo')}</div>}

        {/* REIFUNGSPLATZ KAUFEN: Preis UND Wellenmarke (steile Kurve bis Platz 12). */}
        {slotGate ? (
          <>
            <button
              onClick={() => { const m = buyRearingSlot(); if (m) onMetaChange(m); }}
              disabled={!canBuySlot}
              style={{ ...styles.slotBtn, opacity: canBuySlot ? 1 : 0.55 }}
              data-tut="buy-slot"
            >
              {t('greenhouse.buySlot')} — 🍯 {slotGate.nektar} · {t('greenhouse.buySlotWave').replace('{n}', String(slotGate.wave))}
            </button>
            {meta.bestWave < slotGate.wave && (
              <div style={styles.hint}>
                {t('greenhouse.slotWaveMissing').replace('{n}', String(slotGate.wave)).replace('{s}', String(meta.bestWave))}
              </div>
            )}
          </>
        ) : (
          <div style={styles.hint}>{t('greenhouse.slotsFull').replace('{m}', String(REARING_SLOTS_MAX))}</div>
        )}

        {/* Gacha-Ergebnis */}
        {lastRoll && (
          <div style={styles.resultCard}>
            <div style={styles.resultTitle}>{t('gacha.result')}</div>
            <div style={styles.childRow}>
              <PlantThumb variant={lastRoll.child} size={48} />
              <div style={styles.childInfo}>
                <strong style={styles.childName}>{lastRoll.child.name}</strong>
                <div style={styles.traitRow}>
                  {lastRoll.child.traits.slice(0, 3).map(tr => (
                    <span key={tr} style={styles.traitTag}>{traitTagLabel(tr)}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={styles.parentsLine}>
              {t('gacha.parents')} {lastRoll.parentA.name} × {lastRoll.parentB.name}
            </div>
            <div style={styles.maturationLine}>
              {t('shop.maturing').replace('{n}', String(wavesToUnlockFor(lastRoll.crossIndex)))}
            </div>
            <div style={styles.resultActions}>
              <button
                onClick={() => handleKeep(lastRoll)}
                style={{ ...styles.claimBtn, opacity: isCrossReady(meta, lastRoll.crossIndex) ? 1 : 0.45 }}
                disabled={!isCrossReady(meta, lastRoll.crossIndex)}
              >
                {isCrossReady(meta, lastRoll.crossIndex) ? t('shop.ready') : t('shop.maturing').replace('{n}', String(wavesToUnlockFor(lastRoll.crossIndex)))}
              </button>
              <button onClick={() => handleShareSeed(lastRoll)} style={styles.shareBtn}>⧉ {t('codex.share')}</button>
            </div>
          </div>
        )}

        {/* Reifungs-Queue (B15.1/B15.3): das Kind wird aus dem PERSISTIERTEN Seed
            rekonstruiert — kein React-State über den Screen-Wechsel hinweg. Reife Zeilen
            zeigen Kind + Beanspruchen-Knopf, unreife die verbleibenden Wellen. */}
        {meta.pendingCrosses.length > 0 && (
          <div style={styles.pendingRow}>
            <span style={styles.sectionTitle}>
              {readyCount > 0 && ' 🌟'}
              {t('shop.pending').replace('{n}', String(meta.pendingCrosses.length)).replace('{m}', String(meta.rearingSlots))}
            </span>
            {meta.pendingCrosses.map((c) => {
              const remaining = Math.max(0, c.neededWaves - (meta.totalWavesSurvived - c.startedWave));
              if (!isCrossReady(meta, c.crossIndex)) {
                return (
                  <div key={c.crossIndex} style={styles.pendingItem}>
                    {t('shop.maturing').replace('{n}', String(remaining))}
                  </div>
                );
              }
              // B19: Reif ⇒ das PERSISTIERTE Kind anzeigen (Autorität), kein Neu-Wurf aus
              // dem inzwischen veränderten Bestand. Legacy (Altsave ohne child): aus dem
              // Seed rekonstruieren; null ⇒ parentsGone-Meldung wie bisher.
              const roll = c.child
                ? { child: c.child, parentA: findVariant(c.parentAId ?? '', meta), parentB: findVariant(c.parentBId ?? '', meta), probability: 1, crossIndex: c.crossIndex } as GachaRoll
                // Altsave ohne `child`: erst über das GESPEICHERTE Paar rekonstruieren (das ist die
                // Kreuzung, die der Spieler gewählt hat) — der Sammelwurf ist nur der Notausgang.
                : (pairRollFor(c, meta) ?? rollGachaCross(owned, c.seed, c.crossIndex));
              return (
                <div key={c.crossIndex} style={styles.pendingReady}>
                  <div style={styles.childRow}>
                    <PlantThumb variant={roll?.child} size={40} />
                    <div style={styles.childInfo}>
                      <strong style={styles.childName}>{roll?.child.name ?? t('shop.parentsGone')}</strong>
                      <div style={styles.parentsLine}>
                        {roll ? `${t('gacha.parents')} ${roll.parentA?.name ?? '?'} × ${roll.parentB?.name ?? '?'}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => roll && handleKeep(roll)}
                      disabled={!roll}
                      style={{ ...styles.claimBtn, opacity: roll ? 1 : 0.4, flex: '0 0 auto', padding: '8px 14px' }}
                    >
                      {t('shop.ready')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers (pure, module-level) ─────────────────────────────────
// Reife-Prüfung lebt ausschließlich in `meta/economy.ts` (isCrossReady) — keine zweite
// Ableitung mehr im Screen (A13.7/B14.4). Vorher stand hier eine zweite, die bei unbekanntem
// `crossIndex` `true` zurückgab (fail-open).

/** Besitz-Liste (kanonische IDs; Altsaves mit base_*-Counts bleiben sichtbar). */
function useMemoOwned(meta: MetaSave): PlantVariant[] {
  return Object.keys(meta.variantCounts)
    .filter(id => (meta.variantCounts[id] ?? 0) > 0)
    .map(id => findVariant(id, meta))
    .filter((v): v is PlantVariant => v !== undefined);
}

/**
 * Befund B27 (Breeding→Visual): das Gewächshaus zeigte bisher ein Farbfeld — dieselbe Pflanze
 * sah im Zucht-Screen anders aus als im Feld. Jetzt zeichnet die Vorschau mit DERSELBEN
 * Anatomie-Funktion wie der Run (render/plants.ts): Silhouette, Blattstellung, Dornenkleid und
 * Muster sind an der Karte ablesbar, nicht nur ihr Grundton.
 * Unbekannte (Altsave-)IDs bleiben neutral grau — lieber kein Bild als ein gelogenes.
 */
const PlantThumb = ({ variant, size, title }: { variant?: PlantVariant; size: number; title?: string }) =>
  variant
    ? <PlantCanvas phenotype={genomeToVisualInput(variant, GAME_SEED).phenotype} size={size} title={title ?? variant.name} />
    : <span style={{ width: size, height: size, borderRadius: 8, background: '#ddd', border: '2px solid var(--ink)', display: 'block' }} />;

/**
 * Nachkomme eines gepaarten Reifungs-Eintrags rekonstruieren: dieselben Eltern + dieselbe
 * Generation ⇒ dasselbe Kind (`crossPair` ist deterministisch aus beiden IDs abgeleitet).
 */
function pairRollFor(c: PendingCross, meta: MetaSave): GachaRoll | null {
  const a = findVariant(c.parentAId ?? '', meta);
  const b = findVariant(c.parentBId ?? '', meta);
  if (!a || !b || a.id === b.id) return null;
  return crossPair(a, b, c.crossIndex);
}

/** Anzeigename einer Variant-ID — Besitz-Bibliothek zuerst, Fallback die ID. */
function variantName(id: string, meta: MetaSave): string {
  return meta.savedVariants.find(v => v.id === id)?.name ?? id;
}

/** Variant-ID → Wesen: Grundpflanzen zuerst, dann die eigene Bibliothek (eine Suche, zwei Nutzer). */
function findVariant(id: string, meta: MetaSave): PlantVariant | undefined {
  return BASES.find(v => v.id === id) ?? meta.savedVariants.find(v => v.id === id);
}

const styles: Record<string, React.CSSProperties> = {
  // Screen-Betrieb: Vollbild-Inhalt in MenuScreenShell (kein Fixed-Overlay mehr)
  overlay: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  panel: {
    width: '100%', maxWidth: 640,
    background: 'var(--paper-warm)', border: '2.5px solid var(--ink)', borderRadius: 8,
    boxShadow: '6px 6px 0 var(--ink)', padding: 22, color: 'var(--ink)',
  },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  title: { flex: 1, fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: 0, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  stash: { padding: '6px 12px', background: '#eef7e6', border: '2px solid var(--ink)', borderRadius: 8, boxShadow: '2px 2px 0 var(--ink)', fontSize: 13, fontWeight: 700 },
  closeBtn: { width: 34, height: 34, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontWeight: 800, boxShadow: '2px 2px 0 var(--ink)' },
  desc: { fontSize: 12, color: '#6b6250', margin: '0 0 14px', fontWeight: 600 },
  shareNote: { marginBottom: 10, padding: '8px 10px', background: '#fff', border: '2px solid var(--leaf-dark)', borderRadius: 8, color: 'var(--leaf-dark)', fontSize: 12, fontWeight: 700, wordBreak: 'break-all' as const },
  sowBtn: { width: '100%', padding: 14, fontSize: 15, fontWeight: 800, color: '#fff', background: 'var(--leaf)', border: '2.5px solid var(--ink)', borderRadius: 8, cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)', marginBottom: 8 },
  parentRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 6 },
  parentCard: { position: 'relative' as const, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, cursor: 'pointer', minHeight: 52, boxShadow: '2px 2px 0 var(--ink)' },
  parentCardActive: { background: '#eef7e6', borderColor: 'var(--leaf-dark)' },
  parentName: { fontSize: 12, fontWeight: 800, color: 'var(--ink)' },
  parentBadge: { position: 'absolute' as const, top: -8, right: -8, width: 22, height: 22, borderRadius: 11, background: 'var(--leaf)', color: '#fff', border: '2px solid var(--ink)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  parentLine: { fontSize: 12, fontWeight: 700, color: '#6b6250', marginBottom: 10 },
  slotBtn: { width: '100%', padding: 11, marginBottom: 6, background: '#fff', border: '2px dashed var(--ink)', borderRadius: 8, color: 'var(--ink)', fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '2px 2px 0 var(--ink)' },
  hint: { fontSize: 11, color: '#8a8065', marginBottom: 10, fontWeight: 600 },
  helpToggle: { width: '100%', padding: '8px 12px', marginBottom: 10, background: '#fff', border: '1.5px dashed var(--ink)', borderRadius: 8, color: '#6b6250', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center' as const, minHeight: 44 },
  helpBox: { marginBottom: 10, padding: '10px 12px', background: '#f7f3e8', border: '1.5px solid var(--ink)', borderRadius: 8, color: '#4a4437', fontSize: 12, fontWeight: 600, whiteSpace: 'pre-line' as const, lineHeight: 1.55 },
  resultCard: { padding: 16, background: '#fff', border: '2.5px solid var(--ink)', borderRadius: 8, boxShadow: '3px 3px 0 var(--ink)', marginBottom: 14 },
  resultTitle: { fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1, color: '#6b6250', marginBottom: 6, fontWeight: 800 },
  childRow: { display: 'flex', gap: 12, alignItems: 'center' },
  childInfo: { flex: 1 },
  childName: { fontSize: 17, color: 'var(--ink)' },
  traitRow: { display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 4 },
  traitTag: { fontSize: 10, background: '#f0fdf4', color: '#6b6250', padding: '2px 8px', borderRadius: 99, border: '1.5px solid var(--ink)', fontWeight: 700 },
  parentsLine: { fontSize: 12, color: '#6b6250', margin: '10px 0 4px', fontWeight: 600 },
  maturationLine: { fontSize: 12, color: '#8a6d1f', marginBottom: 10, fontWeight: 700 },
  resultActions: { display: 'flex', gap: 8 },
  claimBtn: { flex: 1, padding: 10, background: '#eef7e6', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontSize: 13, fontWeight: 800, boxShadow: '2px 2px 0 var(--ink)' },
  shareBtn: { padding: '10px 14px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '2px 2px 0 var(--ink)' },
  pendingRow: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  potsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 },
  pot: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6, padding: 14, background: '#fff', borderWidth: '2.5px', borderStyle: 'dashed', borderColor: 'var(--ink)', borderRadius: 10, cursor: 'pointer', minHeight: 84, boxShadow: '2px 2px 0 var(--ink)' },
  potName: { fontSize: 11, fontWeight: 800, color: 'var(--ink)', textAlign: 'center' as const },
  potEmpty: { fontSize: 11, color: '#8a8065', fontWeight: 700, textAlign: 'center' as const },
  seedlingRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 12 },
  seedling: { padding: '8px 12px', borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--ink)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--ink)', boxShadow: '2px 2px 0 var(--ink)', minHeight: 44 },
  sectionTitle: { fontSize: 12, color: '#6b6250', textTransform: 'uppercase' as const, letterSpacing: 1, fontWeight: 800 },
  pendingItem: { fontSize: 12, color: '#6b6250', padding: '6px 10px', background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 8, fontWeight: 600 },
  pendingReady: { padding: '10px 12px', background: '#fff', border: '2px solid var(--leaf-dark)', borderRadius: 8 },
};

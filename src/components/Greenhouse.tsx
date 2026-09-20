import { useState } from 'react';
import type { MetaSave, PlantVariant } from '../types';
import { useI18n } from '../i18n';
import type { GachaRoll } from '../genome/gacha';
import { rollGachaCross, crossPair, deriveBreedSeed } from '../genome';
import { consumeSeedAndEnqueueCross, keepCross, isCrossReady, plantSeedlingIntoPot, buyRearingSlot } from '../meta';
import { wavesToUnlockFor, rearingSlotGate, REARING_SLOTS_MAX } from '../config/economy.source';
import { helpText } from '../i18n/help';

// Owner: UI (Greenhouse screen). LOC ≤ 400.
// GEWÄCHSHAUS — fachlich getrennt vom SeedShop (P2): Hier wird AUSSÄT + REIFUNG +
// ERGEBNIS-Übernahme gespielt. Kauf von Samen gehört in den SeedShop (eigene Datei,
// gleiche Meta-Owner). Keine Dopplung: consumeSeedAndEnqueueCross/keepCross
// bleiben die einzigen Writer in persistence/.

import { useMemoOwned, pairRollFor } from './greenhouse/greenhouseHelpers';
import { styles } from './greenhouse/greenhouseStyles';
import { ParentSelection } from './greenhouse/ParentSelection';
import { SeedlingTray } from './greenhouse/SeedlingTray';
import { PotRow } from './greenhouse/PotRow';
import { PendingQueue } from './greenhouse/PendingQueue';
import { SlotBuyButton } from './greenhouse/SlotBuyButton';
import { ResultCard } from './greenhouse/ResultCard';

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
      // P2': der Breed-Seed bleibt intern (Referenz-Ableitung + Zeitstempel) — im Entry und
      // im Share-Text steht nur die öffentliche plant_ref, nie der Klartext-Seed.
      const res = appendDiscovery({
        genome: roll.child.genome,
        parents: [roll.parentA.id, roll.parentB.id],
        seed: deriveBreedSeed(roll.parentA.id, roll.parentB.id, roll.crossIndex),
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
      seed: deriveBreedSeed(roll.parentA.id, roll.parentB.id, roll.crossIndex),
      generation: roll.crossIndex,
    });
    // P2': geteilt wird der ÖFFENTLICHE Identifier (plant_ref), nie der private Seed.
    const { plantRefOf } = await import('../discovery/plantRef');
    const shareSeed = deriveBreedSeed(roll.parentA.id, roll.parentB.id, roll.crossIndex);
    const text = seedShareText(plantRefOf(shareSeed, roll.parentA.id, roll.parentB.id, roll.crossIndex), roll.crossIndex, roll.child.genome);
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
        <ParentSelection
          owned={owned}
          parentA={parentA}
          parentB={parentB}
          meta={meta}
          onPickParent={pickParent}
          t={t}
        />
        <SeedlingTray
          seedlings={meta.seedlings}
          heldSeedling={heldSeedling}
          onToggleSeedling={setHeldSeedling}
          meta={meta}
          t={t}
        />
        <PotRow
          pots={meta.pots}
          heldSeedling={heldSeedling}
          onDropIntoPot={handleDropIntoPot}
          meta={meta}
          t={t}
        />
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
        {/* Already rendered via ParentSelection component */}

        {/* Der Knopf behält seinen NAMEN, wenn er aus ist (Barrierefreiheit: ein Bedienelement
            wird nicht umbenannt, nur weil es deaktiviert ist) — der Grund steht daneben. */}
        <button onClick={handleSow} disabled={!canSow} style={{ ...styles.sowBtn, opacity: canSow ? 1 : 0.4 }}>
          🌱 {t('shop.sow')}
        </button>
        {!canSow && !queueFull && owned.length >= 2 && (
          <div style={styles.hint}>{t('shop.sowPickParents')}</div>
        )}
        {!canSow && queueFull && (
          <div style={readyCount > 0 ? { ...styles.hint, color: 'var(--leaf-dark)', borderColor: 'var(--leaf-dark)' } : styles.hint}>
            {readyCount > 0
              ? t('shop.queueFullReady').replace('{r}', String(readyCount))
              : t('shop.sowEmpty').replace('{n}', String(meta.pendingCrosses.length)).replace('{m}', String(meta.rearingSlots))}
            </div>
        )}
        {!canSow && owned.length < 2 && <div style={styles.hint}>{t('shop.needTwo')}</div>}

        {/* REIFUNGSPLATZ KAUFEN: Preis UND Wellenmarke (steile Kurve bis Platz 12). */}
        <SlotBuyButton
          slotGate={slotGate}
          canBuySlot={canBuySlot}
          onBuySlot={() => {
            const m = buyRearingSlot();
            if (m) onMetaChange(m);
          }}
          t={t}
          metaBestWave={meta.bestWave}
          rearingSlotsMax={REARING_SLOTS_MAX}
        />

        {/* Gacha-Ergebnis */}
        <ResultCard
          lastRoll={lastRoll}
          t={t}
          isCrossReady={isCrossReady}
          wavesToUnlockFor={wavesToUnlockFor}
          handleKeep={handleKeep}
          handleShareSeed={handleShareSeed}
          meta={meta}
        />

        {/* Reifungs-Queue (B15.1/B15.3): das Kind wird aus dem PERSISTIERTEN Seed
            rekonstruiert — kein React-State über den Screen-Weiter hinweg. Reife Zeilen
            zeigen Kind + Beanspruchen-Knopf, unreife die verbleibenden Wellen. */}
        <PendingQueue
          pendingCrosses={meta.pendingCrosses}
          totalWavesSurvived={meta.totalWavesSurvived}
          rearingSlots={meta.rearingSlots}
          owned={owned}
          isCrossReady={isCrossReady}
          pairRollFor={pairRollFor}
          rollGachaCross={rollGachaCross}
          handleKeep={handleKeep}
          t={t}
          meta={meta}
        />
      </div>
    </div>
  );
}


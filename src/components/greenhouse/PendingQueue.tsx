import type { MetaSave, PendingCross, PlantVariant } from '../../types';
import type { GachaRoll } from '../../genome';
import { PlantVariantThumb } from '../PhenotypeCanvas';
import { styles } from './greenhouseStyles';
import { findVariant } from './greenhouseHelpers';
import type { TranslationKey } from '../../i18n';

interface Props {
  pendingCrosses: PendingCross[];
  totalWavesSurvived: number;
  rearingSlots: number;
  owned: PlantVariant[];
  isCrossReady: (meta: MetaSave, crossIndex: number) => boolean;
  pairRollFor: (c: PendingCross, meta: MetaSave) => GachaRoll | null;
  rollGachaCross: (owned: PlantVariant[], seed: number, crossIndex: number) => GachaRoll | null;
  handleKeep: (roll: GachaRoll) => void;
  t: (key: TranslationKey) => string;
  meta: MetaSave;
}

export function PendingQueue({
  pendingCrosses,
  totalWavesSurvived,
  rearingSlots,
  owned,
  isCrossReady,
  pairRollFor,
  rollGachaCross,
  handleKeep,
  t,
  meta,
}: Props) {
  if (pendingCrosses.length === 0) return null;

  const readyCount = pendingCrosses.filter(c =>
    isCrossReady(meta, c.crossIndex)
  ).length;

  return (
    <div style={styles.pendingRow}>
      <span style={styles.sectionTitle}>
        {readyCount > 0 && ' ✓'}
        {t('shop.pending')
          .replace('{n}', String(pendingCrosses.length))
          .replace('{m}', String(rearingSlots))}
      </span>
      {pendingCrosses.map(c => {
        const remaining = Math.max(
          0,
          c.neededWaves - (totalWavesSurvived - c.startedWave)
        );
        if (!isCrossReady(meta, c.crossIndex)) {
          return (
            <div key={c.crossIndex} style={styles.pendingItem}>
              {t('shop.maturing').replace('{n}', String(remaining))}
            </div>
          );
        }
        // B19: Reif ⇒ das PERSISTIERTE Kind anzeigen (Autorität), kein Neu-Wurf aus
        // dem inzwischen veränderten Bestand. Legacy (Altsave ohne child): aus dem
        // Seed rekonstruieren; null ⇒ parentsGone-Meldung wie früher.
        const roll = c.child
          ? {
              child: c.child,
              parentA: findVariant(c.parentAId ?? '', meta),
              parentB: findVariant(c.parentBId ?? '', meta),
              probability: 1,
              crossIndex: c.crossIndex,
            } as GachaRoll
          : (pairRollFor(c, meta) ?? rollGachaCross(owned, c.seed, c.crossIndex));

        return (
          <div key={c.crossIndex} style={styles.pendingReady}>
            <div style={styles.childRow}>
              <PlantVariantThumb variant={roll?.child} size={40} />
              <div style={styles.childInfo}>
                <strong style={styles.childName}>
                  {roll?.child?.name ?? t('shop.parentsGone')}
                </strong>
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
  );
}
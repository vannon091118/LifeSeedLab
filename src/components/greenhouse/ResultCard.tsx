import type { GachaRoll } from '../../genome';
import type { MetaSave } from '../../types';
import { PlantVariantThumb } from '../PhenotypeCanvas';
import { styles } from './greenhouseStyles';
import type { TranslationKey } from '../../i18n';

interface Props {
  lastRoll: GachaRoll | null;
  t: (key: TranslationKey) => string;
  isCrossReady: (meta: MetaSave, crossIndex: number) => boolean;
  wavesToUnlockFor: (crossIndex: number) => number;
  handleKeep: (roll: GachaRoll) => void;
  handleShareSeed: (roll: GachaRoll) => void;
  meta: MetaSave;
}

export function ResultCard({
  lastRoll,
  t,
  isCrossReady,
  wavesToUnlockFor,
  handleKeep,
  handleShareSeed,
  meta,
}: Props) {
  if (!lastRoll) return null;

  const traitTagLabel = (trait: string): string => {
    if (trait.includes(' ')) return trait; // Alt-Save-Label (z. B. „rapid fire“)
    return t(`trait.${trait}` as any);
  };

  return (
    <div style={styles.resultCard}>
      <div style={styles.resultTitle}>{t('gacha.result')}</div>
      <div style={styles.childRow}>
        <PlantVariantThumb variant={lastRoll.child} size={48} />
        <div style={styles.childInfo}>
          <strong style={styles.childName}>{lastRoll.child.name}</strong>
          <div style={styles.traitRow}>
            {lastRoll.child.traits.slice(0, 3).map(tr => (
              <span key={tr} style={styles.traitTag}>
                {traitTagLabel(tr)}
              </span>
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
  );
}
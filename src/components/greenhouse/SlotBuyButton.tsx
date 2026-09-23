import { styles } from './greenhouseStyles';
import { NektarChipIcon } from '../GameIcons';
import type { TranslationKey } from '../../i18n';

interface Props {
  slotGate: { nektar: number; wave: number } | null;
  canBuySlot: boolean;
  onBuySlot: () => void;
  // Dieselbe Signatur wie die Geschwister-Komponenten: der `t` aus `useI18n()` ist auf
  // `TranslationKey` verengt, ein `(key: string)` nimmt ihn nicht an.
  t: (key: TranslationKey) => string;
  metaBestWave: number;
  rearingSlotsMax: number;
}

export function SlotBuyButton({
  slotGate,
  canBuySlot,
  onBuySlot,
  t,
  metaBestWave,
  rearingSlotsMax,
}: Props) {
  return (
    <>
      {slotGate ? (
        <>
          <button
            onClick={onBuySlot}
            disabled={!canBuySlot}
            style={{ ...styles.slotBtn, opacity: canBuySlot ? 1 : 0.55 }}
            data-tut="buy-slot"
          >
            {t('greenhouse.buySlot')} — <NektarChipIcon/> {slotGate.nektar} · {t('greenhouse.buySlotWave').replace('{n}', String(slotGate.wave))}
          </button>
          {metaBestWave < slotGate.wave && (
            <div style={styles.hint}>
              {t('greenhouse.slotWaveMissing')
                .replace('{n}', String(slotGate.wave))
                .replace('{s}', String(metaBestWave))}
            </div>
          )}
        </>
      ) : (
        <div style={styles.hint}>
          {t('greenhouse.slotsFull').replace('{m}', String(rearingSlotsMax))}
        </div>
      )}
    </>
  );
}
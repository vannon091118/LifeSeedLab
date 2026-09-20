import type { MetaSave } from '../../types';
import { PlantVariantThumb } from '../PhenotypeCanvas';
import { styles } from './greenhouseStyles';
import { findVariant, variantName } from './greenhouseHelpers';
import type { TranslationKey } from '../../i18n';

interface Props {
  pots: (string | null)[];
  heldSeedling: string | null;
  onDropIntoPot: (potIndex: number) => void;
  meta: MetaSave;
  t: (key: TranslationKey) => string;
}

export function PotRow({ pots, heldSeedling, onDropIntoPot, meta, t }: Props) {
  return (
    <div style={styles.potsRow}>
      {pots.map((occupant, i) => {
        const isOccupied = occupant !== null;
        return (
          <button
            key={i}
            onClick={() => onDropIntoPot(i)}
            disabled={isOccupied || !heldSeedling}
            data-tut={`pot-${i}`}
            aria-label={isOccupied
              ? t('greenhouse.potOccupied')
              : t('greenhouse.potFree')}
            style={{
              ...styles.pot,
              opacity: isOccupied
                ? 1
                : heldSeedling
                ? meta.pots[i] === null
                  ? 1
                  : 0.4
                : 0.8,
              borderColor: heldSeedling && !isOccupied
                ? 'var(--leaf-dark)'
                : 'var(--ink)',
            }}
          >
            {isOccupied ? (
              <>
                <PlantVariantThumb
                  variant={findVariant(occupant, meta)}
                  size={34}
                />
                <span style={styles.potName}>
                  {variantName(occupant, meta)}
                </span>
              </>
            ) : (
              <span style={styles.potEmpty}>
                {heldSeedling ? t('greenhouse.potDropHere') : t('greenhouse.potFree')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
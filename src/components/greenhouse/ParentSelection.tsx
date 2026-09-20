import React from 'react';
import type { MetaSave, PlantVariant } from '../../types';
import { PlantVariantThumb } from '../PhenotypeCanvas';
import { styles } from './greenhouseStyles';
import { variantName } from './greenhouseHelpers';
import type { TranslationKey } from '../../i18n';

interface Props {
  owned: PlantVariant[];
  parentA: string | null;
  parentB: string | null;
  meta: MetaSave;
  onPickParent: (id: string) => void;
  t: (key: TranslationKey) => string;
}

export function ParentSelection({ owned, parentA, parentB, meta, onPickParent, t }: Props) {
  return (
    <>
      <div style={styles.parentRow}>
        <span style={styles.sectionTitle}>{t('greenhouse.parents')}</span>
        {owned.map(v => {
          const isA = parentA === v.id;
          const isB = parentB === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onPickParent(v.id)}
              aria-pressed={isA || isB}
              style={{ ...styles.parentCard, ...(isA || isB ? styles.parentCardActive : {}) }}
              title={v.name}
            >
              <PlantVariantThumb variant={v} size={40} />
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
    </>
  );
}
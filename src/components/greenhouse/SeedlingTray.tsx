import type { MetaSave } from '../../types';
import { styles } from './greenhouseStyles';
import { variantName } from './greenhouseHelpers';
import type { TranslationKey } from '../../i18n';

interface Props {
  seedlings: string[];
  heldSeedling: string | null;
  onToggleSeedling: (id: string) => void;
  meta: MetaSave;
  t: (key: TranslationKey) => string;
}

export function SeedlingTray({ seedlings, heldSeedling, onToggleSeedling, meta, t }: Props) {
  if (seedlings.length === 0) return null;

  return (
    <div style={styles.seedlingRow}>
      <span style={styles.sectionTitle}>
        {t('greenhouse.seedlings').replace('{n}', String(seedlings.length))}
      </span>
      {seedlings.map(id => (
        <button
          key={id}
          onClick={() => onToggleSeedling(id)}
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
  );
}
import type { PlantVariant, CrossResult } from '../types';

export type BreedLabels = {
  title: string;
  parentA: string;
  parentB: string;
  cross: string;
  offspring: string;
  keep: string;
  new: string;
  chance: string;
  collection: string;
  cost: string;
  needTwo: string;
};

type Props = {
  labels: BreedLabels;
  nektar: number;
  allVariants: PlantVariant[];
  variantCounts: Record<string, number>;
  results: CrossResult[] | null;
  parentA: PlantVariant | null;
  parentB: PlantVariant | null;
  setParentA: (v: PlantVariant) => void;
  setParentB: (v: PlantVariant) => void;
  onCross: () => void;
  canCross: boolean;
  onKeep: (child: PlantVariant) => void;
  onClose: () => void;
};

export function BreedingLab({
  labels, nektar, allVariants, variantCounts, results,
  parentA, parentB, setParentA, setParentB,
  onCross, canCross, onKeep, onClose,
}: Props) {
  const owned = allVariants.filter(v => (variantCounts[v.id] || 0) > 0);

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>{labels.title}</h2>
          <div style={styles.headerRight}>
            <span style={styles.nektar}>🍯 {nektar}</span>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>

        <div style={styles.parentRow}>
          <ParentPicker label={labels.parentA} variants={owned} selected={parentA} onSelect={setParentA} />
          <span style={styles.crossIcon}>×</span>
          <ParentPicker label={labels.parentB} variants={owned} selected={parentB} onSelect={setParentB} />
          <button
            onClick={onCross}
            disabled={!parentA || !parentB || !canCross}
            style={{ ...styles.breedBtn, opacity: !parentA || !parentB || !canCross ? 0.4 : 1 }}
          >
            🧪 {labels.cross}
          </button>
        </div>
        <div style={styles.costRow}>{labels.cost}{!canCross && <span style={styles.warn}> — zu wenig Nektar</span>}</div>

        {results && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>{labels.offspring}</h3>
            <div style={styles.resultsGrid}>
              {results.map((r, i) => (
                <div key={i} style={styles.resultCard}>
                  <div style={{ ...styles.preview, background: r.child.color }} />
                  <div style={styles.resultInfo}>
                    <strong>{r.child.name}</strong>
                    <span style={styles.typeLabel}>{r.child.type}</span>
                    <span style={styles.prob}>★ {Math.round(r.probability * 100)}% {labels.chance}</span>
                  </div>
                  <div style={styles.traitList}>
                    {r.child.traits.slice(0, 3).map(tr => (
                      <span key={tr} style={styles.traitTag}>{tr}</span>
                    ))}
                  </div>
                  <div style={styles.statPreview}>
                    <span>⚔️ {r.child.stats.damage}</span>
                    <span>❤️ {r.child.stats.hp}</span>
                    <span>📏 {r.child.stats.range}</span>
                  </div>
                  <button onClick={() => onKeep(r.child)} style={styles.selectBtn}>
                    {labels.keep}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>{labels.collection} ({owned.length})</h3>
          <div style={styles.collectionGrid}>
            {owned.map(v => (
              <div key={v.id} style={styles.collectionItem}>
                <div style={{ ...styles.previewSmall, background: v.color }} />
                <span style={styles.name}>{v.name}</span>
                <span style={styles.count}>×{variantCounts[v.id]}</span>
              </div>
            ))}
            {owned.length === 0 && <span style={styles.empty}>{labels.needTwo}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ParentPicker({ label, variants, selected, onSelect }: {
  label: string;
  variants: PlantVariant[];
  selected: PlantVariant | null;
  onSelect: (v: PlantVariant) => void;
}) {
  return (
    <div style={styles.pickerWrap}>
      <select
        value={selected?.id || ''}
        onChange={e => {
          const v = variants.find(x => x.id === e.target.value);
          if (v) onSelect(v);
        }}
        style={styles.select}
      >
        <option value="">{label}</option>
        {variants.map(v => (
          <option key={v.id} value={v.id}>{v.name} (×{variantCountOf(variants, v.id)})</option>
        ))}
      </select>
    </div>
  );
}

function variantCountOf(variants: PlantVariant[], id: string): number {
  return variants.filter(v => v.id === id).length;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(4px)',
  },
  panel: {
    background: '#111827',
    borderRadius: 16,
    border: '1px solid #1f2937',
    width: '90vw',
    maxWidth: 900,
    maxHeight: '85vh',
    overflow: 'auto',
    padding: 24,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  nektar: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 600,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#a78bfa',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: 20,
    cursor: 'pointer',
  },
  parentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  pickerWrap: {
    flex: 1,
    minWidth: 180,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: 8,
    color: '#e5e7eb',
    fontSize: 14,
  },
  crossIcon: {
    fontSize: 20,
    color: '#a78bfa',
  },
  breedBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  costRow: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 20,
  },
  warn: {
    color: '#f87171',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
    gap: 12,
  },
  resultCard: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  preview: {
    width: '100%',
    height: 44,
    borderRadius: 8,
  },
  previewSmall: {
    width: 16,
    height: 16,
    borderRadius: 4,
    flexShrink: 0,
  },
  resultInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    color: '#e5e7eb',
    fontSize: 14,
  },
  typeLabel: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  prob: {
    fontSize: 12,
    color: '#fbbf24',
  },
  traitList: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  traitTag: {
    fontSize: 11,
    background: '#1e293b',
    color: '#94a3b8',
    padding: '2px 8px',
    borderRadius: 99,
  },
  statPreview: {
    display: 'flex',
    gap: 12,
    fontSize: 12,
    color: '#6b7280',
  },
  selectBtn: {
    marginTop: 4,
    padding: '8px 0',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#a78bfa',
    fontSize: 13,
    cursor: 'pointer',
  },
  collectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 8,
  },
  collectionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    background: '#0f172a',
    borderRadius: 6,
    fontSize: 12,
    color: '#9ca3af',
  },
  name: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  count: {
    color: '#6b7280',
    fontSize: 11,
  },
  empty: {
    color: '#475569',
    fontSize: 13,
  },
};

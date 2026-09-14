// Owner: UI (Codex — public discovery chain). LOC ≤ 400.
// Read-only chain view. No login needed. Local-first, Supabase-mirror
// via UNIQUE(genome_hash). First discovery wins — organic prestige.

import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { loadCodex, verifyLocalChain, getPlayerId, seedShareText } from '../discovery/codex';
import type { DiscoveryEntry } from '../discovery/chain';

type Props = { onClose: () => void };

function formatDate(ts: number): string {
  try {
    const d = new Date(ts * 1000);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(ts);
  }
}

export function Codex({ onClose }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);
  const chain = useMemo(() => loadCodex(), []);
  const verification = useMemo(() => verifyLocalChain(), [chain]);
  const playerId = useMemo(() => getPlayerId(), []);
  // newest first for display, but verification expects tip order — keep source order under the hood
  const display = useMemo(() => [...chain].reverse(), [chain]);

  const handleCopy = async (entry: DiscoveryEntry) => {
    const text = `lifeseed:${entry.seed}:${entry.generation}:${entry.genome_hash}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(entry.entry_hash);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // fallback — select hack
      setCopied(entry.entry_hash);
    }
  };

  const handleCopySeed = async (seed: number, generation: number, genome_hash: string) => {
    const text = seedShareText(seed, generation, { length: 0 } as unknown as never);
    // seedShareText builds from genome; if no genome, fallback to parts
    const payload = genome_hash ? `lifeseed:${seed}:${generation}:${genome_hash}` : text;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(payload);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(payload);
    }
  };
  void handleCopySeed;

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{t('codex.title')}</h2>
            <p style={styles.subtitle}>{t('codex.subtitle')}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.metaRow}>
          <span style={styles.metaPill}>🧬 {chain.length} {chain.length === 1 ? 'Entdeckung' : 'Entdeckungen'}</span>
          <span style={{ ...styles.metaPill, background: verification.valid ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', borderColor: verification.valid ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)', color: verification.valid ? '#4ade80' : '#f87171' }}>
            {verification.valid ? `✓ ${t('codex.valid')}` : `✗ ${t('codex.invalid')}`}
          </span>
          <span style={styles.metaPillSmall} title={playerId}>👤 {playerId}</span>
        </div>

        {display.length === 0 ? (
          <div style={styles.empty}>{t('codex.empty')}</div>
        ) : (
          <div style={styles.list}>
            {display.map((e) => (
              <div key={e.entry_hash} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.genomeHash} title={e.genome_hash}>{e.genome_hash}</span>
                  <span style={styles.genBadge}>Gen {e.generation}</span>
                </div>
                <div style={styles.cardMeta}>
                  <span style={styles.metaLine}>{t('codex.firstBy')}: <strong style={styles.player}>{e.player_id}</strong> · {formatDate(e.timestamp)}</span>
                  <span style={styles.metaLine}>Eltern: {e.parents[0]} × {e.parents[1]} · Seed {e.seed}</span>
                  <span style={styles.metaLineSmall} title={e.entry_hash}>⛓ {e.entry_hash.slice(0, 8)}… ← {e.prev_hash ? e.prev_hash.slice(0, 6) : 'GENESIS'}</span>
                </div>
                <div style={styles.cardActions}>
                  <button onClick={() => handleCopy(e)} style={styles.actionBtn}>
                    {copied === e.entry_hash ? t('codex.copied') : `⧉ ${t('codex.share')}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={styles.footerNote}>
          Seeds sind Zahlen — jede geteilte Zeile <code style={styles.code}>lifeseed:seed:gen:hash</code> lädt exakt dieselbe Pflanze.
          Verifikation = deterministischer RNG, kein externer Konsens.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(8,10,18,0.88)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  panel: { width: '92vw', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto', background: 'rgba(15,23,42,0.98)', border: '1px solid #1e293b', borderRadius: 18, padding: 20 },
  header: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: 800, color: '#e5e7eb', margin: 0 },
  subtitle: { fontSize: 12, color: '#94a3b8', margin: '4px 0 0' },
  closeBtn: { marginLeft: 'auto', width: 32, height: 32, background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', flexShrink: 0 },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  metaPill: { padding: '6px 10px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.28)', borderRadius: 99, color: '#c4b5fd', fontSize: 12, fontWeight: 600 },
  metaPillSmall: { padding: '6px 10px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 99, color: '#94a3b8', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { padding: 18, textAlign: 'center', color: '#64748b', fontSize: 13, border: '1px dashed #334155', borderRadius: 12, background: '#0f172a' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { padding: 14, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 },
  cardTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  genomeHash: { fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 700, color: '#a78bfa', letterSpacing: 0.3 },
  genBadge: { marginLeft: 'auto', padding: '3px 8px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 99, color: '#fbbf24', fontSize: 11, fontWeight: 700 },
  cardMeta: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 },
  metaLine: { fontSize: 12, color: '#94a3b8' },
  metaLineSmall: { fontSize: 11, color: '#64748b', fontFamily: 'ui-monospace, monospace' },
  player: { color: '#e5e7eb', fontWeight: 700 },
  cardActions: { display: 'flex', gap: 8 },
  actionBtn: { padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#c4b5fd', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  footerNote: { marginTop: 14, padding: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 10, color: '#6b7280', fontSize: 11, lineHeight: 1.5 },
  code: { background: '#1e293b', padding: '2px 6px', borderRadius: 6, color: '#94a3b8', fontSize: 11 },
};

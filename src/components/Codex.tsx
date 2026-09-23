// Owner: UI (Codex — public discovery chain). LOC ≤ 400.
// Read-only chain view. No login needed. Local-first, Supabase-mirror
// via UNIQUE(genome_hash). First discovery wins — organic prestige.

import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { loadCodex, verifyLocalChain, getPlayerId } from '../discovery/codex';
import { CodexGlyph } from './GameIcons';
import type { DiscoveryEntry } from '../discovery/chain';

type Props = { onClose: () => void };

/**
 * Anzeige des EREIGNIS-Zeitstempels, nicht einer Uhrzeit: der Eintrag trägt einen logischen
 * Zeitstempel (deterministisch aus Seed+Generation — siehe `discovery/codex.ts`), kein
 * Kalenderdatum. „1970-01-01“ zu zeigen wäre eine zweite, falsche Wahrheit über denselben Wert.
 * P2': der öffentliche Teil des Entries ist die plant_ref — Gründer zeigen weiterhin
 * ihren historischen Seed (dokumentierte Herkunft), neue Einträge die Referenz.
 */
function formatOrigin(e: DiscoveryEntry): string {
  return e.plant_ref ?? `Seed ${e.seed ?? '?'}`;
}

export function Codex({ onClose }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);
  const chain = useMemo(() => loadCodex(), []);
  const verification = useMemo(() => verifyLocalChain(chain), [chain]);
  const playerId = useMemo(() => getPlayerId(), []);
  // newest first for display, but verification expects tip order — keep source order under the hood
  const display = useMemo(() => [...chain].reverse(), [chain]);

  const handleCopy = async (entry: DiscoveryEntry) => {
    // P2': Share-Zeile mit dem ÖFFENTLICHEN Identifier (plant_ref). Gründer-Einträge
    // (vor P2') behalten ihren historischen Seed — ihre Epoche-0-Wurzel ist öffentlich.
    const identifier = entry.plant_ref ?? `seed-${entry.seed ?? '?'}`;
    const text = `lifeseed:${identifier}:${entry.generation}:${entry.genome_hash}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(entry.entry_hash);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // fallback — select hack
      setCopied(entry.entry_hash);
    }
  };

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
          {/* P-30: Ink-Glyphen statt Emoji-Pills (B0) — CodexGlyph = das Laborbuch selbst. */}
          <span style={styles.metaPill}><CodexGlyph/> {chain.length} {chain.length === 1 ? t('codex.countOne') : t('codex.countMany')}</span>
          <span style={{ ...styles.metaPill, background: verification.valid ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', borderColor: verification.valid ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)', color: verification.valid ? '#4ade80' : '#f87171' }}>
            {verification.valid ? `✓ ${t('codex.valid')}` : `✗ ${t('codex.invalid')}`}
          </span>
          <span style={styles.metaPillSmall} title={playerId}>{playerId}</span>
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
                  <span style={styles.metaLine}>{t('codex.firstBy')}: <strong style={styles.player}>{e.player_id}</strong> · {formatOrigin(e)}</span>
                  <span style={styles.metaLine}>{t('codex.parents')}: {e.parents[0]} × {e.parents[1]} · {e.plant_ref ?? `Seed ${e.seed ?? '?'}`}</span>
                  <span style={styles.metaLineSmall} title={e.entry_hash}>{e.entry_hash.slice(0, 8)}… ← {e.prev_hash ? e.prev_hash.slice(0, 6) : 'GENESIS'}</span>
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
          <strong>{t('codex.noteTitle')}</strong> {t('codex.noteSeed')} <code style={styles.code}>lifeseed:beleg:gen:hash</code> {t('codex.noteSeedLoad')} {t('codex.noteVerify')}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // Screen-Betrieb: Vollbild-Inhalt in MenuScreenShell — Papier-Identität (B0/B9), kein Dark-Slate-Prototyp
  overlay: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  panel: { width: '100%', maxWidth: 640, background: 'var(--paper-warm)', border: '2.5px solid var(--ink)', borderRadius: 8, boxShadow: '6px 6px 0 var(--ink)', padding: 20, color: 'var(--ink)' },
  header: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: 800, color: 'var(--ink)', margin: 0, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  subtitle: { fontSize: 12, color: '#6b6250', margin: '4px 0 0', fontWeight: 600 },
  closeBtn: { marginLeft: 'auto', width: 34, height: 34, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontWeight: 800, boxShadow: '2px 2px 0 var(--ink)', flexShrink: 0 },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 14 },
  metaPill: { padding: '6px 10px', background: '#fff', borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--ink)', borderRadius: 99, color: 'var(--ink)', fontSize: 12, fontWeight: 700, boxShadow: '2px 2px 0 var(--ink)' },
  metaPillSmall: { padding: '6px 10px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 99, color: '#6b6250', fontSize: 11, fontWeight: 700, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { padding: 18, textAlign: 'center', color: '#6b6250', fontSize: 13, border: '2px dashed #b7ab8d', borderRadius: 8, background: '#fff', fontWeight: 600 },
  list: { display: 'flex', flexDirection: 'column' as const, gap: 10, contentVisibility: 'auto' } as React.CSSProperties,
  card: { padding: 14, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, boxShadow: '2px 2px 0 var(--ink)' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  genomeHash: { fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 700, color: 'var(--leaf-dark)', letterSpacing: 0.3 },
  genBadge: { marginLeft: 'auto', padding: '3px 8px', background: '#fdeec9', border: '2px solid var(--ink)', borderRadius: 99, color: '#8a6d1f', fontSize: 11, fontWeight: 800 },
  cardMeta: { display: 'flex', flexDirection: 'column' as const, gap: 2, marginBottom: 10 },
  metaLine: { fontSize: 12, color: '#6b6250', fontWeight: 600 },
  metaLineSmall: { fontSize: 11, color: '#8a8065', fontFamily: 'ui-monospace, monospace' },
  player: { color: 'var(--ink)', fontWeight: 800 },
  cardActions: { display: 'flex', gap: 8 },
  actionBtn: { padding: '8px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '2px 2px 0 var(--ink)' },
  footerNote: { marginTop: 14, padding: 12, background: '#eef7e6', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--leaf-dark)', fontSize: 11, lineHeight: 1.5, fontWeight: 600 },
  code: { background: '#f0ead6', padding: '2px 6px', borderRadius: 6, color: 'var(--ink)', fontSize: 11 },
};
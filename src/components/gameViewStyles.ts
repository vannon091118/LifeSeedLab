// Owner: UI (GameView-Styles). LOC ≤ 100.
// Reines Präsentations-Styling des Run-Screens (Paper/Ink-Sprache, B0/B7.4).
// Kein State, keine Logik — nur die CSS-Objekte, die GameView konsumiert.
import type { CSSProperties } from 'react';

export const gameViewStyles: Record<string, CSSProperties> = {
  shell: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', position: 'relative' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px', background: '#fbf6e9', borderBottom: '2px solid var(--ink)', boxShadow: '0 2px 0 rgba(43,43,38,0.06)', zIndex: 2 },
  topLeft: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  logo: { fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: 0.3 },
  sub: { fontSize: 11, color: '#6b6250', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' },
  // P-2 (Mobile 390×844): die rechte Knopf-Gruppe ist ohne flexWrap eine Zeile (gemessen:
  // Reihe 407 px, „Exit Run“ 362–419 ⇒ 29 px außerhalb) — jetzt Umbruch rechtsbündig statt
  // Überlauf. Desktop bleibt unverändert (die Zeile passt dort, wrap greift nie).
  topRight: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  btn: { padding: '10px 14px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)', lineHeight: 1, minHeight: 44, minWidth: 44 },
  btnPrimary: { background: 'var(--leaf)', color: '#fff', borderColor: 'var(--ink)' },
  btnBeetle: { background: '#d9a441', color: '#2b2b26', borderColor: 'var(--ink)' },
  // B23.2: während die Welle läuft ist der Knopf eine Anzeige, kein Knopf mehr.
  btnDisabled: { background: '#e6dfc9', color: '#6b6250', cursor: 'not-allowed', boxShadow: 'none' },
  prepHint: { flexBasis: '100%', fontSize: 11, fontWeight: 700, color: '#6b6250', textAlign: 'center', letterSpacing: 0.3 },
  // Dringlichkeit sichtbar: die letzten 5 Sekunden der Vorbereitung atmen bernstein —
  // derselbe Amber, den die Reise und die Währung sprechen (eine Farb-Wahrheit für „wichtig").
  prepHintUrgent: { color: '#8a5f16', background: '#f7e3b2', borderRadius: 8, padding: '3px 10px', margin: '0 auto', animation: 'hintPulse 1.1s ease-in-out infinite' },
  stage: { flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 10px 8px', background: 'var(--paper)' },
  canvasFrame: { position: 'relative', width: '100%', maxWidth: 860, flex: 1, minHeight: 0, background: '#fff', border: '2px solid var(--ink)', borderRadius: 14, boxShadow: '4px 4px 0 var(--ink), 0 14px 32px rgba(43,43,38,0.16)', overflow: 'hidden', display: 'flex' },
  canvas: { width: '100%', height: '100%', display: 'block', touchAction: 'none', flex: 1, minHeight: 0 },
  hud: { position: 'absolute', top: 10, left: 10, display: 'flex', gap: 8, flexWrap: 'wrap', zIndex: 1 },
  // P3QA-08: Ressourcen (Nektar/Leben/Welle) dünner, Werkzeuge (Karten unten) kräftig —
  // der Blick soll zuerst auf die Ressourcen fallen, ohne mit klickbaren Karten zu konkurrieren.
  hudChip: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 10, boxShadow: '1px 1px 0 var(--ink)', fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 },
  hudChipCombo: { background: 'var(--paper-warm)', borderColor: 'var(--ink)', color: 'var(--ink)' },
  // B5.1: der Währungs-Zähler ist der Zielpunkt der Belohnungsreise (B7.4-Slot „resource
  // counter" — der Energie-Zähler ist mit dem Energiesystem gestorben, Nektar ist die Währung
  // des Laufs). Leicht bernstein hinterlegt, damit er als Ziel lesbar bleibt.
  hudChipNektar: { background: '#fdf4e0' },
  // D5: Quality-Chip — der Maze-Fortschritt ist eine zweite Combo-artige Ausnahme (nur sichtbar, wenn eine berechnete Route existiert)
  hudChipQuality: { background: '#eef7e6', borderColor: 'var(--leaf-dark)', color: 'var(--leaf-dark)' },
  // Der Vergleichswert („min 22") ist Nebensatz, nicht Hauptwert — kleiner und leiser.
  hudChipSub: { opacity: 0.65, fontWeight: 700 },
  // P-24: der ✕ wohnt seit der P-24/25-Regie in der Tray (Tray-Eck-Tag) — der Platz über der
  // Spawn-Ecke (oben rechts) gehört dem Brett. Der Style bleibt für den Tray-Knopf (Ecke).
  // P3QA-05: Der Erst-Run-Hinweis ist die wichtigste Anleitung — er liegt JETZT (P-25) auf dem
  // FELD (frame-relativ, oben mittig) statt auf dem Screen: kein `bottom`-Wert mehr, der die
  // Tray-Höhe aus der Ferne erraten muss (N4-Klasse gestorben). Er verblasst nach der ersten
  // Platzierung zur Zettel-Version.
  firstRunHint: { position: 'absolute', left: '50%', top: 44, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fffbe8', border: '2px solid var(--ink)', borderRadius: 12, boxShadow: '3px 3px 0 var(--ink)', fontSize: 13, color: '#2b2b26', fontWeight: 700, maxWidth: 'min(86%, 560px)', zIndex: 3, textAlign: 'center' as const, pointerEvents: 'none' as const, transition: 'opacity 1.2s ease, transform 1.2s ease', opacity: 1 },
  // R1: der abgeblendete Zustand (Auto-Fade, Sim-Tick-Frist) — unsichtbar UND unverdeckend.
  firstRunHintFaded: { opacity: 0, transform: 'translateX(-50%) translateY(6px)' } as CSSProperties,
  // P-25: Anderthalb-Dock unter dem Frame — die Tray ist kein absoluter Overlay mehr, sondern
  // Teil des stage-Flusses. Sie kann das Brett nicht mehr verdecken (der Befund: Ausgang 0/11
  // lag unter ihr), und das Brett gewinnt die volle Höhe zurück.
  trayDock: { width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
  paperNote: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 10, boxShadow: '2px 2px 0 var(--ink)', fontSize: 11, color: '#6b6250', fontWeight: 600, maxWidth: 860, width: '100%', justifyContent: 'center', textAlign: 'center' as const, cursor: 'pointer' as const },
  paperNotePin: { width: 8, height: 8, borderRadius: '50%', background: 'var(--nektar)', border: '1.5px solid var(--ink)', display: 'inline-block', flexShrink: 0 },
};

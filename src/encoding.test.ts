import { describe, it, expect } from 'vitest';

// Gate-Test gegen das Encoding-Fossil (quality-spec A16).
//
// Befund: `src/components/Codex.tsx` war doppelkodiert — UTF-8, einmal als Windows-1252
// gelesen und wieder als UTF-8 gespeichert. Danach standen Umlaute und Emoji WÖRTLICH als
// Byte-Salat im Quelltext, nicht nur zur Laufzeit. Die bisherige Verifikation prüfte
// Zeilenenden (CRLF), aber nicht die Kodierung — deshalb überlebte der Defekt mehrere
// Sprints unbemerkt. Dieses Gate fängt ihn an der Tür ab.
//
// Umsetzung ohne Node-Typen (tsconfig führt bewusst nur `src` und keine fs/path-Typen):
// `import.meta.glob` mit `?raw` ist die build-native Variante, alle Dateien als Text zu
// lesen. Die Vite-Client-Typen kommen per Datei-Referenz statt per tsconfig, damit die
// Projektkonfiguration unangetastet bleibt. Würde dieses Gate seine Muster als Literale
// enthalten, würde es sich selbst anzeigen — deshalb stehen sie nur als Code-Points im RegExp.
/// <reference types="vite/client" />

/** Alle Quelldateien unter `src/` als Rohtext — Schlüssel ist der Pfad relativ zu dieser Datei. */
const SOURCES = import.meta.glob('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** U+FFFD heißt: die Bytes sind bereits beim Lesen kaputt (nicht dekodierbar). */
const REPLACEMENT = /\uFFFD/;

/**
 * Die kanonischen Doppelkodierungs-Sequenzen: erstes Byte des UTF-8-Paars, als CP1252
 * gelesen, wieder UTF-8-kodiert. Deckt ä ö ü ß „ — … und die Emoji-Blöcke ab.
 */
const MOJIBAKE = new RegExp(
  [
    '\\u00C3[\\u0080-\\u00BF\\u0152-\\u0178]', // Umlaute, ß
    '\\u00E2\\u20AC[\\u0080-\\u00BF]',        // „ ” — … †
    '\\u00F0\\u0178[\\u0080-\\u00BF\\u2020-\\u2027]', // Emoji (4-Byte-Astronomie)
    '\\u00C2[\\u0080-\\u00BF]',               // geschütztes Leerzeichen, °
  ].join('|'),
);

const FILES = Object.entries(SOURCES).map(([path, text]) => ({ path: path.replace(/^\.\//, 'src/'), text }));

describe('Quelltext-Kodierung', () => {
  it('findet überhaupt Dateien (das Gate darf nicht leer laufen)', () => {
    expect(FILES.length).toBeGreaterThan(50);
    expect(FILES.some(f => f.path === 'src/components/Codex.tsx')).toBe(true);
  });

  it('enthält keine Ersatzzeichen (jede Datei ist gültiges UTF-8)', () => {
    const broken = FILES.filter(f => REPLACEMENT.test(f.text)).map(f => f.path);
    expect(broken, 'U+FFFD heißt: die Datei ist keine gültige UTF-8-Quelle').toEqual([]);
  });

  it('enthält keinen Byte-Salat (Umlaute/Emoji sind Zeichen, keine Doppelkodierung)', () => {
    const broken = FILES.filter(f => MOJIBAKE.test(f.text)).map(f => f.path);
    expect(broken, 'doppelkodiert: über eine Shell ohne UTF-8-Encoding geschrieben').toEqual([]);
  });
});

# Modul: dev

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/dev/`

## Umfang

5 Dateien · importiert `components`, `render` · wird importiert von `components`, `render`

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`DevOverlay.tsx`](./DevOverlay.tsx) | 87 | 1 | CALL 14, EXPORTS 1, IMPORTS 4, PASS 11, READ 56, RETURN 3, STRING_REFERENCE 43 |
| [`Inspector.tsx`](./Inspector.tsx) | 66 | 1 | CALL 6, EXPORTS 1, IMPORTS 1, PASS 6, READ 43, RETURN 3, STRING_REFERENCE 48 |
| [`gate.test.ts`](./gate.test.ts) | 30 | 0 | CALL 30, IMPORTS 2, PASS 30, READ 8, STRING_REFERENCE 23 |
| [`gate.ts`](./gate.ts) | 49 | 4 | CALL 9, EXPORTS 4, PASS 8, READ 12, RETURN 13, STRING_REFERENCE 12 |
| [`testHooks.ts`](./testHooks.ts) | 63 | 1 | CALL 6, EXPORTS 3, IMPORTS 2, PASS 2, READ 24, RETURN 4, STRING_REFERENCE 6 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `DevOverlay` | function | `src/dev/DevOverlay.tsx` | 20 |
| `Inspector` | function | `src/dev/Inspector.tsx` | 13 |
| `bindSimRoot` | function | `src/dev/testHooks.ts` | 31 |
| `installTestHooks` | function | `src/dev/testHooks.ts` | 38 |
| `isDevActive` | function | `src/dev/gate.ts` | 15 |
| `isDevMode` | function | `src/dev/gate.ts` | 5 |
| `isOnboardingAutoStart` | function | `src/dev/gate.ts` | 42 |
| `onboardingAutoStart` | function | `src/dev/gate.ts` | 35 |
| `unbindSimRoot` | function | `src/dev/testHooks.ts` | 60 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/dev/DevOverlay.tsx` | 21 | `0` | 1 | [`src/dev/DevOverlay.tsx`](DevOverlay.tsx) | useState |
| `src/dev/DevOverlay.tsx` | 22 | `v => v + 1` | 1 | [`src/dev/DevOverlay.tsx`](DevOverlay.tsx) | force |
| `src/dev/DevOverlay.tsx` | 22 | `() => { force(v => v + 1); }` | 1 | [`src/dev/DevOverlay.tsx`](DevOverlay.tsx) | useEffect |
| `src/dev/DevOverlay.tsx` | 25 | `() => {
    // EINE Projektion: der Dev-Screen benutzt denselben Snapshot-Hash w` | 1 | [`src/dev/DevOverlay.tsx`](DevOverlay.tsx) | useMemo |
| `src/dev/DevOverlay.tsx` | 29 | `snap` | 1 | [`src/dev/DevOverlay.tsx`](DevOverlay.tsx) | snapshotHash |
| `src/dev/DevOverlay.tsx` | 32 | `[revision, snap.seed]` | 2 | [`src/dev/DevOverlay.tsx`](DevOverlay.tsx) | useMemo |
| `src/dev/gate.test.ts` | 7 | `'DevGate — Onboarding-Sichtbarkeit'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | describe |
| `src/dev/gate.test.ts` | 8 | `'startet in der Release-Fläche automatisch'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | it |
| `src/dev/gate.test.ts` | 9 | `onboardingAutoStart('', '')` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | expect |
| `src/dev/gate.test.ts` | 9 | `''` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | onboardingAutoStart |
| `src/dev/gate.test.ts` | 12 | `'überspringt das Onboarding im DevGate (Werkzeug statt Vorführung)'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | it |
| `src/dev/gate.test.ts` | 13 | `isDevMode('?dev=1', '')` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | expect |
| `src/dev/gate.test.ts` | 13 | `'?dev=1'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | isDevMode |
| `src/dev/gate.test.ts` | 14 | `onboardingAutoStart('?dev=1', '')` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | expect |
| `src/dev/gate.test.ts` | 14 | `'?dev=1'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | onboardingAutoStart |
| `src/dev/gate.test.ts` | 15 | `onboardingAutoStart('', '#dev')` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | expect |
| `src/dev/gate.test.ts` | 15 | `''` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | onboardingAutoStart |
| `src/dev/gate.test.ts` | 18 | `'lässt sich hinter dem Gate ausdrücklich erzwingen (E2E-Beweis)'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | it |
| `src/dev/gate.test.ts` | 19 | `onboardingAutoStart('?dev=1&tutorial=1', '')` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | expect |
| `src/dev/gate.test.ts` | 19 | `'?dev=1&tutorial=1'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | onboardingAutoStart |
| `src/dev/gate.test.ts` | 22 | `'lässt sich ausdrücklich abschalten'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | it |
| `src/dev/gate.test.ts` | 23 | `onboardingAutoStart('?tutorial=0', '')` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | expect |
| `src/dev/gate.test.ts` | 23 | `'?tutorial=0'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | onboardingAutoStart |
| `src/dev/gate.test.ts` | 26 | `'behandelt unbekannte Werte als „nicht gesetzt"'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | it |
| `src/dev/gate.test.ts` | 27 | `onboardingAutoStart('?tutorial=ja', '')` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | expect |
| `src/dev/gate.test.ts` | 27 | `'?tutorial=ja'` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | onboardingAutoStart |
| `src/dev/gate.test.ts` | 28 | `onboardingAutoStart('?dev=1&tutorial=', '')` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | expect |
| `src/dev/gate.test.ts` | 28 | `'?dev=1&tutorial='` | 1 | [`src/dev/gate.test.ts`](gate.test.ts) | onboardingAutoStart |
| `src/dev/gate.ts` | 18 | `window.location.search` | 1 | [`src/dev/gate.ts`](gate.ts) | isDevMode |
| `src/dev/gate.ts` | 39 | `search` | 1 | [`src/dev/gate.ts`](gate.ts) | isDevMode |
| `src/dev/gate.ts` | 45 | `window.location.search` | 1 | [`src/dev/gate.ts`](gate.ts) | onboardingAutoStart |

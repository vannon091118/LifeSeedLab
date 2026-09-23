# Modul: src

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/`

## Umfang

12 Dateien · importiert `components`, `config`, `discovery` +8 · wird importiert von `components`, `config`, `discovery` +8

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`App.tsx`](./App.tsx) | 241 | 0 | CALL 64, EXPORTS 1, IMPORTS 22, PASS 61, READ 35, RETURN 8, STRING_REFERENCE 60 |
| [`config.ts`](./config.ts) | 26 | 18 | EXPORTS 4 |
| [`encoding.test.ts`](./encoding.test.ts) | 54 | 0 | CALL 24, IMPORTS 1, PASS 24, READ 22, STRING_REFERENCE 17 |
| [`gacha.test.ts`](./gacha.test.ts) | 196 | 0 | CALL 140, IMPORTS 5, PASS 131, READ 124, STRING_REFERENCE 54 |
| [`genome.ts`](./genome.ts) | 15 | 10 | STRING_REFERENCE 5 |
| [`i18n.tsx`](./i18n.tsx) | 51 | 24 | CALL 11, EXPORTS 3, IMPORTS 3, PASS 14, READ 14, RETURN 6, STRING_REFERENCE 10 |
| [`main.test.ts`](./main.test.ts) | 14 | 0 | CALL 9, IMPORTS 2, PASS 9, READ 2, STRING_REFERENCE 8 |
| [`main.tsx`](./main.tsx) | 75 | 0 | CALL 30, EXPORTS 1, IMPORTS 5, PASS 29, READ 46, RETURN 7, STRING_REFERENCE 81 |
| [`meta.ts`](./meta.ts) | 8 | 8 | STRING_REFERENCE 5 |
| [`types.ts`](./types.ts) | 224 | 56 | EXPORTS 13, STRING_REFERENCE 10 |
| [`version.test.ts`](./version.test.ts) | 59 | 0 | CALL 33, IMPORTS 6, PASS 27, READ 17, STRING_REFERENCE 16 |
| [`version.ts`](./version.ts) | 14 | 5 | EXPORTS 2, STRING_REFERENCE 1 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `APP_VERSION` | const | `src/version.ts` | 11 |
| `APP_VERSION_LABEL` | const | `src/version.ts` | 14 |
| `App` | function | `src/App.tsx` | 232 |
| `BallisticProfile` | interface | `src/types.ts` | 24 |
| `BeetleAncestor` | type | `src/types.ts` | 164 |
| `BeetleSpecimen` | type | `src/types.ts` | 204 |
| `BredStatsEntry` | type | `src/types.ts` | 41 |
| `CrossResult` | type | `src/types.ts` | 195 |
| `EPOCH_ID` | const | `src/config.ts` | 23 |
| `EPOCH_ROOT` | const | `src/config.ts` | 20 |
| `GAME_SEED` | const | `src/config.ts` | 13 |
| `GameMode` | type | `src/types.ts` | 191 |
| `Gene` | type | `src/types.ts` | 5 |
| `Genome` | type | `src/types.ts` | 11 |
| `I18nProvider` | function | `src/i18n.tsx` | 17 |
| `MetaSave` | type | `src/types.ts` | 90 |
| `PendingBrood` | type | `src/types.ts` | 174 |
| `PendingCross` | type | `src/types.ts` | 146 |
| `PlantType` | type | `src/types.ts` | 13 |
| `PlantVariant` | type | `src/types.ts` | 51 |
| `RUN_SEED_VERSION` | const | `src/config.ts` | 26 |
| `detectLangFromMeta` | function | `src/i18n.tsx` | 47 |
| `escapeHtml` | function | `src/main.tsx` | 7 |
| `useI18n` | function | `src/i18n.tsx` | 41 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/App.tsx` | 36 | `null` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 37 | `'start'` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 38 | `null` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 39 | `false` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 43 | `null` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 45 | `() => {
    setMeta(loadMeta());
    void ensureWorld().then(w => { if (w) setWo` | 1 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 46 | `loadMeta()` | 1 | [`src/App.tsx`](App.tsx) | setMeta |
| `src/App.tsx` | 47 | `w` | 1 | [`src/App.tsx`](App.tsx) | setWorld |
| `src/App.tsx` | 48 | `[]` | 2 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 52 | `() => {
    document.title = `LifeSeedLab ${APP_VERSION_LABEL}`;
  }` | 1 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 54 | `[]` | 2 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 57 | `() => {
    if (!meta) return;
    let alive = true;
    const runSeed = deriveS` | 1 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 60 | `EPOCH_ROOT` | 1 | [`src/App.tsx`](App.tsx) | deriveSeed |
| `src/App.tsx` | 65 | `matches ? save : null` | 1 | [`src/App.tsx`](App.tsx) | setPendingRun |
| `src/App.tsx` | 68 | `[meta]` | 2 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 73 | `(afterRun?: MetaSave \| null) => {
    setResuming(false);
    if (afterRun) setM` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 74 | `false` | 1 | [`src/App.tsx`](App.tsx) | setResuming |
| `src/App.tsx` | 75 | `afterRun` | 1 | [`src/App.tsx`](App.tsx) | setMeta |
| `src/App.tsx` | 76 | `loadMeta()` | 1 | [`src/App.tsx`](App.tsx) | setMeta |
| `src/App.tsx` | 77 | `'menu'` | 1 | [`src/App.tsx`](App.tsx) | setScreen |
| `src/App.tsx` | 78 | `[]` | 2 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 85 | `async () => {
    const saved = await loadWorld();
    if (saved) setWorld(saved` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 87 | `saved` | 1 | [`src/App.tsx`](App.tsx) | setWorld |
| `src/App.tsx` | 88 | `[]` | 2 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 90 | `s` | 1 | [`src/App.tsx`](App.tsx) | setScreen |
| `src/App.tsx` | 90 | `(s: MenuScreen) => setScreen(s)` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 91 | `'menu'` | 1 | [`src/App.tsx`](App.tsx) | setScreen |
| `src/App.tsx` | 91 | `() => setScreen('menu')` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 92 | `'start'` | 1 | [`src/App.tsx`](App.tsx) | setScreen |
| `src/App.tsx` | 92 | `() => setScreen('start')` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 95 | `updateMeta({ tutorialVersion: TUTORIAL_VERSION })` | 1 | [`src/App.tsx`](App.tsx) | setMeta |
| `src/App.tsx` | 95 | `{ tutorialVersion: TUTORIAL_VERSION }` | 1 | [`src/App.tsx`](App.tsx) | updateMeta |
| `src/App.tsx` | 95 | `() => setMeta(updateMeta({ tutorialVersion: TUTORIAL_VERSION }))` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 96 | `[]` | 2 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 99 | `(_mode: GameMode) => {
      // Neuer Run: alter Save ist damit verbraucht; Run-` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 102 | `null` | 1 | [`src/App.tsx`](App.tsx) | setPendingRun |
| `src/App.tsx` | 103 | `false` | 1 | [`src/App.tsx`](App.tsx) | setResuming |
| `src/App.tsx` | 107 | `beginRun()` | 1 | [`src/App.tsx`](App.tsx) | setMeta |
| `src/App.tsx` | 110 | `'run'` | 1 | [`src/App.tsx`](App.tsx) | setScreen |
| `src/App.tsx` | 112 | `[syncWorld]` | 2 | [`src/App.tsx`](App.tsx) | useCallback |

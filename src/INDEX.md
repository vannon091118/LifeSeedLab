# Modul: src

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/`

## Umfang

12 Dateien · importiert ``, `components`, `config` +8 · wird importiert von ``, `components`, `config` +8

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`App.tsx`](./App.tsx) | 257 | 0 | CALL 82, EXPORTS 1, IMPORTS 16, PASS 79, READ 41, RETURN 9, STRING_REFERENCE 65 |
| [`config.ts`](./config.ts) | 43 | 19 | CALL 1, EXPORTS 5, PASS 1, READ 7, RETURN 3 |
| [`encoding.test.ts`](./encoding.test.ts) | 54 | 0 | CALL 24, IMPORTS 1, PASS 24, READ 22, STRING_REFERENCE 17 |
| [`gacha.test.ts`](./gacha.test.ts) | 196 | 0 | CALL 140, IMPORTS 5, PASS 131, READ 124, STRING_REFERENCE 54 |
| [`genome.ts`](./genome.ts) | 17 | 10 | STRING_REFERENCE 7 |
| [`i18n.tsx`](./i18n.tsx) | 52 | 25 | CALL 9, EXPORTS 3, IMPORTS 4, PASS 12, READ 12, RETURN 6, STRING_REFERENCE 10 |
| [`main.test.ts`](./main.test.ts) | 14 | 0 | CALL 9, IMPORTS 2, PASS 9, READ 2, STRING_REFERENCE 8 |
| [`main.tsx`](./main.tsx) | 75 | 0 | CALL 30, EXPORTS 1, IMPORTS 5, PASS 29, READ 46, RETURN 7, STRING_REFERENCE 81 |
| [`meta.ts`](./meta.ts) | 8 | 8 | STRING_REFERENCE 5 |
| [`types.ts`](./types.ts) | 242 | 59 | EXPORTS 15, STRING_REFERENCE 10 |
| [`version.test.ts`](./version.test.ts) | 59 | 0 | CALL 33, IMPORTS 6, PASS 27, READ 17, STRING_REFERENCE 16 |
| [`version.ts`](./version.ts) | 14 | 5 | EXPORTS 2, STRING_REFERENCE 1 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `APP_VERSION` | const | `src/version.ts` | 11 |
| `APP_VERSION_LABEL` | const | `src/version.ts` | 14 |
| `Allele` | type | `src/types.ts` | 5 |
| `App` | function | `src/App.tsx` | 248 |
| `BallisticProfile` | interface | `src/types.ts` | 33 |
| `BeetleAncestor` | type | `src/types.ts` | 182 |
| `BeetleSpecimen` | type | `src/types.ts` | 222 |
| `BredStatsEntry` | type | `src/types.ts` | 50 |
| `CrossResult` | type | `src/types.ts` | 213 |
| `EPOCH_ID` | const | `src/config.ts` | 40 |
| `EPOCH_ROOT` | const | `src/config.ts` | 20 |
| `GAME_SEED` | const | `src/config.ts` | 13 |
| `GameMode` | type | `src/types.ts` | 209 |
| `Gene` | type | `src/types.ts` | 16 |
| `Genome` | type | `src/types.ts` | 20 |
| `I18nProvider` | function | `src/i18n.tsx` | 18 |
| `MetaSave` | type | `src/types.ts` | 104 |
| `PendingBrood` | type | `src/types.ts` | 192 |
| `PendingCross` | type | `src/types.ts` | 162 |
| `PlantParentSnapshot` | type | `src/types.ts` | 60 |
| `PlantType` | type | `src/types.ts` | 22 |
| `PlantVariant` | type | `src/types.ts` | 66 |
| `RUN_SEED_VERSION` | const | `src/config.ts` | 43 |
| `detectLangFromMeta` | function | `src/i18n.tsx` | 48 |
| `escapeHtml` | function | `src/main.tsx` | 7 |
| `freshRunSeed` | function | `src/config.ts` | 27 |
| `useI18n` | function | `src/i18n.tsx` | 42 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/App.tsx` | 31 | `async () => ({ default: (await import('./components/GameView')).GameView })` | 1 | [`src/App.tsx`](App.tsx) | lazy |
| `src/App.tsx` | 32 | `async () => ({ default: (await import('./components/Greenhouse')).Greenhouse })` | 1 | [`src/App.tsx`](App.tsx) | lazy |
| `src/App.tsx` | 33 | `async () => ({ default: (await import('./components/SeedShop')).SeedShop })` | 1 | [`src/App.tsx`](App.tsx) | lazy |
| `src/App.tsx` | 34 | `async () => ({ default: (await import('./components/BeetleLab')).BeetleLab })` | 1 | [`src/App.tsx`](App.tsx) | lazy |
| `src/App.tsx` | 35 | `async () => ({ default: (await import('./components/Codex')).Codex })` | 1 | [`src/App.tsx`](App.tsx) | lazy |
| `src/App.tsx` | 38 | `null` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 39 | `'start'` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 40 | `null` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 41 | `false` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 42 | `false` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 46 | `null` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 47 | `null` | 1 | [`src/App.tsx`](App.tsx) | useState |
| `src/App.tsx` | 49 | `() => {
    setMeta(loadMeta());
    void ensureWorld()
      .then(w => { if (w` | 1 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 50 | `loadMeta()` | 1 | [`src/App.tsx`](App.tsx) | setMeta |
| `src/App.tsx` | 52 | `w` | 1 | [`src/App.tsx`](App.tsx) | setWorld |
| `src/App.tsx` | 52 | `null` | 1 | [`src/App.tsx`](App.tsx) | setWorldError |
| `src/App.tsx` | 53 | `'Die Welt konnte nicht geladen werden. Bitte Speicher prüfen oder zurücksetzen.'` | 1 | [`src/App.tsx`](App.tsx) | setWorldError |
| `src/App.tsx` | 54 | `[]` | 2 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 58 | `() => {
    document.title = `LifeSeedLab ${APP_VERSION_LABEL}`;
  }` | 1 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 60 | `[]` | 2 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 63 | `() => {
    if (!meta) return;
    let alive = true;
    const runSeed = meta.ru` | 1 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 71 | `matches ? save : null` | 1 | [`src/App.tsx`](App.tsx) | setPendingRun |
| `src/App.tsx` | 74 | `[meta]` | 2 | [`src/App.tsx`](App.tsx) | useEffect |
| `src/App.tsx` | 79 | `(afterRun?: MetaSave \| null) => {
    setResuming(false);
    if (afterRun) setM` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 80 | `false` | 1 | [`src/App.tsx`](App.tsx) | setResuming |
| `src/App.tsx` | 81 | `afterRun` | 1 | [`src/App.tsx`](App.tsx) | setMeta |
| `src/App.tsx` | 82 | `loadMeta()` | 1 | [`src/App.tsx`](App.tsx) | setMeta |
| `src/App.tsx` | 83 | `'menu'` | 1 | [`src/App.tsx`](App.tsx) | setScreen |
| `src/App.tsx` | 84 | `[]` | 2 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 91 | `async () => {
    try {
      const saved = await loadWorld();
      if (saved) ` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 94 | `saved` | 1 | [`src/App.tsx`](App.tsx) | setWorld |
| `src/App.tsx` | 94 | `null` | 1 | [`src/App.tsx`](App.tsx) | setWorldError |
| `src/App.tsx` | 95 | `'Die Welt konnte nicht geladen werden.'` | 1 | [`src/App.tsx`](App.tsx) | setWorldError |
| `src/App.tsx` | 97 | `'Die Welt konnte nicht geladen werden. Bitte Speicher prüfen oder zurücksetzen.'` | 1 | [`src/App.tsx`](App.tsx) | setWorldError |
| `src/App.tsx` | 99 | `[]` | 2 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 101 | `s` | 1 | [`src/App.tsx`](App.tsx) | setScreen |
| `src/App.tsx` | 101 | `(s: MenuScreen) => setScreen(s)` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 102 | `'menu'` | 1 | [`src/App.tsx`](App.tsx) | setScreen |
| `src/App.tsx` | 102 | `() => setScreen('menu')` | 1 | [`src/App.tsx`](App.tsx) | useCallback |
| `src/App.tsx` | 103 | `'start'` | 1 | [`src/App.tsx`](App.tsx) | setScreen |

# Changelog

## Milestone 1: Core Gameplay Enhancements – Target Week 38 (Oct 1, 2026)
- Implement Game Over sequence and restart flow.
- Add shop interface for trading resources.
- Integrate map generation and visualization layers.
- Develop beetle breeding mechanics (Käferzucht) with trait inheritance.
- Refactor Playwright test suite for clean shutdown and coverage.

## Milestone 2: System Refactoring & Hygiene – Target Week 39 (Oct 8, 2026)
- Remove leaked `.env.local` from version control.
- Consolidate configuration sources into `src/config/*.source.ts`.
- Refactor bus events and command queues for v1 contract compliance.
- Update type definitions and ensure strict typing across modules.

## Milestone 3: Game Mechanics Expansion – Target Week 40 (Oct 15, 2026)
- Add combat economy with auto-waves, kill coins, and decay mechanics.
- Implement plant lifecycle management: growth, fertilization, decay.
- Extend discovery chain and genome hash pipeline for deterministic trait mapping.
- Introduce papercraft visual identity for in‑game items.

## Milestone 4: UI/UX Polish & Localization – Target Week 41 (Oct 22, 2026)
- Complete German/English i18n integration using `src/i18n/translations.ts`.
- Polish UI components: MainMenu, NavIndicators, ScreenTransition.
- Add status line dev overlay for debug information.
- Finalize localization context provider and persisted meta.

## Future Work
- Ongoing: Track issues and feature requests in the [Issue Tracker](https://github.com/yourorg/seeddlab/issues).
- Future releases will focus on multiplayer synchronization, advanced AI opponents, and expanded visual effects.
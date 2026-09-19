// Owner: i18n (Lauf). LOC ≤ 200.
// Alles im laufenden Lauf: HUD, Feld, Bauphase, Wellen, Game Over.
// Domänen-Modul nach dem Muster von help.ts/tutorial.ts: DE und EN liegen ZUSAMMEN, weil beide
// Fassungen denselben Schlüsselbestand führen müssen — getrennt nach Sprache müsste die Parität
// über zwei Dateien gepflegt werden. Komponiert wird ausschließlich in translations.ts.

export const runTexts = {
  de: {
    'game.deployBeetle': 'Käfer einsetzen',
    'game.wave': 'Welle',
    'game.status': 'Spielstatus',
    'game.paused': 'Pause',
    'game.speed': 'Tempo',
    'game.trayPlants': 'PFLANZEN',
    'game.trayField': 'FELD',
    'game.sellTool': 'Verkauf',
    // #6: Der Verkauf ist ein EIGENER Werkzeug-Knopf über dem Bau-Kasten — Titel und Beisatz
    // erklären, was der Modus tut und was zurückkommt (Material, nicht Energie).
    'game.sellHint': 'Verkaufsmodus: ein gebautes Feld antippen — das Material wandert zurück in den Pool.',
    'game.sellRefund': 'Material zurück',
    'game.routeQuality': 'WEG-GÜTE',
    'game.routeQualityHint': '100% = gerader Weg — je niedriger, desto mehr lenkt dein Zucht-Layout die Gegner um',
    'game.autoWaves': 'Auto-Wellen',
    'game.prep': 'VORBEREITUNG — Türme platzieren, dann Welle starten!',
    'game.waveActive': 'Welle',
    'game.enemiesLeft': 'Gegner übrig',
    'game.gameover': 'GAME OVER',
    'game.resumeTap': 'Tippen zum Fortsetzen',
    // 'game.waveOf', 'game.placing', 'game.clickGrid', 'game.reset', 'game.breed',
    // 'hud.energy/lives/nektarEarned', 'debug.*', 'menu.notOwned', 'menu.loadoutFull',
    // 'menu.startRun', 'breed.chance/offspring/generation/collection', 'common.close/confirm',
    // 'breed.title/parentA/parentB/cross/cost/keep/new/needTwo/notEnoughNektar' (die
    // BeetleLab-Brut nutzt beetle.*), 'gacha.keep', 'codex.genome/verify/loadSeed':
    // entfernt — bestätigt ungenutzt (Toter-Key-Audit, Icons ersetzen hud.* im Feld).
    // Hinweis: 'trait.*' wird dynamisch gebaut (`t(`trait.${id}`)`), daher nie literal auffindbar.
    'game.hint': 'Tippe eine Pflanze unten, ziehe den Geist übers Feld — Tap platziert, ✕ bricht ab. Welt ist Papier, Pflanzen sind lebendig.',
    // R1: Build-Sequenz — der Feld-Hinweis der Layout-Phase.
    'game.hintLayout': 'Bau dein Labyrinth: Wege lenken, Töpfe tragen Pflanzen, Findlinge blockieren. „Fertig gebaut" startet die erste Welle.',
    'hud.journal': 'Forschungsbuch',
    'game.startWave': 'Welle starten',
    'game.exitRun': 'Run beenden',
    // B23.1/2: Der Knopf sagt, was gerade gilt — Welle läuft, Countdown oder Warten auf dich.
    'wave.running': 'Welle {n} läuft',
    'wave.startIn': 'Welle startet in {s}s',
    'wave.waitingHint': 'Das Labor wartet auf deine erste Pflanze.',
    // R1: Layout-Phase — der Wellen-Knopf wird zum sanften Ausstieg.
    'layout.done': 'Fertig gebaut',
    // Sanfter Ausstieg aus der Bauphase (führt in die Vorbereitung mit Auto-Start-Countdown).
    // Der Name unterscheidet sich klar vom Hauptknopf „Welle starten" — vorher hießen beide
    // „Fertig gebaut" (Doppelknopf) und der Hinweis nannte einen dritten, der nicht existierte.
    'layout.doneLong': 'Bauen beenden',
    'layout.hint': 'Welle 1 direkt starten? „Welle starten". Erst vorbereiten? „Bauen beenden".',
    // B23.3: Ablehnungsgründe der Platzierung — vorher passierte sichtbar nichts.
    'field.reject.occupied': 'Da wächst schon etwas.',
    'field.reject.on_path': 'Hier endet die Weltfläche — bau erst ein FELD an.',
    'field.reject.no_inventory': 'Von dieser Pflanze ist keine mehr übrig.',
    // #4: Feld-Pool leer (im Shop nachkaufen) — eigener Text, eigener Grund (`no_material`).
    'field.reject.no_material': 'Kein Material mehr — kauf im Shop nach.',
    'field.reject.unknown': 'Hier lässt sich gerade nichts setzen.',
    // B29: Karten-Bau — die UI prüft Tiles bewusst nicht vor, der Grund kommt aus der Sim.
    'field.reject.unknown_tile': 'Dieses Feld gibt es hier nicht.',
    'field.reject.max_count': 'Von diesem Feld steht schon das Maximum.',
    'field.reject.occupied_plant': 'Da wächst schon eine Pflanze.',
    'field.reject.out_of_world': 'Hier ist noch keine Welt — erst erweitern (R2).',
    'field.reject.max_size': 'Die Welt hat ihre größte Fläche erreicht.',
    'field.reject.not_expandable': 'Hier lässt sich nichts anbauen.',
    'field.reject.already_buildable': 'Das Feld ist schon bebaut.',
    // B29: Düngen und Vermehren — der Zustand liegt in der Sim, sie sagt auch ab.
    'field.reject.not_growing': 'Diese Pflanze wächst gerade nicht.',
    'field.reject.max_reached': 'Mehr Dünger nimmt sie nicht an.',
    'field.reject.not_mature': 'Diese Pflanze ist noch nicht reif.',
    'field.reject.not_found': 'Die Pflanze ist nicht mehr da.',
    // B29: Brutling-Einsatz (Ursache ist HUD-Wissen, deshalb nur der Text).
    'field.reject.already_deployed': 'Es ist schon ein Brutling draußen.',
    'field.reject.none_available': 'Kein Brutling im Lager.',
    // M5: zugebauter Laufweg — der gelegte Weg greift nicht mehr, der Fallback übernimmt.
    'field.reject.route_blocked': 'Das wäre der letzte freie Weg — der Bau wird abgelehnt!',
    'over.title': 'Run beendet',
    'over.waveReached': 'Erreichte Welle',
    'over.nektarEarned': 'Nektar verdient',
    'over.toMenu': 'Zurück zum Menü',
    'over.score': 'Score',
    'over.retry': 'Neuer Run',
    'over.reasonLives': 'Deine Leben sind auf 0 — Gegner haben das Feld erreicht. Jeder Durchbruch kostet Leben.',
    'over.version': 'Version {v}',
  },
  en: {
    'game.deployBeetle': 'Deploy beetle',
    'game.wave': 'Wave',
    'game.status': 'Game status',
    'game.paused': 'Paused',
    'game.speed': 'Speed',
    'game.trayPlants': 'PLANTS',
    'game.trayField': 'FIELD',
    'game.sellTool': 'Sell',
    'game.sellHint': 'Sell mode: tap a built plot — the material returns to your pool.',
    'game.sellRefund': 'material back',
    'game.routeQuality': 'PATH QUALITY',
    'game.routeQualityHint': '100% = straight path — the lower it drops, the more your plantings bend the enemies’ route',
    'game.autoWaves': 'Auto waves',
    'game.prep': 'PREP PHASE — Place towers, then start the wave!',
    'game.waveActive': 'Wave',
    'game.enemiesLeft': 'enemies left',
    'game.gameover': 'GAME OVER',
    'game.resumeTap': 'Tap to Resume',
    'game.hint': 'Tap a plant below, drag the ghost over the field — tap places, ✕ cancels. World is paper, plants are alive.',
    // R1: build sequence — the layout-phase field hint.
    'game.hintLayout': 'Build your maze: paths steer, pots carry plants, boulders block. "Done building" starts the first wave.',
    'hud.journal': 'Research Journal',
    'game.startWave': 'Start Wave',
    'game.exitRun': 'Exit Run',
    // B23.1/2: the button says what is true — wave running, countdown, or waiting for you.
    'wave.running': 'Wave {n} running',
    'wave.startIn': 'Wave starts in {s}s',
    'wave.waitingHint': 'The lab is waiting for your first plant.',
    // R1: layout phase — the wave button becomes the gentle exit.
    'layout.done': 'Done building',
    'layout.doneLong': 'Finish building',
    'layout.hint': 'Start wave 1 now? Press "Start wave". Prepare first? Press "Finish building".',
    // B23.3: placement rejections — nothing visible used to happen at all.
    'field.reject.occupied': 'Something is already growing there.',
    'field.reject.on_path': 'This is the edge of the world — build a FELD first.',
    'field.reject.no_inventory': 'No plant of this kind left.',
    'field.reject.no_material': 'No material left — buy more in the shop.',
    'field.reject.unknown': 'Nothing can be placed here right now.',
    // B29: plot building — the UI does not pre-check tiles, so the reason comes from the sim.
    'field.reject.unknown_tile': 'That plot does not exist.',
    'field.reject.max_count': 'The maximum of this plot is already built.',
    'field.reject.occupied_plant': 'A plant is already growing there.',
    'field.reject.out_of_world': 'No world here yet — expand first (R2).',
    'field.reject.max_size': 'The world has reached its maximum size.',
    'field.reject.not_expandable': 'Nothing can be built here.',
    'field.reject.already_buildable': 'This plot is already built.',
    // B29: fertilising and propagation — the state lives in the sim, so the sim refuses.
    'field.reject.not_growing': 'This plant is not growing right now.',
    'field.reject.max_reached': 'It will not take more fertiliser.',
    'field.reject.not_mature': 'This plant is not mature yet.',
    'field.reject.not_found': 'The plant is gone.',
    // B29: broodling deployment (the cause is HUD knowledge, so the text carries it).
    'field.reject.already_deployed': 'A broodling is already out.',
    'field.reject.none_available': 'No broodling in the stash.',
    // M5: route blocked — the fallback path takes over, and that is announced.
    'field.reject.route_blocked': 'That would close the last free path — build rejected!',
    'over.title': 'Run Over',
    'over.waveReached': 'Wave Reached',
    'over.nektarEarned': 'Nectar Earned',
    'over.toMenu': 'Back to Menu',
    'over.score': 'Score',
    'over.retry': 'New Run',
    'over.reasonLives': 'Your lives hit 0 — enemies reached the field end. Every breach costs lives.',
    'over.version': 'Version {v}',
  },
};

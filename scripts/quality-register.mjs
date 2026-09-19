// Generiert die ID-Tabelle in `docs/quality/quality-spec.md` aus den Überschriften der
// Domänen-Contracts. Aufruf:
//   node scripts/quality-register.mjs           # Tabelle schreiben
//   node scripts/quality-register.mjs --check   # nur prüfen (Exit 1 bei Abweichung)
//
// Warum generiert statt getippt: Die Tabelle ist ein Zeiger von jeder ID (A…/B…) auf ihren
// Owner-Contract. Von Hand gepflegt driftet sie, sobald ein Befund verschoben oder umbenannt
// wird — und sie enthielt bereits einmal Zeilen, die mitten im Wort abgeschnitten waren (aus
// gekürzter Anzeige abgeschrieben; B23/A13.14/B32).
//
// Eine Wahrheit: die Reihenfolge der Domänen kommt aus der Domänen-Tabelle des Registers, die
// ID→Contract-Zuordnung aus den Überschriften der Contracts selbst. Dieses Skript hält keine
// eigene Liste — es prüft:
//   (1) jede ID existiert in GENAU einem Contract (Duplikat ⇒ Abbruch),
//   (2) jede Contract-ID steht in der Tabelle (keine Waise),
//   (3) jeder Contract auf der Platte steht in der Domänen-Tabelle (kein vergessener Contract),
//   (4) keine Zelle enthält ein rohes `|` oder einen Zeilenumbruch (Tabellen-Integrität).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const REGISTER = path.join(ROOT, 'docs', 'quality', 'quality-spec.md');
const CONTRACTS_DIR = path.join(ROOT, 'docs', 'quality', 'contracts');
const START = '## Wo steht welche ID?';
const END = '## Regeln für dieses Register';

/** Genau die ID-Überschriften: `## A1 …`, `### B16.2 …`, `## B23. …`. */
const HEADING = /^#{2,3}\s+([AB]\d+(?:\.\d+)?)[.)]?\s+(.+?)\s*$/;
/** Ein Contract-Link, wie er in der Domänen-Tabelle steht. */
const CONTRACT_LINK = /\]\(\.\/contracts\/([a-z0-9_-]+\.md)\)/g;

const fail = (msg) => {
  console.error(`❌ ${msg}`);
  process.exit(1);
};

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const register = read(REGISTER);

// (Reihenfolge) Domänen-Tabelle des Registers = eine Wahrheit für die Gliederung.
const domainSection = register.slice(0, register.indexOf(START));
const order = [...new Set([...domainSection.matchAll(CONTRACT_LINK)].map((m) => m[1]))];
if (order.length === 0) fail('Keine Contracts in der Domänen-Tabelle des Registers gefunden');

// (3) Kein Contract auf der Platte darf in der Domänen-Tabelle fehlen.
const onDisk = fs.readdirSync(CONTRACTS_DIR).filter((f) => f.endsWith('.md')).sort();
const forgotten = onDisk.filter((f) => !order.includes(f));
if (forgotten.length) fail(`Contract ohne Domänen-Tabellen-Eintrag: ${forgotten.join(', ')}`);
const missing = order.filter((f) => !onDisk.includes(f));
if (missing.length) fail(`Domänen-Tabelle nennt einen Contract, der nicht existiert: ${missing.join(', ')}`);

const found = [];
for (const file of order) {
  const text = read(path.join(CONTRACTS_DIR, file));
  for (const line of text.split('\n')) {
    const m = line.match(HEADING);
    if (m) found.push({ id: m[1], title: m[2], file });
  }
}

// (1) ID-Eindeutigkeit
const seen = new Map();
for (const f of found) {
  const prev = seen.get(f.id);
  if (prev) fail(`ID doppelt vergeben: ${f.id} in ${prev.file} UND ${f.file}`);
  seen.set(f.id, f);
}

// (4) Tabellen-Integrität
for (const f of found) {
  if (f.title.includes('|')) fail(`Zelle enthält ein rohes |: ${f.id} — ${f.title}`);
}

const sortIds = (a, b) => {
  const [pa, sa = 0] = a.split('.').map(Number);
  const [pb, sb = 0] = b.split('.').map(Number);
  return pa !== pb ? pa - pb : sa - sb;
};

const rows = [];
for (const file of order) {
  const name = file.replace(/\.md$/, '');
  const mine = found.filter((f) => f.file === file);
  mine.sort((a, b) => {
    if (a.id[0] !== b.id[0]) return a.id[0] === 'A' ? -1 : 1; // Befunde vor Spezifikationen
    return sortIds(a.id, b.id);
  });
  for (const f of mine) rows.push(`| \`${f.id}\` | [${name}.md](./contracts/${file}) | ${f.title} |`);
}

const block = `| ID | Contract | Thema |\n|---|---|---|\n${rows.join('\n')}`;

const start = register.indexOf(START);
const end = register.indexOf(END);
if (start < 0 || end < 0 || end < start) fail(`Anker im Register fehlt (${START} / ${END})`);
const current = register.slice(start, end).split('\n').filter((l) => l.startsWith('|')).join('\n');

if (current === block) {
  console.log(`✅ Register aktuell — ${seen.size} IDs aus ${order.length} Contracts, keine Waise.`);
  process.exit(0);
}

const wanted = block.split('\n').filter((l) => l.startsWith('|'));
const have = current.split('\n').filter((l) => l.startsWith('|'));
const stale = have.filter((l) => !wanted.includes(l));
const absent = wanted.filter((l) => !have.includes(l));
console.log(`Register-ID-Tabelle veraltet: ${stale.length} überzählig/veraltet, ${absent.length} fehlend.`);
stale.slice(0, 10).forEach((l) => console.log(`  - ${l.slice(0, 120)}`));
absent.slice(0, 10).forEach((l) => console.log(`  + ${l.slice(0, 120)}`));

if (process.argv.includes('--check')) {
  console.error('❌ --check: Register ist nicht auf dem Stand der Contracts. Reparatur: node scripts/quality-register.mjs');
  process.exit(1);
}

const patched = register.slice(0, start) + `${START}\n\n${block}\n\n` + register.slice(end);
fs.writeFileSync(REGISTER, patched, 'utf8');
console.log(`✅ Register-ID-Tabelle geschrieben — ${seen.size} IDs aus ${order.length} Contracts.`);

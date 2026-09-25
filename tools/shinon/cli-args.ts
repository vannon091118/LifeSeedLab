export interface ParsedArgs {
  command: string;
  flags: Map<string, string | true>;
  positional: string[];
  only: string[];
}

const VALUE_OPTIONS = new Set([
  'phase', 'only', 'message-file', 'message', 'file', 'url', 'slug', 'description', 'branch', 'remote', 'root',
]);
const BOOLEAN_OPTIONS = new Set([
  'gate', 'all', 'no-prepare', 'no-push', 'dry-run', 'auto', 'quiet', 'json', 'public', 'write-config', 'self-test', 'no-hooks',
]);
const KNOWN_OPTIONS = new Set([...VALUE_OPTIONS, ...BOOLEAN_OPTIONS]);
const DRY_RUN_COMMANDS = new Set([
  'help', 'status', 'prepare', 'gate', 'commit', 'push', 'finish', 'message', 'checks',
]);
const CHECK_SELECTION_COMMANDS = new Set(['prepare', 'gate', 'finish']);
const POSITIONAL_LIMITS: Record<string, number> = { message: 1, enforce: 1 };

function parseFlags(argv: string[]): { flags: Map<string, string | true>; positional: string[]; first: string | null } {
  const flags = new Map<string, string | true>();
  const positional: string[] = [];
  let first: string | null = null;

  for (const token of argv) {
    if (!token.startsWith('--')) {
      if (first === null) first = token === '' ? 'help' : token;
      else positional.push(token);
      continue;
    }
    const [key, ...rest] = token.slice(2).split('=');
    if (key === undefined || key === '') throw new Error('Ungültige Option: --');
    if (!KNOWN_OPTIONS.has(key)) throw new Error(`Unbekannte Option: --${key}`);
    const value = rest.length > 0 ? rest.join('=') : true;
    if (BOOLEAN_OPTIONS.has(key) && value !== true) throw new Error(`Option --${key} akzeptiert keinen Wert.`);
    if (VALUE_OPTIONS.has(key) && value === true) throw new Error(`Option --${key} benötigt einen Wert.`);
    if (key === 'root' && value === '') throw new Error('Option --root benötigt einen Wert.');
    flags.set(key, value);
  }
  return { flags, positional, first };
}

function selectedChecks(flags: Map<string, string | true>): string[] {
  if (!flags.has('only')) return [];
  const value = flags.get('only');
  const selected = typeof value === 'string'
    ? value.split(',').map((entry) => entry.trim()).filter((entry) => entry !== '')
    : [];
  if (selected.length === 0) throw new Error('Ungültige --only-Auswahl: mindestens eine Check-ID ist erforderlich.');
  return selected;
}

export function parseCliArgs(argv: string[]): ParsedArgs {
  const { flags, positional, first } = parseFlags(argv);
  const command = first ?? 'help';
  const maxPositional = POSITIONAL_LIMITS[command] ?? 0;
  if (positional.length > maxPositional) {
    throw new Error(`Unerwartetes Argument für „${command}“: ${positional[0]}`);
  }
  if (flags.has('dry-run') && !DRY_RUN_COMMANDS.has(command)) {
    throw new Error(`--dry-run wird für den Befehl „${command}“ nicht unterstützt.`);
  }
  const only = selectedChecks(flags);
  const selectionApplies = CHECK_SELECTION_COMMANDS.has(command) || (command === 'commit' && flags.has('gate'));
  if (flags.has('only') && !selectionApplies) {
    throw new Error(`--only ist für den Befehl „${command}“ nicht wirksam.`);
  }
  return { command, flags, positional, only };
}

export function text(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name);
  return typeof value === 'string' ? value : undefined;
}

export function has(args: ParsedArgs, name: string): boolean {
  return args.flags.has(name);
}

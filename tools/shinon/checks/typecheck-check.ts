import { CommandCheck } from './command-check.ts';

/** Typecheck: muss immer 0 Fehler liefern (Contract-Regel, nicht verhandelbar). */
export class TypecheckCheck extends CommandCheck {
  constructor() {
    super('typecheck', 'Typecheck (tsc -b --noEmit)', 'typecheck');
  }
}

import { CommandCheck } from './command-check.ts';

/** Build: muss durchbauen — standardmäßig nur aktiviert, wenn die Konfiguration es verlangt. */
export class BuildCheck extends CommandCheck {
  constructor() {
    super('build', 'Build (vite build)', 'build');
  }
}

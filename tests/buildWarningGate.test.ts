import { describe, expect, it, vi } from 'vitest';
import { blockBuildWarnings } from '../vite.config';

type WarningLogger = {
  warn: (message: string) => void;
  warnOnce: (message: string) => void;
};

function install(command: 'build' | 'serve', logger: WarningLogger): void {
  const plugin = blockBuildWarnings();
  const hook = plugin.configResolved as (config: { command: 'build' | 'serve'; logger: WarningLogger }) => void;
  hook({ command, logger });
}

describe('Vite build warning gate', () => {
  it('macht jede Build-Warnung zu einem Fehler', () => {
    const logger = { warn: vi.fn(), warnOnce: vi.fn() };
    install('build', logger);

    expect(() => logger.warn('chunk is too large')).toThrow('Build warning blocked');
    expect(() => logger.warnOnce('dynamic import is ineffective')).toThrow('Build warning blocked');
  });

  it('lässt Dev-Server-Warnungen unangetastet', () => {
    const logger = { warn: vi.fn(), warnOnce: vi.fn() };
    install('serve', logger);

    logger.warn('dev warning');
    logger.warnOnce('dev warning once');
    expect(logger.warn).toHaveBeenCalledWith('dev warning');
    expect(logger.warnOnce).toHaveBeenCalledWith('dev warning once');
  });
});

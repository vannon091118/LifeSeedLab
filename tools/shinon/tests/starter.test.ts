import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ShinonStarter } from '../starter.ts';
import { ShinonStateStore } from '../state.ts';
import { gitIt, initTempRepo, write } from './helpers.ts';
import type { ShinonConfig } from '../config.ts';
import type { ShinonGitHelfer } from '../git-helfer.ts';

const makeStarter = (git: ShinonGitHelfer, config: ShinonConfig): ShinonStarter =>
  new ShinonStarter(git, config, new ShinonStateStore(git.root));

describe('ShinonStarter', () => {
  it('liest den echten Repository-Zustand', () => {
    const { dir, git, config } = initTempRepo('starter-status');
    write(dir, 'src/simulation/plant.ts', 'export const p = 1;\n');
    gitIt(dir, ['add', '-A']);
    gitIt(dir, ['commit', '-m', 'feat(x): erster Commit']);

    const status = makeStarter(git, config).collect();
    expect(status.branch).toBe('main');
    expect(status.headSubject).toBe('feat(x): erster Commit');
    expect(status.clean).toBe(true);
    expect(status.hotspots.some((spot) => spot.file.endsWith('src/simulation/plant.ts'))).toBe(true);
  });

  it('aktualisiert den markierten README-Block und ist idempotent', () => {
    const { dir, git, config } = initTempRepo('starter-readme');
    write(dir, 'README.md', `# Test\n\n${config.starter.beginMarker}\nveraltet\n${config.starter.endMarker}\n\n## Ende\n`);

    const starter = makeStarter(git, config);
    const block = starter.renderBlock(starter.collect());
    const first = starter.updateReadme(block);
    const second = starter.updateReadme(block);

    expect(first.mode).toBe('in-place');
    expect(first.updated).toBe(true);
    expect(second.updated).toBe(false);

    const content = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
    expect(content).toContain('# Test');
    expect(content).toContain('## Ende');
    expect(content).toContain('| Letztes Gate |');
    expect(content).toContain('| Gate-Modus |');
    expect(content).toContain('advisory');
    expect(content).not.toContain('veraltet');
    expect(content.indexOf('## Ende')).toBeGreaterThan(content.indexOf(config.starter.endMarker));
  });

  it('hängt den Block an, wenn die Marker fehlen', () => {
    const { dir, git, config } = initTempRepo('starter-append');
    write(dir, 'README.md', '# Test\n');

    const starter = makeStarter(git, config);
    const result = starter.updateReadme(starter.renderBlock(starter.collect()));

    expect(result.mode).toBe('appended');
    const content = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
    expect(content).toContain(config.starter.sectionTitle);
    expect(content).toContain(config.starter.beginMarker);
  });

  it('überspringt die Aktualisierung, wenn keine README existiert', () => {
    const { git, config } = initTempRepo('starter-no-readme');
    const result = makeStarter(git, config).updateReadme('block');
    expect(result.mode).toBe('skipped');
    expect(result.updated).toBe(false);
  });
});

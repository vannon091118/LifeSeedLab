import { describe, expect, it } from 'vitest';
import { createInitialWorld, isValidWorldState } from './world_state';

describe('WorldState semantic validation', () => {
  it('rejects unknown tile types instead of accepting a checksum-valid save', () => {
    const world = { ...createInitialWorld(), tiles: { '1,1': 'not_a_tile' } };
    expect(isValidWorldState(world)).toBe(false);
  });

  it('rejects a blocked spawn or exit cell', () => {
    const start = createInitialWorld();
    const spawn = { ...start, tiles: { [`${start.cols - 1},0`]: 'pot' } };
    const exit = { ...start, tiles: { [`0,${start.rows - 1}`]: 'pot' } };
    expect(isValidWorldState(spawn)).toBe(false);
    expect(isValidWorldState(exit)).toBe(false);
  });

  it('accepts walkable decoration at both boundary corners', () => {
    const start = createInitialWorld();
    const world = { ...start, tiles: { [`${start.cols - 1},0`]: 'decor', [`0,${start.rows - 1}`]: 'decor' } };
    expect(isValidWorldState(world)).toBe(true);
  });
});

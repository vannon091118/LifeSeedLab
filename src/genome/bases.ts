import type { PlantVariant } from '../types';
import { STARTER_PLANT_COUNT } from '../config/economy.source';

// Owner: Source (base variants). LOC ≤ 200.
void STARTER_PLANT_COUNT;

export function createBaseVariants(): PlantVariant[] {
  return [
    {
      id: 'base_shooter',
      name: 'Sprout',
      type: 'shooter',
      genome: [
        { id: 'rapid', power: 0.5, dominant: true },
        { id: 'pierce', power: 0.3, dominant: true },
      ],
      traits: ['rapid fire', 'pierce'],
      cost: 50,
      stats: { hp: 100, damage: 15, range: 3, cooldown: 30, special: null },
      color: '#4ade80',
      discovered: true,
    },
    {
      id: 'base_wall',
      name: 'Rootwall',
      type: 'wall',
      genome: [
        { id: 'shield', power: 0.7, dominant: true },
        { id: 'thorns', power: 0.4, dominant: true },
      ],
      traits: ['shield', 'thorns'],
      cost: 40,
      stats: { hp: 300, damage: 5, range: 0.5, cooldown: 60, special: 'reflect' },
      color: '#a3734a',
      discovered: true,
    },
    {
      id: 'base_support',
      name: 'Mycelia',
      type: 'support',
      genome: [
        { id: 'heal', power: 0.6, dominant: false },
        { id: 'aura', power: 0.3, dominant: false },
      ],
      traits: ['heal', 'aura'],
      cost: 60,
      stats: { hp: 80, damage: 0, range: 2, cooldown: 45, special: 'heal_aura' },
      color: '#c084fc',
      discovered: true,
    },
  ];
}

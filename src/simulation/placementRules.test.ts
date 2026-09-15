import { describe, it, expect } from 'vitest';
import { cellRejectReason, placementRejectReason } from './placementRules';

// Freie Zelle: innerhalb des Rasters und weit weg vom Enemy-Pfad (rechts unten).
const FREE = { gx: 11, gy: 10 };
// Zellzentrum (2.5, 3.5) ist exakt ein Pfad-Waypoint.
const ON_PATH = { gx: 2, gy: 3 };

describe('Platzierungsregeln — Geometrie', () => {
  it('akzeptiert eine freie Zelle', () => {
    expect(cellRejectReason({ ...FREE, plants: [] })).toBeNull();
  });

  it('lehnt Zellen außerhalb des Rasters als on_path ab', () => {
    expect(cellRejectReason({ gx: -1, gy: 0, plants: [] })).toBe('on_path');
    expect(cellRejectReason({ gx: 0, gy: 12, plants: [] })).toBe('on_path');
  });

  it('lehnt Zellen im Pfad-Korridor als on_path ab', () => {
    expect(cellRejectReason({ ...ON_PATH, plants: [] })).toBe('on_path');
  });

  it('lehnt belegte Zellen als occupied ab', () => {
    expect(cellRejectReason({ ...FREE, plants: [{ gx: 11, gy: 10 }] })).toBe('occupied');
  });
});

describe('Platzierungsregeln — Ökonomie vor Geometrie', () => {
  it('meldet no_inventory, bevor Geometrie geprüft wird', () => {
    const reason = placementRejectReason({
      board: { ...ON_PATH, plants: [] },
      inventoryCount: 0,
      energy: 999,
      cost: 10,
    });
    expect(reason).toBe('no_inventory');
  });

  it('meldet no_energy vor der Zellprüfung', () => {
    const reason = placementRejectReason({
      board: { ...FREE, plants: [{ gx: 11, gy: 10 }] },
      inventoryCount: 1,
      energy: 5,
      cost: 10,
    });
    expect(reason).toBe('no_energy');
  });

  it('gibt null zurück, wenn alles passt', () => {
    const reason = placementRejectReason({
      board: { ...FREE, plants: [] },
      inventoryCount: 1,
      energy: 10,
      cost: 10,
    });
    expect(reason).toBeNull();
  });
});

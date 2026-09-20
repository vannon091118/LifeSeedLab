// Owner: CameraObserver. LOC ≤ 300.
// Camera is observer state. Gameplay may NOT write it (contract Phase 7.2).
// Shake jitter uses a 'cosmetic' namespace stream — determinism-safe.

import { makeRng } from '../core/rng';

interface CameraState {
  x: number;        // world coords (cells)
  y: number;
  zoom: number;
  shakeOffset: { x: number; y: number };
  shakeIntensity: number;
  shakeDecay: number;
}

export class Camera {
  private s: CameraState = {
    x: 6, y: 4, zoom: 1,
    shakeOffset: { x: 0, y: 0 },
    shakeIntensity: 0,
    shakeDecay: 0.9,
  };
  private jitter = makeRng('cosmetic', 0xC0FFEE);

  follow(x: number, y: number, lerp = 0.1): void {
    this.s.x += (x - this.s.x) * lerp;
    this.s.y += (y - this.s.y) * lerp;
  }

  shake(intensity: number): void {
    this.s.shakeIntensity = Math.max(this.s.shakeIntensity, intensity);
  }

  update(): void {
    if (this.s.shakeIntensity > 0.01) {
      this.s.shakeOffset.x = (this.jitter.next() - 0.5) * this.s.shakeIntensity;
      this.s.shakeOffset.y = (this.jitter.next() - 0.5) * this.s.shakeIntensity;
      this.s.shakeIntensity *= this.s.shakeDecay;
    } else {
      this.s.shakeOffset.x = 0;
      this.s.shakeOffset.y = 0;
    }
  }

  get(): Readonly<CameraState> {
    return this.s;
  }
}

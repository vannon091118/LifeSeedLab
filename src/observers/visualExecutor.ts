// Owner: PresentationExecutor. LOC ≤ 200.
// Übergibt VisualCommands an die jeweiligen Präsentations-Owner.
// Keine Gameplay-Entscheidungen und keine Farbableitung außerhalb des Observers.

import type { VisualCommand } from './visualObserver';
import type { ParticlePool } from './particles';
import type { Camera } from '../render/camera';
import type { FeedbackLayer } from '../render/layers/feedback';

export function executeVisualCommand(
  command: VisualCommand,
  particles: ParticlePool,
  camera: Camera,
  feedback: FeedbackLayer,
): void {
  switch (command.type) {
    case 'SpawnParticleBurst':
      particles.burst(command.profile, command.x, command.y, command.color, command.seed, command.intensity / 2);
      break;
    case 'CameraShake':
      camera.shake(command.intensity);
      break;
    default:
      feedback.exec(command);
      break;
  }
}

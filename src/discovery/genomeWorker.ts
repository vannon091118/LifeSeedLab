// Owner: DiscoveryWorker. LOC ≤ 80.
// Der Worker enthält keine eigene Zuchtlogik: importiert den puren Rekonstruktionspfad aus
// share.ts. Dadurch gibt es genau eine Kreuzungs- und Hash-Wahrheit.

import {
  reconstructShare,
  type WorkerRequest,
  type WorkerResponse,
} from './share';

type WorkerScope = {
  addEventListener: (type: 'message', listener: (event: MessageEvent<WorkerRequest>) => void) => void;
  postMessage: (message: WorkerResponse) => void;
};

const scope = globalThis as unknown as WorkerScope;

scope.addEventListener('message', event => {
  if (event.data?.type !== 'reconstruct') return;
  void reconstructShare(event.data.text)
    .then(result => scope.postMessage({ type: 'result', result }))
    .catch(error => scope.postMessage({
      type: 'error',
      reason: error instanceof Error ? error.message : 'Share-Rekonstruktion fehlgeschlagen.',
    }));
});

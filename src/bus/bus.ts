// Owner: BusSystem. LOC ≤ 300. Transport only — contains no gameplay rules.

import type { GameEvent, EventType } from './events';

type Handler = (e: GameEvent) => void;

export class EventBus {
  private handlers = new Map<EventType, Set<Handler>>();
  private seq = 0;
  private recent: GameEvent[] = []; // debug ring buffer (Phase 18.2)

  publish(event: GameEvent): void {
    this.seq++;
    this.recent.push(event);
    if (this.recent.length > 200) this.recent.shift();

    const set = this.handlers.get(event.type);
    if (!set) return;
    // copy: handlers may subscribe/unsubscribe during dispatch
    for (const h of [...set]) h(event);
  }

  subscribe<K extends EventType>(type: K, handler: (e: GameEvent & { type: K; payload: unknown }) => void): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler);
    return () => this.unsubscribe(type, handler as Handler);
  }

  unsubscribe(type: EventType, handler: Handler): void {
    this.handlers.get(type)?.delete(handler);
  }

  /** Debug (Phase 18.2): recent event log. */
  getRecent(): readonly GameEvent[] {
    return this.recent;
  }

  /** Test helper: total publishes (ordering introspection). */
  get publishCount(): number {
    return this.seq;
  }
}

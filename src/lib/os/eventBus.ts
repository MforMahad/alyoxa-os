import { OSEvent } from '../../data/os/events';

export type OSEventListener = (event: OSEvent) => void;

export class OSEventBus {
  private listeners: Set<OSEventListener> = new Set();

  /**
   * Subscribes a listener to receive all published OSEvent instances.
   * Duplicate listener subscriptions are prevented automatically.
   * Returns an unsubscribe function for clean cleanup.
   */
  subscribe(listener: OSEventListener): () => void {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  /**
   * Unsubscribes a listener safely.
   * Calling unsubscribe multiple times on the same listener is safe and no-op.
   */
  unsubscribe(listener: OSEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Synchronously delivers an OSEvent to all active subscribers.
   * Treating the event as read-only and immutable.
   * Safe to call with zero subscribers or during listener errors.
   */
  publish(event: Readonly<OSEvent>): void {
    if (this.listeners.size === 0) return;

    // Snapshot listeners set to prevent mutation during iteration
    const currentListeners = Array.from(this.listeners);

    for (const listener of currentListeners) {
      try {
        listener(event);
      } catch (error) {
        // Log listener error without crashing the bus or affecting other subscribers
        console.error('[OSEventBus] Error in event listener:', error);
      }
    }
  }

  /**
   * Explicit helper to replay or publish a collection of deterministic fixture events.
   * Must be called manually; does not execute automatically on import.
   */
  publishExistingEvents(events: readonly OSEvent[]): void {
    for (const event of events) {
      this.publish(event);
    }
  }

  /**
   * Returns current active listener count. Useful for testing and diagnostics.
   */
  get listenerCount(): number {
    return this.listeners.size;
  }
}

/**
 * Singleton instance of the shared ALYOXA OS Event Bus.
 * Module-agnostic transport layer across SIGNAL, AI, FORGE, PULSE, VAULT, and SYSTEM.
 */
export const osEventBus = new OSEventBus();
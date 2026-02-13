/**
 * Event bus for incoming calls so that both WebSocket and Push Notification
 * can trigger the same full-screen call UI.
 */

export interface IncomingCallPayload {
  callId: string;
  scheduledTime?: string;
}

type Listener = (payload: IncomingCallPayload) => void;

const listeners: Set<Listener> = new Set();

export function addIncomingCallListener(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitIncomingCall(payload: IncomingCallPayload): void {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error('Error in incoming call listener:', error);
    }
  });
}

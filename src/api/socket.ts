/**
 * Live telemetry socket.
 *
 * Reconnects on its own with backoff. A ground station dashboard that needs a
 * page refresh after a dropped link is not a ground station dashboard — and the
 * backend supports cutting the downlink deliberately, so disconnects are an
 * expected part of the demo rather than an error state.
 */

import type { TelemetryFrame } from './types';
import { API_BASE } from './client';

export type ConnectionState = 'connecting' | 'open' | 'closed';

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8000;

function socketUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) return envUrl;

  // API_BASE is relative in development, so resolve against the page origin —
  // which is also what makes the Vite proxy work without extra configuration.
  const base = new URL(API_BASE, window.location.origin);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = `${base.pathname.replace(/\/$/, '')}/ws/telemetry`;
  return base.toString();
}

export interface TelemetrySocketHandlers {
  onFrame: (frame: TelemetryFrame) => void;
  onState: (state: ConnectionState) => void;
}

export class TelemetrySocket {
  private socket: WebSocket | null = null;
  private backoff = INITIAL_BACKOFF_MS;
  private retryTimer: number | null = null;
  private closedByUs = false;

  constructor(private readonly handlers: TelemetrySocketHandlers) {}

  connect(): void {
    this.closedByUs = false;
    this.handlers.onState('connecting');

    let socket: WebSocket;
    try {
      socket = new WebSocket(socketUrl());
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      this.backoff = INITIAL_BACKOFF_MS;
      this.handlers.onState('open');
    };

    socket.onmessage = (event) => {
      try {
        this.handlers.onFrame(JSON.parse(event.data) as TelemetryFrame);
      } catch {
        // A malformed frame is not worth tearing the connection down for.
      }
    };

    socket.onerror = () => {
      // onclose always follows, and that is where reconnection is handled.
    };

    socket.onclose = () => {
      this.socket = null;
      this.handlers.onState('closed');
      if (!this.closedByUs) this.scheduleRetry();
    };
  }

  private scheduleRetry(): void {
    if (this.retryTimer != null) return;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
  }

  close(): void {
    this.closedByUs = true;
    if (this.retryTimer != null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }
}

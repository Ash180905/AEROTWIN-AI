/**
 * Live twin state.
 *
 * One socket writes here; every panel subscribes. The previous version of this
 * app threaded telemetry through props from a 580-line App component, which is
 * why adding a panel meant touching the root.
 *
 * History is a bounded ring buffer. A 20-hour sortie at 1 Hz would otherwise
 * grow without limit in a tab that is meant to stay open for a whole mission;
 * charts only ever render a few hundred points, and the full record lives in
 * the backend's mission store where replay can reach it.
 */

import { create } from 'zustand';

import { api } from '../api/client';
import { TelemetrySocket, type ConnectionState } from '../api/socket';
import type { SimulationStatus, TelemetryFrame } from '../api/types';

export const HISTORY_LIMIT = 900;

interface TwinState {
  frame: TelemetryFrame | null;
  history: TelemetryFrame[];
  status: SimulationStatus | null;
  connection: ConnectionState;
  /** Wall-clock ms of the last frame, for the stale-data indicator. */
  lastFrameAt: number | null;

  connect: () => void;
  disconnect: () => void;
  refreshStatus: () => Promise<void>;
  clearHistory: () => void;
}

let socket: TelemetrySocket | null = null;

export const useTwinStore = create<TwinState>((set, get) => ({
  frame: null,
  history: [],
  status: null,
  connection: 'closed',
  lastFrameAt: null,

  connect: () => {
    if (socket) return;

    socket = new TelemetrySocket({
      onFrame: (frame) => {
        set((state) => {
          // A new flight means the previous sortie's history is not comparable
          // and would draw a discontinuity straight through every chart.
          const sameFlight = state.frame?.flight_id === frame.flight_id;
          const history = sameFlight ? [...state.history, frame] : [frame];

          return {
            frame,
            lastFrameAt: Date.now(),
            history:
              history.length > HISTORY_LIMIT
                ? history.slice(history.length - HISTORY_LIMIT)
                : history,
          };
        });
      },
      onState: (connection) => set({ connection }),
    });

    socket.connect();
    void get().refreshStatus();
  },

  disconnect: () => {
    socket?.close();
    socket = null;
    set({ connection: 'closed' });
  },

  refreshStatus: async () => {
    try {
      set({ status: await api.status() });
    } catch {
      // The status poll is advisory. Losing it must not blank the live view,
      // which is driven by the socket and is the authoritative display.
    }
  },

  clearHistory: () => set({ history: [] }),
}));

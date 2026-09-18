/**
 * REST client for the ground station.
 *
 * Base URL comes from VITE_API_URL, defaulting to a relative path so the Vite
 * dev proxy handles it. That keeps the browser on one origin in development and
 * means no CORS preflight in the demo path.
 */

import type {
  AdvisoryResponse,
  CmapssReport,
  EnginePassport,
  Explanation,
  FaultInjection,
  FleetStatus,
  Limitations,
  MissionReport,
  MissionSummary,
  ReplayResponse,
  ScenarioInfo,
  SensorEvidence,
  SimulationConfig,
  SimulationStatus,
  SystemHealth,
  TelemetryFrame,
} from './types';

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      detail = (await response.json())?.detail;
    } catch {
      // A non-JSON error body is still an error; the status carries the meaning.
    }
    throw new ApiError(
      detail ?? `${response.status} ${response.statusText}`,
      response.status,
      detail,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const api = {
  // -- system ---------------------------------------------------------------
  health: () => request<SystemHealth>('/health'),
  limitations: () => request<Limitations>('/limitations'),
  modelMetrics: (name: string) => request<Record<string, unknown>>(`/models/${name}/metrics`),
  cmapss: () => request<Record<string, CmapssReport>>('/models/cmapss/validation'),

  // -- simulation -----------------------------------------------------------
  status: () => request<SimulationStatus>('/simulation/status'),
  scenarios: () => request<ScenarioInfo[]>('/simulation/scenarios'),
  start: (config: SimulationConfig) => post<SimulationStatus>('/simulation/start', config),
  stop: () => post<SimulationStatus>('/simulation/stop'),
  pause: () => post<SimulationStatus>('/simulation/pause'),
  resume: () => post<SimulationStatus>('/simulation/resume'),
  reset: () => post<SimulationStatus>('/simulation/reset'),
  inject: (injection: FaultInjection) =>
    post<SimulationStatus>('/simulation/inject', injection),
  clearFault: () => post<SimulationStatus>('/simulation/clear-fault'),
  setDownlink: (up: boolean) => post<SimulationStatus>(`/simulation/downlink?up=${up}`),

  // -- telemetry ------------------------------------------------------------
  latestFrame: () => request<TelemetryFrame>('/telemetry/latest'),

  // -- analysis -------------------------------------------------------------
  advisory: (remainingHours?: number) =>
    request<AdvisoryResponse>(
      `/advisory${remainingHours != null ? `?remaining_mission_hours=${remainingHours}` : ''}`,
    ),
  explain: () => request<Explanation>('/explain'),
  sensorEvidence: () => request<SensorEvidence>('/sensor-evidence'),

  // -- missions -------------------------------------------------------------
  missions: (limit = 50) => request<MissionSummary[]>(`/missions?limit=${limit}`),
  replay: (flightId: string, fromS = 0, toS?: number, limit = 1000) => {
    const params = new URLSearchParams({
      from_s: String(fromS),
      limit: String(limit),
    });
    if (toS != null) params.set('to_s', String(toS));
    return request<ReplayResponse>(`/missions/${flightId}/replay?${params}`);
  },
  report: (flightId: string) => request<MissionReport>(`/missions/${flightId}/report`),

  // -- fleet ----------------------------------------------------------------
  fleet: () => request<FleetStatus>('/fleet'),
  passport: (engineId: string) => request<EnginePassport>(`/fleet/${engineId}/passport`),
};

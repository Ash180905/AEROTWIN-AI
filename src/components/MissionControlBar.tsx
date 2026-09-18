/**
 * Mission control: scenario, transport, fault injection, downlink.
 *
 * Every control here posts to the backend and reflects the status it returns.
 * Nothing is simulated in the browser — if the backend rejects a call, the bar
 * shows the rejection rather than pretending the action succeeded.
 */

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Pause,
  Play,
  RadioTower,
  RotateCcw,
  Square,
  Zap,
} from 'lucide-react';

import { api, ApiError } from '../api/client';
import type { FaultClass, MissionScenario, ScenarioInfo } from '../api/types';
import { useTwinStore } from '../store/twinStore';
import { fmtDuration } from '../lib/format';
import { Button } from './ui';

const INJECTABLE: FaultClass[] = [
  'BEARING_LUBRICATION',
  'INJECTOR_MISFIRE',
  'COOLING_LEAK',
  'SENSOR_DRIFT',
  'COMBUSTION_INSTABILITY',
];

const FAULT_SHORT: Record<string, string> = {
  BEARING_LUBRICATION: 'Bearing',
  INJECTOR_MISFIRE: 'Injector',
  COOLING_LEAK: 'Cooling',
  SENSOR_DRIFT: 'Sensor drift',
  COMBUSTION_INSTABILITY: 'Combustion',
};

export function MissionControlBar() {
  const status = useTwinStore((s) => s.status);
  const refreshStatus = useTwinStore((s) => s.refreshStatus);
  const clearHistory = useTwinStore((s) => s.clearHistory);

  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [scenario, setScenario] = useState<MissionScenario>('standard_isr');
  const [severityRate, setSeverityRate] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.scenarios().then(setScenarios).catch(() => setScenarios([]));
  }, []);

  useEffect(() => {
    // The socket carries telemetry, not control state, so status is polled.
    const timer = window.setInterval(() => void refreshStatus(), 2000);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refreshStatus();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'request failed');
    } finally {
      setBusy(false);
    }
  }

  const running = status?.running ?? false;
  const paused = status?.paused ?? false;
  const active = scenarios.find((s) => s.scenario === scenario);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as MissionScenario)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
          >
            {scenarios.map((s) => (
              <option key={s.scenario} value={s.scenario}>
                {s.scenario.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <Button
            variant="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                clearHistory();
                // Envelope fields are deliberately omitted: null means "use the
                // scenario preset", and sending defaults would silently fly a
                // standard day when hot weather was selected.
                await api.start({ scenario });
              })
            }
          >
            <span className="flex items-center gap-1.5">
              <Play className="h-3 w-3" /> Start
            </span>
          </Button>

          {running && (
            <Button
              disabled={busy}
              onClick={() => run(() => (paused ? api.resume() : api.pause()))}
            >
              <span className="flex items-center gap-1.5">
                {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {paused ? 'Resume' : 'Pause'}
              </span>
            </Button>
          )}

          <Button disabled={busy || !running} onClick={() => run(() => api.stop())}>
            <span className="flex items-center gap-1.5">
              <Square className="h-3 w-3" /> Stop
            </span>
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-3 font-mono text-xs text-slate-500">
          {status && running && (
            <>
              <span className="text-slate-700">{status.flight_id}</span>
              <span className="text-slate-300">|</span>
              <span>
                {fmtDuration(status.sim_time_s)} / {fmtDuration(status.duration_s)}
              </span>
              <span className="text-slate-300">|</span>
              <span>{status.time_scale}×</span>
            </>
          )}
          <Button
            variant={status?.downlink_up === false ? 'danger' : 'default'}
            disabled={busy || !running}
            title="Cut the downlink. Onboard assessment continues; frames backfill on restore."
            onClick={() => run(() => api.setDownlink(!(status?.downlink_up ?? true)))}
          >
            <span className="flex items-center gap-1.5">
              <RadioTower className="h-3 w-3" />
              {status?.downlink_up === false ? 'Downlink cut' : 'Cut downlink'}
            </span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <Zap className="h-3 w-3" /> Inject fault
        </span>

        {INJECTABLE.map((fault) => (
          <Button
            key={fault}
            disabled={busy || !running}
            onClick={() =>
              run(() => api.inject({ fault_class: fault, severity_rate: severityRate }))
            }
          >
            {FAULT_SHORT[fault]}
          </Button>
        ))}

        <Button
          variant="ghost"
          disabled={busy || !running}
          onClick={() => run(() => api.clearFault())}
        >
          <span className="flex items-center gap-1.5">
            <RotateCcw className="h-3 w-3" /> Clear
          </span>
        </Button>

        <label className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
          Severity rate
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.5}
            value={severityRate}
            onChange={(e) => setSeverityRate(Number(e.target.value))}
            className="w-24 accent-indigo-600"
          />
          <span className="w-8 font-mono text-slate-700">{severityRate.toFixed(1)}×</span>
        </label>
      </div>

      {(error || (status?.active_fault && status.active_fault !== 'NORMAL')) && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-2 text-xs">
          {error && (
            <span className="flex items-center gap-1.5 text-rose-600">
              <AlertTriangle className="h-3 w-3" /> {error}
            </span>
          )}
          {status && status.active_fault !== 'NORMAL' && (
            <span className="font-mono text-slate-600">
              injected {status.active_fault} · severity{' '}
              {(status.fault_severity * 100).toFixed(0)}%
            </span>
          )}
          {active && (
            <span className="ml-auto text-slate-400">{active.description}</span>
          )}
        </div>
      )}
    </div>
  );
}

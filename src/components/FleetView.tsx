/**
 * Fleet readiness and the digital engine passport.
 */

import { useEffect, useState } from 'react';
import { Plane } from 'lucide-react';

import { api } from '../api/client';
import type { EnginePassport, FleetStatus } from '../api/types';
import { FAULT_LABEL, fmt, fmtHours, healthColor } from '../lib/format';
import { Empty, HealthBar, Panel, Stat } from './ui';

export function FleetView() {
  const [fleet, setFleet] = useState<FleetStatus | null>(null);
  const [passport, setPassport] = useState<EnginePassport | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const load = () => api.fleet().then(setFleet).catch(() => setFleet(null));
    void load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.passport(selected).then(setPassport).catch(() => setPassport(null));
  }, [selected]);

  if (!fleet) return <Empty>Could not reach the ground station.</Empty>;

  return (
    <div className="space-y-6">
      <Panel
        title="Squadron readiness"
        subtitle="Health floor, TBO limit and RUL floor — deliberately simple, so it is reproducible by hand"
        actions={
          <div className="text-right">
            <div className="font-mono text-xl font-semibold text-slate-900">
              {fleet.ready_count}/{fleet.total_count}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">ready</div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {fleet.engines.map((engine) => (
            <button
              key={engine.engine_id}
              type="button"
              onClick={() => setSelected(engine.engine_id)}
              className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                selected === engine.engine_id
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plane className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-sm font-semibold text-slate-900">{engine.airframe}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    engine.ready
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {engine.ready ? 'ready' : 'not ready'}
                </span>
              </div>

              <div className="mt-1 font-mono text-[10px] text-slate-500">
                {engine.engine_id} · {engine.status}
              </div>

              <div className="mt-2 flex items-baseline justify-between text-xs">
                <span className="text-slate-600">Health</span>
                <span className={`font-mono font-semibold ${healthColor(engine.health_overall)}`}>
                  {engine.health_overall.toFixed(1)}
                </span>
              </div>
              <div className="mt-1">
                <HealthBar value={engine.health_overall} />
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                <span>{FAULT_LABEL[engine.active_fault]}</span>
                <span>RUL {fmtHours(engine.rul_hours)}</span>
                <span>{fmt(engine.hours_since_overhaul, 0)} h since overhaul</span>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      {passport && (
        <Panel
          title="Digital engine passport"
          subtitle={`${passport.engine_id} · ${passport.model}`}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Serial" value={passport.serial} />
            <Stat label="Total hours" value={fmt(passport.total_hours, 1)} unit="h" />
            <Stat
              label="Since overhaul"
              value={fmt(passport.hours_since_overhaul, 1)}
              unit="h"
              sub={`TBO ${passport.tbo_hours} h`}
            />
            <Stat label="Cycles" value={String(passport.cycles)} sub={`installed ${passport.installed_on}`} />
          </div>

          <h3 className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Life-limited components
          </h3>
          <div className="space-y-2">
            {passport.components.map((component) => (
              <div key={component.name}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-700">{component.name}</span>
                  <span
                    className={`font-mono font-semibold ${healthColor(component.life_remaining_pct)}`}
                  >
                    {component.life_remaining_pct.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1">
                  <HealthBar value={component.life_remaining_pct} />
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  {component.hours_used} of {component.life_limit_hours} h consumed
                </div>
              </div>
            ))}
          </div>

          {passport.maintenance_log.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Maintenance history
              </h3>
              <ul className="space-y-2">
                {passport.maintenance_log.map((entry, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-slate-500">
                      <span className="font-mono">{entry.date}</span>
                      <span>·</span>
                      <span className="font-mono">{entry.hours} h</span>
                      <span className="ml-auto font-mono text-[10px]">{entry.technician}</span>
                    </div>
                    <p className="mt-1 font-medium text-slate-800">{entry.action}</p>
                    <p className="text-[11px] text-slate-600">{entry.finding}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}

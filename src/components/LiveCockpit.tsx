/**
 * The live cockpit: actual, expected, and the gap between them.
 *
 * Every value here comes off the telemetry socket. The panel shows expected
 * alongside actual deliberately — a residual is only meaningful if the operator
 * can see what it was measured against.
 */

import { Activity, Cpu, Gauge, ShieldAlert, Thermometer } from 'lucide-react';

import type { Alert, TelemetryFrame } from '../api/types';
import {
  FAULT_LABEL,
  SUBSYSTEM_LABEL,
  fmt,
  fmtHours,
  fmtSigned,
  healthColor,
} from '../lib/format';
import { Empty, HealthBar, Panel, SeverityBadge, Stat } from './ui';

export function TelemetryGauges({ frame }: { frame: TelemetryFrame }) {
  const { obs, expected, residuals } = frame;
  const chtMax = Math.max(obs.cht1, obs.cht2, obs.cht3, obs.cht4);
  const egtMax = Math.max(obs.egt1, obs.egt2, obs.egt3, obs.egt4);

  return (
    <Panel
      title="Engine telemetry"
      subtitle="Actual, physics-expected, and residual at the current operating point"
      actions={
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-600">
          {frame.phase}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          label="RPM"
          value={fmt(obs.rpm, 0)}
          sub={`exp ${fmt(expected.rpm, 0)} · ${fmtSigned(residuals.res_rpm, 0)}`}
        />
        <Stat
          label="Throttle"
          value={fmt(obs.throttle, 0)}
          unit="%"
          sub={`MAP ${fmt(obs.map, 1)} inHg`}
        />
        <Stat
          label="Altitude"
          value={fmt(obs.altitude, 0)}
          unit="ft"
          sub={`OAT ${fmt(obs.ambient_temp, 1)} °C`}
        />
        <Stat
          label="CHT max"
          value={fmt(chtMax, 1)}
          unit="°C"
          sub={`exp ${fmt(expected.cht, 1)} · ${fmtSigned(residuals.res_cht_max)}`}
          tone={residuals.res_cht_max > 20 ? 'text-rose-600' : 'text-slate-900'}
        />
        <Stat
          label="EGT max"
          value={fmt(egtMax, 0)}
          unit="°C"
          sub={`spread ${fmtSigned(residuals.res_egt_spread, 0)} °C`}
          tone={residuals.res_egt_spread > 40 ? 'text-rose-600' : 'text-slate-900'}
        />
        <Stat
          label="Oil pressure"
          value={fmt(obs.oil_pressure, 2)}
          unit="bar"
          sub={`exp ${fmt(expected.oil_pressure, 2)} · ${fmtSigned(residuals.res_oil_pressure, 2)}`}
          tone={residuals.res_oil_pressure < -0.5 ? 'text-rose-600' : 'text-slate-900'}
        />
        <Stat
          label="Oil temp"
          value={fmt(obs.oil_temp, 1)}
          unit="°C"
          sub={`${fmtSigned(residuals.res_oil_temp)} vs expected`}
        />
        <Stat
          label="Coolant"
          value={fmt(obs.coolant_temp, 1)}
          unit="°C"
          sub={`${fmtSigned(residuals.res_coolant_temp)} vs expected`}
          tone={residuals.res_coolant_temp > 15 ? 'text-rose-600' : 'text-slate-900'}
        />
        <Stat
          label="Fuel flow"
          value={fmt(obs.fuel_flow, 1)}
          unit="L/h"
          sub={`${fmtSigned(residuals.res_fuel_flow)} vs expected`}
        />
        <Stat
          label="Vibration"
          value={fmt(obs.vibration, 2)}
          unit="mm/s"
          sub={`${fmtSigned(residuals.res_vibration, 2)} vs expected`}
          tone={residuals.res_vibration > 1 ? 'text-rose-600' : 'text-slate-900'}
        />
        <Stat label="Bus" value={fmt(obs.bus_voltage, 2)} unit="V" sub={`${fmt(obs.bus_current, 1)} A`} />
        <Stat
          label="Per-cylinder CHT"
          value={[obs.cht1, obs.cht2, obs.cht3, obs.cht4].map((c) => c.toFixed(0)).join(' ')}
          sub="individual heads — divergence is the misfire signature"
        />
      </div>
    </Panel>
  );
}

export function AiAssessmentPanel({ frame }: { frame: TelemetryFrame }) {
  const { ai } = frame;
  const anomalyRatio = ai.anomaly_threshold > 0 ? ai.anomaly_score / ai.anomaly_threshold : 0;

  return (
    <Panel
      title="AI assessment"
      subtitle={`${ai.source.toUpperCase()} inference · ${ai.inference_ms.toFixed(2)} ms this frame`}
      actions={
        ai.warmup ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            warming up
          </span>
        ) : null
      }
    >
      {ai.warmup && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          The five-minute feature window is still filling. Windowed model outputs are not
          reliable until it does, so they are shown but should not be acted on.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <Cpu className="h-3 w-3" /> Classification
          </div>
          <div
            className={`mt-1.5 text-base font-semibold ${
              ai.fault_class === 'NORMAL' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {FAULT_LABEL[ai.fault_class]}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500">
            {(ai.fault_confidence * 100).toFixed(1)}% confidence
          </div>
          {ai.is_sensor_fault && (
            <div className="mt-2 rounded border border-sky-200 bg-sky-50 px-2 py-1.5 text-[11px] leading-snug text-sky-800">
              Instrumentation fault — engine parameters corroborate healthy operation.
              Mission continuation supported.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <Activity className="h-3 w-3" /> Anomaly detector
          </div>
          <div
            className={`mt-1.5 text-base font-semibold ${
              ai.anomaly ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {ai.anomaly ? 'Deviation detected' : 'Within healthy envelope'}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500">
            error {ai.anomaly_score.toFixed(3)} / limit {ai.anomaly_threshold.toFixed(3)}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${ai.anomaly ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, anomalyRatio * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <Gauge className="h-3 w-3" /> Remaining useful life
        </div>
        {ai.rul_hours == null ? (
          <p className="mt-1.5 text-sm text-slate-600">
            <span className="font-semibold text-emerald-600">
              No degradation trend detected.
            </span>{' '}
            RUL is right-censored beyond {ai.rul_horizon_hours.toFixed(0)} h — a point
            estimate here would be invented precision.
          </p>
        ) : (
          <>
            <div className="mt-1.5 font-mono text-2xl font-semibold text-slate-900">
              {fmtHours(ai.rul_hours)}
            </div>
            <div className="mt-1 font-mono text-xs text-slate-500">
              p10–p90 {fmtHours(ai.rul_p10)} – {fmtHours(ai.rul_p90)}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
              Reported as an interval because a single number implies a precision the model
              does not have.
            </p>
          </>
        )}
      </div>
    </Panel>
  );
}

export function SubsystemHealthPanel({ frame }: { frame: TelemetryFrame }) {
  const entries = (Object.keys(SUBSYSTEM_LABEL) as (keyof typeof SUBSYSTEM_LABEL)[]).map(
    (key) => ({ key, label: SUBSYSTEM_LABEL[key], value: frame.health[key] }),
  );

  return (
    <Panel
      title="Subsystem health"
      subtitle="Physics-derived indices, 0–100"
      actions={
        <div className="text-right">
          <div className={`font-mono text-xl font-semibold ${healthColor(frame.health.overall)}`}>
            {frame.health.overall.toFixed(1)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">overall</div>
        </div>
      }
    >
      <div className="space-y-2.5">
        {entries.map(({ key, label, value }) => (
          <div key={key}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-medium text-slate-700">{label}</span>
              <span className={`font-mono text-xs font-semibold ${healthColor(value)}`}>
                {value.toFixed(1)}
              </span>
            </div>
            <HealthBar value={value} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function AlertStack({ alerts }: { alerts: Alert[] }) {
  return (
    <Panel
      title="Active alerts"
      subtitle="Latching — a condition keeps its start time until it recovers"
      actions={
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldAlert className="h-3.5 w-3.5" />
          {alerts.length}
        </span>
      }
    >
      {alerts.length === 0 ? (
        <Empty>No active alerts. All subsystems within limits.</Empty>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.code}
              className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={alert.severity} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  {alert.code}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-snug text-slate-700">{alert.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const RESIDUAL_ROWS: { key: keyof TelemetryFrame['residuals']; label: string; unit: string }[] = [
  { key: 'res_rpm', label: 'RPM', unit: 'rpm' },
  { key: 'res_oil_pressure', label: 'Oil pressure', unit: 'bar' },
  { key: 'res_oil_temp', label: 'Oil temperature', unit: '°C' },
  { key: 'res_cht_max', label: 'CHT (hottest head)', unit: '°C' },
  { key: 'res_egt_max', label: 'EGT (hottest)', unit: '°C' },
  { key: 'res_egt_spread', label: 'EGT spread', unit: '°C' },
  { key: 'res_fuel_flow', label: 'Fuel flow', unit: 'L/h' },
  { key: 'res_vibration', label: 'Vibration', unit: 'mm/s' },
  { key: 'res_coolant_temp', label: 'Coolant temperature', unit: '°C' },
];

export function ResidualTable({ frame }: { frame: TelemetryFrame }) {
  return (
    <Panel
      title="Physics residuals"
      subtitle="residual = actual − physics-expected. This is the feature space every model consumes."
      actions={<Thermometer className="h-4 w-4 text-slate-400" />}
    >
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
            <th className="pb-2 font-medium">Channel</th>
            <th className="pb-2 text-right font-medium">Residual</th>
            <th className="pb-2 pl-3 font-medium">Deviation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {RESIDUAL_ROWS.map(({ key, label, unit }) => {
            const value = frame.residuals[key];
            const magnitude = Math.min(Math.abs(value) / (unit === '°C' ? 40 : 2), 1);
            return (
              <tr key={key}>
                <td className="py-1.5 text-slate-700">{label}</td>
                <td
                  className={`py-1.5 text-right font-mono font-semibold ${
                    magnitude > 0.5 ? 'text-rose-600' : 'text-slate-700'
                  }`}
                >
                  {fmtSigned(value, 2)}
                  <span className="ml-1 font-normal text-slate-400">{unit}</span>
                </td>
                <td className="py-1.5 pl-3">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        magnitude > 0.5 ? 'bg-rose-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${magnitude * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

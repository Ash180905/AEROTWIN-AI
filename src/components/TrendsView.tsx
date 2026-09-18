/**
 * Degradation trends over the live sortie.
 *
 * Drawn from the store's history buffer, which holds what this browser has
 * actually received. If the downlink was cut, the gap is real and is not
 * interpolated away — a chart that hides a telemetry outage is lying about the
 * mission.
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useTwinStore } from '../store/twinStore';
import { Empty, Panel } from './ui';

const AXIS = { stroke: '#94a3b8', fontSize: 11 };
const GRID = '#e2e8f0';

export function TrendsView() {
  const history = useTwinStore((s) => s.history);

  if (history.length < 2) {
    return <Empty>Collecting telemetry. Trends appear once a few frames have arrived.</Empty>;
  }

  const data = history.map((frame) => ({
    t: Number((frame.sim_time_s / 3600).toFixed(3)),
    overall: frame.health.overall,
    cooling: frame.health.cooling,
    lubrication: frame.health.lubrication,
    combustion: frame.health.combustion,
    mechanical: frame.health.mechanical,
    anomaly: frame.ai.anomaly_score,
    threshold: frame.ai.anomaly_threshold,
    rul: frame.ai.rul_hours,
    chtResidual: frame.residuals.res_cht_max,
    coolantResidual: frame.residuals.res_coolant_temp,
    vibrationResidual: frame.residuals.res_vibration,
    oilPressureResidual: frame.residuals.res_oil_pressure,
  }));

  const hasRul = data.some((d) => d.rul != null);

  return (
    <div className="space-y-6">
      <Panel
        title="Subsystem health trajectory"
        subtitle={`${history.length} frames received this sortie`}
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="t" {...AXIS} unit=" h" />
            <YAxis domain={[0, 100]} {...AXIS} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="overall" stroke="#0f172a" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="cooling" stroke="#0ea5e9" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="lubrication" stroke="#8b5cf6" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="combustion" stroke="#f97316" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="mechanical" stroke="#10b981" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-[11px] text-slate-500">
          Amber line is the 70% caution trip point. Black is the weighted overall index.
        </p>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Anomaly score against its limit"
          subtitle="Reconstruction error from the autoencoder — set from healthy data, not a redline"
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" {...AXIS} unit=" h" />
              <YAxis {...AXIS} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="anomaly" stroke="#e11d48" dot={false} strokeWidth={2} />
              <Line
                type="monotone"
                dataKey="threshold"
                stroke="#94a3b8"
                dot={false}
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Physics residuals"
          subtitle="Deviation from what a healthy engine would do at this operating point"
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" {...AXIS} unit=" h" />
              <YAxis {...AXIS} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <ReferenceLine y={0} stroke="#64748b" />
              <Line type="monotone" dataKey="chtResidual" stroke="#f97316" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="coolantResidual" stroke="#0ea5e9" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="vibrationResidual" stroke="#10b981" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="oilPressureResidual" stroke="#8b5cf6" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel
        title="Remaining useful life"
        subtitle={
          hasRul
            ? 'Published only once degradation exists to extrapolate'
            : 'Not published — no degradation trend detected, so RUL is right-censored'
        }
      >
        {hasRul ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" {...AXIS} unit=" h" />
              <YAxis {...AXIS} unit=" h" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <ReferenceLine y={2} stroke="#e11d48" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="rul" stroke="#4f46e5" dot={false} strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty>
            The engine shows no degradation trend, so a point estimate of remaining life
            would be invented precision.
          </Empty>
        )}
      </Panel>
    </div>
  );
}

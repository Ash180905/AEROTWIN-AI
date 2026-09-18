/**
 * Mission replay and post-flight report.
 *
 * Frames come back from the backend's mission store exactly as they were sent
 * live, so a replayed frame is the frame the operator saw — there is no
 * reconstruction step that could quietly differ from it.
 */

import { useCallback, useEffect, useState } from 'react';
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
import { Clock, FileText } from 'lucide-react';

import { api } from '../api/client';
import type { MissionReport, MissionSummary, TelemetryFrame } from '../api/types';
import { FAULT_LABEL, fmt, fmtDuration, fmtHours, healthColor } from '../lib/format';
import { Button, Empty, Panel, SeverityBadge, Stat } from './ui';

export function ReplayView() {
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [frames, setFrames] = useState<TelemetryFrame[]>([]);
  const [report, setReport] = useState<MissionReport | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.missions().then(setMissions).catch(() => setMissions([]));
  }, []);

  const open = useCallback(async (flightId: string) => {
    setLoading(true);
    setSelected(flightId);
    try {
      const [replay, missionReport] = await Promise.all([
        api.replay(flightId, 0, undefined, 600),
        api.report(flightId),
      ]);
      setFrames(replay.frames);
      setReport(missionReport);
      setIndex(0);
    } catch {
      setFrames([]);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const frame = frames[index];

  return (
    <div className="space-y-6">
      <Panel title="Recorded missions" subtitle="Every frame of every sortie, kept for post-flight analysis">
        {missions.length === 0 ? (
          <Empty>
            No recorded missions. Run{' '}
            <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[11px]">
              python -m scripts.seed_missions
            </code>{' '}
            on the backend, or fly a sortie.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="pb-2 font-medium">Flight</th>
                  <th className="pb-2 font-medium">Scenario</th>
                  <th className="pb-2 text-right font-medium">Frames</th>
                  <th className="pb-2 text-right font-medium">Min health</th>
                  <th className="pb-2 pl-3 font-medium">Peak fault</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {missions.map((mission) => (
                  <tr
                    key={mission.flight_id}
                    className={selected === mission.flight_id ? 'bg-indigo-50/60' : ''}
                  >
                    <td className="py-2 font-mono text-slate-700">{mission.flight_id}</td>
                    <td className="py-2 text-slate-600">
                      {mission.scenario.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-600">
                      {mission.frames}
                    </td>
                    <td
                      className={`py-2 text-right font-mono font-semibold ${healthColor(
                        mission.min_health,
                      )}`}
                    >
                      {mission.min_health.toFixed(1)}
                    </td>
                    <td className="py-2 pl-3 text-slate-700">
                      {FAULT_LABEL[mission.peak_fault]}
                    </td>
                    <td className="py-2 text-right">
                      <Button onClick={() => void open(mission.flight_id)} disabled={loading}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {frame && (
        <Panel
          title="Timeline scrubber"
          subtitle={`${selected} · frame ${index + 1} of ${frames.length}`}
          actions={
            <span className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {fmtDuration(frame.sim_time_s)}
            </span>
          }
        >
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              label="Overall health"
              value={frame.health.overall.toFixed(1)}
              tone={healthColor(frame.health.overall)}
            />
            <Stat label="Classification" value={FAULT_LABEL[frame.ai.fault_class]} />
            <Stat
              label="RUL"
              value={frame.ai.rul_hours == null ? 'censored' : fmtHours(frame.ai.rul_hours)}
              sub={
                frame.ai.rul_hours == null
                  ? 'no degradation trend'
                  : `p10–p90 ${fmtHours(frame.ai.rul_p10)} – ${fmtHours(frame.ai.rul_p90)}`
              }
            />
            <Stat
              label="CHT max residual"
              value={fmt(frame.residuals.res_cht_max, 1)}
              unit="°C"
            />
          </div>

          {frame.alerts.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {frame.alerts.map((alert) => (
                <li key={alert.code} className="flex flex-wrap items-center gap-2 text-xs">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-slate-700">{alert.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {report && <ReportPanel report={report} />}
    </div>
  );
}

function ReportPanel({ report }: { report: MissionReport }) {
  const trend = report.health_trend.sim_time_s.map((t, i) => ({
    t: Number((t / 3600).toFixed(3)),
    overall: report.health_trend.overall[i],
  }));

  return (
    <Panel
      title="Post-flight health report"
      subtitle="What the maintenance team reads once the aircraft is back"
      actions={<FileText className="h-4 w-4 text-slate-400" />}
    >
      {trend.length > 1 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke="#94a3b8" fontSize={11} unit=" h" />
            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="overall" stroke="#0f172a" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {report.notes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {report.notes.map((note, i) => (
            <li
              key={i}
              className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-snug text-sky-900"
            >
              {note}
            </li>
          ))}
        </ul>
      )}

      {report.fault_timeline.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Condition timeline — first appearance of each
          </h3>
          <ul className="space-y-1.5">
            {report.fault_timeline.map((alert) => (
              <li key={alert.code} className="flex flex-wrap items-center gap-2 text-xs">
                <SeverityBadge severity={alert.severity} />
                <span className="font-mono text-[10px] text-slate-400">{alert.code}</span>
                <span className="text-slate-700">{alert.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.advisories.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Maintenance actions
          </h3>
          <ul className="space-y-2">
            {report.advisories.map((advisory, i) => (
              <li key={i} className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={advisory.urgency} />
                </div>
                <p className="mt-1.5 text-xs font-medium text-slate-800">{advisory.action}</p>
                <p className="mt-1 text-[11px] text-slate-600">{advisory.rationale}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

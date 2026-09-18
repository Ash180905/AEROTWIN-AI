/**
 * Advisory, counterfactuals, explainability and the engine-vs-sensor argument.
 *
 * These are pulled on demand rather than pushed with every frame: a
 * counterfactual runs several forward simulations on the backend, and an
 * operator asks for one at a decision point, not sixty times a minute.
 */

import { useCallback, useEffect, useState } from 'react';
import { Brain, Compass, RefreshCw, Stethoscope } from 'lucide-react';

import { api, ApiError } from '../api/client';
import type { AdvisoryResponse, Explanation, SensorEvidence } from '../api/types';
import { featureLabel, fmtHours, fmtSigned } from '../lib/format';
import { useTwinStore } from '../store/twinStore';
import { Button, Empty, Panel, SeverityBadge } from './ui';

export function AnalysisView() {
  const frame = useTwinStore((s) => s.frame);
  const running = useTwinStore((s) => s.status?.running ?? false);

  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [evidence, setEvidence] = useState<SensorEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, x, s] = await Promise.all([
        api.advisory(),
        api.explain(),
        api.sensorEvidence(),
      ]);
      setAdvisory(a);
      setExplanation(x);
      setEvidence(s);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'No mission is running. Start one to request an advisory.'
          : 'Could not reach the ground station.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (running) void load();
  }, [running, load]);

  if (!running) {
    return <Empty>No mission running. Start a sortie to request analysis.</Empty>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Computed on request against the live twin
          {frame && ` · sortie time ${(frame.sim_time_s / 3600).toFixed(2)} h`}
        </p>
        <Button onClick={() => void load()} disabled={loading}>
          <span className="flex items-center gap-1.5">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </span>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {evidence && <SensorEvidencePanel evidence={evidence} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {advisory && <CounterfactualPanel advisory={advisory} />}
        {advisory && <MaintenancePanel advisory={advisory} />}
      </div>

      {explanation && <ExplanationPanel explanation={explanation} />}
    </div>
  );
}

function SensorEvidencePanel({ evidence }: { evidence: SensorEvidence }) {
  return (
    <Panel
      title="Engine fault or instrumentation fault?"
      subtitle="A false abort on a healthy engine costs a sortie. This is the evidence behind the call."
      actions={<Stethoscope className="h-4 w-4 text-slate-400" />}
    >
      <div
        className={`rounded-lg border px-4 py-3 ${
          evidence.is_sensor_fault
            ? 'border-sky-300 bg-sky-50'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="text-sm font-semibold text-slate-900">{evidence.verdict}</div>
        <div className="mt-1 font-mono text-xs text-slate-600">
          instrumentation probability {(evidence.sensor_fault_prob * 100).toFixed(1)}%
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">{evidence.explanation}</p>

      <table className="mt-3 w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
            <th className="pb-2 font-medium">Corroboration feature</th>
            <th className="pb-2 text-right font-medium">Value</th>
            <th className="pb-2 text-right font-medium">Contribution</th>
            <th className="pb-2 pl-3 font-medium">Points to</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {evidence.evidence.map((item) => (
            <tr key={item.feature}>
              <td className="py-1.5 text-slate-700">{featureLabel(item.feature)}</td>
              <td className="py-1.5 text-right font-mono text-slate-600">
                {item.value.toFixed(2)}
              </td>
              <td className="py-1.5 text-right font-mono font-semibold text-slate-800">
                {fmtSigned(item.contribution, 2)}
              </td>
              <td className="py-1.5 pl-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    item.direction === 'sensor'
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.direction}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function CounterfactualPanel({ advisory }: { advisory: AdvisoryResponse }) {
  return (
    <Panel
      title="In-flight options"
      subtitle="Each option is a real forward simulation of the current engine, not a lookup table"
      actions={<Compass className="h-4 w-4 text-slate-400" />}
    >
      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-600">Mission completion probability</span>
          <span
            className={`font-mono text-lg font-semibold ${
              advisory.mission_completion_prob > 0.7
                ? 'text-emerald-600'
                : advisory.mission_completion_prob > 0.4
                  ? 'text-amber-600'
                  : 'text-rose-600'
            }`}
          >
            {(advisory.mission_completion_prob * 100).toFixed(0)}%
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500">
          {fmtHours(advisory.remaining_mission_hours)} of sortie remaining
        </div>
      </div>

      <ul className="space-y-2">
        {advisory.options.map((option) => (
          <li
            key={option.action}
            className={`rounded-lg border px-3 py-2.5 ${
              option.recommended
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-800">
                {option.action.replace(/_/g, ' ')}
              </span>
              {option.recommended && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  recommended
                </span>
              )}
              <span className="ml-auto font-mono text-xs text-slate-600">
                {fmtHours(option.projected_rul_hours)}
                {option.rul_delta_hours !== 0 && (
                  <span
                    className={
                      option.rul_delta_hours > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }
                  >
                    {' '}
                    ({fmtSigned(option.rul_delta_hours, 2)} h)
                  </span>
                )}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">
              {option.description}
            </p>
            <div className="mt-1 text-[11px] text-slate-500">
              completion {(option.mission_completion_prob * 100).toFixed(0)}%
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function MaintenancePanel({ advisory }: { advisory: AdvisoryResponse }) {
  return (
    <Panel
      title="Maintenance advisory"
      subtitle="Explicit rules with their physical rationale — an engineer has to sign for this work"
    >
      {advisory.maintenance.length === 0 ? (
        <Empty>No maintenance action indicated.</Empty>
      ) : (
        <ul className="space-y-3">
          {advisory.maintenance.map((item, index) => (
            <li key={index} className="rounded-lg border border-slate-200 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={item.urgency} />
                {item.deadline_hours != null && (
                  <span className="font-mono text-[11px] text-slate-500">
                    within {fmtHours(item.deadline_hours)}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs font-medium text-slate-800">{item.action}</p>
              <p className="mt-1 text-[11px] leading-snug text-slate-600">{item.rationale}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ExplanationPanel({ explanation }: { explanation: Explanation }) {
  const max = Math.max(...explanation.attributions.map((a) => Math.abs(a.contribution)), 1e-9);

  return (
    <Panel
      title="Why the model said that"
      subtitle={explanation.narrative}
      actions={
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            explanation.source === 'tree_shap'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-300 bg-slate-50 text-slate-600'
          }`}
        >
          {explanation.source === 'tree_shap' ? 'exact TreeSHAP' : 'gain-weighted estimate'}
        </span>
      }
    >
      {explanation.source === 'gain_weighted' && (
        <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-600">
          <Brain className="mr-1 inline h-3 w-3" />
          This is a gain-weighted approximation, not a SHAP value. The ground station is
          running without the training extra installed, and an approximation presented as an
          exact attribution would be worse than none.
        </p>
      )}

      <ul className="space-y-2">
        {explanation.attributions.map((attribution) => {
          const width = (Math.abs(attribution.contribution) / max) * 100;
          const positive = attribution.contribution > 0;
          return (
            <li key={attribution.feature} className="text-xs">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-700">{featureLabel(attribution.feature)}</span>
                <span className="shrink-0 font-mono text-[11px] text-slate-500">
                  {fmtSigned(attribution.contribution, 3)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${positive ? 'bg-rose-500' : 'bg-sky-500'}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-slate-500">
        Red raises the predicted class, blue lowers it.
      </p>
    </Panel>
  );
}

/**
 * The evidence pack.
 *
 * Which models are loaded, how they scored, what was validated externally, and
 * what has not been demonstrated — all served by the backend itself. A panel
 * asking how this system was validated gets the same answer from the software
 * as from the team, which is the point of putting it on screen.
 */

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Database } from 'lucide-react';

import { api } from '../api/client';
import type { CmapssReport, Limitations, SystemHealth } from '../api/types';
import { Empty, Panel, Stat } from './ui';

export function EvidenceView() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [limitations, setLimitations] = useState<Limitations | null>(null);
  const [cmapss, setCmapss] = useState<Record<string, CmapssReport> | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    api.limitations().then(setLimitations).catch(() => setLimitations(null));
    api.cmapss().then(setCmapss).catch(() => setCmapss(null));
  }, []);

  if (!health) return <Empty>Could not reach the ground station.</Empty>;

  const totalKb = health.models.reduce((sum, m) => sum + m.size_kb, 0);
  const edgeKb = health.models
    .filter((m) => m.tier === 'edge')
    .reduce((sum, m) => sum + m.size_kb, 0);

  return (
    <div className="space-y-6">
      <Panel
        title="Loaded models"
        subtitle={`Inference tier: ${health.inference_tier} · CAN bus: ${health.can_bus}`}
        actions={<Database className="h-4 w-4 text-slate-400" />}
      >
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Models loaded" value={String(health.models.length)} />
          <Stat label="Total payload" value={(totalKb / 1024).toFixed(1)} unit="MB" />
          <Stat
            label="Edge tier"
            value={(edgeKb / 1024).toFixed(2)}
            unit="MB"
            sub="what an onboard computer carries"
          />
          <Stat label="Version" value={health.version} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
                <th className="pb-2 font-medium">Model</th>
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 text-right font-medium">Size</th>
                <th className="pb-2 pl-3 font-medium">Headline metrics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {health.models.map((model) => (
                <tr key={model.name}>
                  <td className="py-2 font-mono text-slate-700">{model.name}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        model.tier === 'edge'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {model.tier}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono text-slate-600">
                    {model.size_kb < 1024
                      ? `${model.size_kb.toFixed(1)} KB`
                      : `${(model.size_kb / 1024).toFixed(1)} MB`}
                  </td>
                  <td className="py-2 pl-3 font-mono text-[11px] text-slate-600">
                    {Object.entries(model.metrics)
                      .filter(([, v]) => v != null)
                      .map(([k, v]) => `${k.replace(/_/g, ' ')} ${Number(v).toFixed(3)}`)
                      .join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {cmapss && (
        <Panel
          title="External benchmark — NASA C-MAPSS"
          subtitle="The one result measured on data this team did not construct"
          actions={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="pb-2 font-medium">Subset</th>
                  <th className="pb-2 text-right font-medium">Test RMSE</th>
                  <th className="pb-2 text-right font-medium">MAE</th>
                  <th className="pb-2 text-right font-medium">p10–p90 coverage</th>
                  <th className="pb-2 text-right font-medium">Test units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(cmapss).map(([subset, report]) => (
                  <tr key={subset}>
                    <td className="py-2 font-mono font-semibold text-slate-700">{subset}</td>
                    <td className="py-2 text-right font-mono text-slate-800">
                      {report.rmse_cycles.toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-600">
                      {report.mae_cycles.toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-600">
                      {report.interval_coverage_p10_p90.toFixed(3)}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-600">
                      {report.test_units}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {cmapss.FD001 && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
              <p className="font-semibold">
                FD001 RMSE {cmapss.FD001.rmse_cycles.toFixed(2)} cycles, against published
                results of{' '}
                {Object.entries(cmapss.FD001.literature_rmse_fd001)
                  .map(([name, value]) => `${value} (${name})`)
                  .join(', ')}
                .
              </p>
              <p className="mt-1 leading-snug">
                C-MAPSS is a turbofan — the method transfers, the piston models do not. The
                interval calibrating at nominal here locates the 0.75 coverage on our own
                corpus as a simulator artefact rather than a flaw in the method.
              </p>
            </div>
          )}
        </Panel>
      )}

      {limitations && (
        <Panel
          title="What this system has not demonstrated"
          subtitle="Served by the backend itself, not written into this page"
          actions={<AlertCircle className="h-4 w-4 text-amber-500" />}
        >
          <div className="space-y-3 text-xs leading-relaxed">
            <Block label="Training data" body={limitations.training_data} />
            <Block
              label="Why the internal metrics are honest"
              body={limitations.validation_is_internally_honest}
            />
            <Block label="What is unproven" body={limitations.what_is_unproven} tone="amber" />

            {Object.entries(limitations.external_validation_outstanding).map(([key, body]) => (
              <Block key={key} label={`Outstanding — ${key}`} body={body} tone="amber" />
            ))}

            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                How the gap would be closed
              </div>
              <ul className="list-inside list-disc space-y-1 text-slate-700">
                {limitations.how_it_would_be_closed.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Known model issues
              </div>
              <ul className="list-inside list-disc space-y-1 text-slate-700">
                {limitations.known_model_issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Block({
  label,
  body,
  tone = 'slate',
}: {
  label: string;
  body: string;
  tone?: 'slate' | 'amber';
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        tone === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <p className={tone === 'amber' ? 'text-amber-900' : 'text-slate-700'}>{body}</p>
    </div>
  );
}

import { Suspense, lazy, useEffect, useState } from 'react';
import {
  Activity,
  Boxes,
  FileSearch,
  Plane,
  Radio,
  ShieldCheck,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { AnalysisView } from './components/AnalysisView';
import { EvidenceView } from './components/EvidenceView';
import { FleetView } from './components/FleetView';
import {
  AiAssessmentPanel,
  AlertStack,
  ResidualTable,
  SubsystemHealthPanel,
  TelemetryGauges,
} from './components/LiveCockpit';
import { MissionControlBar } from './components/MissionControlBar';
import { ReplayView } from './components/ReplayView';
import { TrendsView } from './components/TrendsView';
import { Empty } from './components/ui';
import { useTwinStore } from './store/twinStore';

/**
 * Three.js is the single largest dependency and only one tab needs it, so the
 * 3D scene loads on demand. The cockpit — the view an operator opens first —
 * does not pay for a renderer it is not showing.
 */
const Engine3DView = lazy(() =>
  import('./components/Engine3DView').then((m) => ({ default: m.Engine3DView })),
);

type Tab = 'cockpit' | 'twin3d' | 'trends' | 'analysis' | 'replay' | 'fleet' | 'evidence';

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: 'cockpit', label: 'Live cockpit', icon: Activity },
  { id: 'twin3d', label: '3D twin', icon: Boxes },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'analysis', label: 'Diagnosis & advisory', icon: ShieldCheck },
  { id: 'replay', label: 'Mission replay', icon: FileSearch },
  { id: 'fleet', label: 'Fleet', icon: Plane },
  { id: 'evidence', label: 'Evidence', icon: Radio },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('cockpit');

  const connect = useTwinStore((s) => s.connect);
  const disconnect = useTwinStore((s) => s.disconnect);
  const connection = useTwinStore((s) => s.connection);
  const frame = useTwinStore((s) => s.frame);
  const status = useTwinStore((s) => s.status);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const downlinkCut = status?.downlink_up === false;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900">
              AeroTwin — Aero Piston Engine Digital Twin
            </h1>
            <p className="text-[11px] text-slate-500">
              MALE UAV propulsion health monitoring · SIH 2026 / 26054 · DRDO
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3 text-xs">
            {frame && (
              <span className="hidden font-mono text-slate-500 sm:inline">
                {frame.engine_id}
              </span>
            )}
            <ConnectionPill state={connection} />
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                tab === id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {downlinkCut && (
        <div className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Downlink cut. The onboard edge node is still acquiring and assessing; frames are
          buffered and will backfill when the link is restored.
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6">
        {tab === 'cockpit' && (
          <>
            <MissionControlBar />
            {frame ? (
              <div className="space-y-6">
                <TelemetryGauges frame={frame} />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <AiAssessmentPanel frame={frame} />
                  </div>
                  <SubsystemHealthPanel frame={frame} />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <ResidualTable frame={frame} />
                  <AlertStack alerts={frame.alerts} />
                </div>
              </div>
            ) : (
              <Empty>
                {connection === 'open'
                  ? 'Connected. Start a mission to begin streaming telemetry.'
                  : 'Connecting to the ground station…'}
              </Empty>
            )}
          </>
        )}

        {tab === 'twin3d' && (
          <Suspense fallback={<Empty>Loading the 3D engine…</Empty>}>
            <Engine3DView />
          </Suspense>
        )}
        {tab === 'trends' && <TrendsView />}
        {tab === 'analysis' && <AnalysisView />}
        {tab === 'replay' && <ReplayView />}
        {tab === 'fleet' && <FleetView />}
        {tab === 'evidence' && <EvidenceView />}
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <span>
            Every value shown is computed by the ground station from physics residuals —
            nothing on this page is simulated in the browser.
          </span>
          {frame && (
            <span className="font-mono">
              {frame.ai.source} inference · {frame.ai.inference_ms.toFixed(2)} ms/frame
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

function ConnectionPill({ state }: { state: 'connecting' | 'open' | 'closed' }) {
  const config = {
    open: { label: 'Telemetry live', className: 'bg-emerald-50 text-emerald-700 border-emerald-300', Icon: Wifi },
    connecting: { label: 'Connecting', className: 'bg-amber-50 text-amber-700 border-amber-300', Icon: Wifi },
    closed: { label: 'Disconnected', className: 'bg-rose-50 text-rose-700 border-rose-300', Icon: WifiOff },
  }[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}
    >
      <config.Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

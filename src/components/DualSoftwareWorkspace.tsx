import React, { useState } from 'react';
import { 
  EngineTelemetry, 
  PhysicsExpectedModel, 
  EngineSubsystemHealth, 
  FaultDiagnosis, 
  FaultPreset,
  CounterfactualOption,
  UAVFleetItem
} from '../types';
import { FaultInjectorBar } from './FaultInjectorBar';
import { TelemetryGaugesBar } from './TelemetryGaugesBar';
import { DigitalTwinCanvas } from './DigitalTwinCanvas';
import { SubsystemHealthPanel } from './SubsystemHealthPanel';
import { ResidualAnalysisView } from './ResidualAnalysisView';
import { RulMissionReliability } from './RulMissionReliability';
import { CounterfactualAdvisor } from './CounterfactualAdvisor';
import { XaiDiagnosisPanel } from './XaiDiagnosisPanel';
import { Dedicated3DTwinView } from './Dedicated3DTwinView';
import { 
  Cpu, 
  Box, 
  Radio, 
  ArrowRightLeft, 
  Zap, 
  Activity, 
  ExternalLink, 
  Maximize2,
  Minimize2,
  Flame,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface DualSoftwareWorkspaceProps {
  telemetry: EngineTelemetry;
  physics: PhysicsExpectedModel;
  health: EngineSubsystemHealth;
  diagnosis: FaultDiagnosis;
  activePreset: FaultPreset;
  onSelectPreset: (preset: FaultPreset) => void;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  simSpeed: number;
  setSimSpeed: React.Dispatch<React.SetStateAction<number>>;
  onReset: () => void;
  onThrottleChange: (val: number) => void;
  onAltitudeChange: (val: number) => void;
  onApplyOption: (opt: CounterfactualOption) => void;
  rul: any;
  reliability: any;
  counterfactualOptions: CounterfactualOption[];
  onOpenDedicatedTab: () => void;
  onPopoutWindow: () => void;
  onBroadcastEvent: (type: string, payload: any) => void;
}

export const DualSoftwareWorkspace: React.FC<DualSoftwareWorkspaceProps> = ({
  telemetry,
  physics,
  health,
  diagnosis,
  activePreset,
  onSelectPreset,
  isRunning,
  setIsRunning,
  simSpeed,
  setSimSpeed,
  onReset,
  onThrottleChange,
  onAltitudeChange,
  onApplyOption,
  rul,
  reliability,
  counterfactualOptions,
  onOpenDedicatedTab,
  onPopoutWindow,
  onBroadcastEvent
}) => {
  const [activeLeftTab, setActiveLeftTab] = useState<'cockpit' | 'residuals' | 'xai' | 'counterfactual'>('cockpit');

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Inter-Software Central Bus Connection Banner */}
      <div className="p-3 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/40 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-wide uppercase font-mono">
                DUAL INTEGRATED SOFTWARE SUITE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                50 Hz IPC BUS SYNCHRONIZED
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Left: <strong className="text-indigo-300">AeroTwin AI Diagnostic Commander</strong> ↔ Right: <strong className="text-cyan-300">3D Virtual Twin Workstation</strong>. Any fault or throttle change on the left physically transforms the 3D twin in real time!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-popout-dual"
            onClick={onPopoutWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 rounded-xl text-xs font-semibold text-indigo-200 transition cursor-pointer"
            title="Pop out 3D Virtual Twin to second monitor"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-300" />
            <span>Pop-Out 3D (Dual Monitor)</span>
          </button>
          <button
            onClick={onOpenDedicatedTab}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-300 transition cursor-pointer"
            title="Switch to full-screen 3D Twin workstation"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full 3D Workstation</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Dual Software Layout (2 equal/balanced columns) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* ================= LEFT SOFTWARE: AEROTWIN AI COMMAND SUITE ================= */}
        <div className="xl:col-span-6 flex flex-col space-y-4 bg-white/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-lg">
          {/* Software 1 Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 font-mono flex items-center gap-1.5">
                  AEROTWIN AI COMMANDER
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    DIAGNOSTICS
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Physics Residuals & Fault Injection Controller
                </div>
              </div>
            </div>

            {/* Sub-view switcher for Left Pane */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setActiveLeftTab('cockpit')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeLeftTab === 'cockpit' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cockpit
              </button>
              <button
                onClick={() => setActiveLeftTab('residuals')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeLeftTab === 'residuals' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Residuals
              </button>
              <button
                onClick={() => setActiveLeftTab('xai')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeLeftTab === 'xai' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                XAI
              </button>
              <button
                onClick={() => setActiveLeftTab('counterfactual')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeLeftTab === 'counterfactual' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Counterfactual
              </button>
            </div>
          </div>

          {/* Fault Injector Bar (Directly drives right side 3D model!) */}
          <FaultInjectorBar
            activePreset={activePreset}
            onSelectPreset={onSelectPreset}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            simSpeed={simSpeed}
            setSimSpeed={setSimSpeed}
            onReset={onReset}
            telemetry={telemetry}
            onThrottleChange={onThrottleChange}
            onAltitudeChange={onAltitudeChange}
          />

          {/* Telemetry Gauges Bar */}
          <TelemetryGaugesBar
            telemetry={telemetry}
            physics={physics}
          />

          {/* Sub-views for Left Pane */}
          {activeLeftTab === 'cockpit' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DigitalTwinCanvas
                  telemetry={telemetry}
                  physics={physics}
                  health={health}
                  diagnosis={diagnosis}
                  onOpenDedicated3D={onOpenDedicatedTab}
                />
                <SubsystemHealthPanel
                  health={health}
                  diagnosis={diagnosis}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResidualAnalysisView
                  telemetry={telemetry}
                  physics={physics}
                />
                <RulMissionReliability
                  rul={rul}
                  reliability={reliability}
                  diagnosis={diagnosis}
                />
              </div>
            </div>
          )}

          {activeLeftTab === 'residuals' && (
            <ResidualAnalysisView
              telemetry={telemetry}
              physics={physics}
            />
          )}

          {activeLeftTab === 'xai' && (
            <XaiDiagnosisPanel
              diagnosis={diagnosis}
            />
          )}

          {activeLeftTab === 'counterfactual' && (
            <CounterfactualAdvisor
              options={counterfactualOptions}
              telemetry={telemetry}
              diagnosis={diagnosis}
              onApplyOption={onApplyOption}
            />
          )}
        </div>

        {/* ================= RIGHT SOFTWARE: 3D VIRTUAL TWIN WORKSTATION ================= */}
        <div className="xl:col-span-6 flex flex-col space-y-4">
          <Dedicated3DTwinView
            telemetry={telemetry}
            physics={physics}
            health={health}
            diagnosis={diagnosis}
            activePreset={activePreset}
            onSelectPreset={onSelectPreset}
            onThrottleChange={onThrottleChange}
            onAltitudeChange={onAltitudeChange}
            onReset={onReset}
            onBroadcastEvent={onBroadcastEvent}
            isDualPane={true}
          />
        </div>
      </div>
    </div>
  );
};

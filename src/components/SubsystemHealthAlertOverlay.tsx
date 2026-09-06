import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  ShieldAlert, 
  Wrench, 
  Droplets, 
  Flame, 
  Thermometer, 
  X, 
  RotateCcw, 
  ArrowRight, 
  Sparkles, 
  RadioTower, 
  CheckCircle2, 
  Activity,
  BellRing,
  Cog,
  Zap,
  Fuel
} from 'lucide-react';
import { 
  EngineSubsystemHealth, 
  FaultPreset, 
  FaultDiagnosis, 
  EngineTelemetry 
} from '../types';

interface SubsystemHealthAlertOverlayProps {
  health: EngineSubsystemHealth;
  activePreset: FaultPreset;
  diagnosis: FaultDiagnosis;
  telemetry: EngineTelemetry;
  onResetPreset?: () => void;
  onNavigateToTab?: (tab: 'counterfactual' | 'twin') => void;
}

interface FaultSummaryMeta {
  title: string;
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'ADVISORY' | 'NORMAL';
  icon: React.ReactNode;
  summary: string;
  telemetrySignatures: { label: string; value: string; status: 'bad' | 'warn' | 'nominal' }[];
  riskHorizon: string;
  immediateCountermeasure: string;
}

export const SubsystemHealthAlertOverlay: React.FC<SubsystemHealthAlertOverlayProps> = ({
  health,
  activePreset,
  diagnosis,
  telemetry,
  onResetPreset,
  onNavigateToTab,
}) => {
  // Determine which subsystems are below 70%
  const subsystemEntries = [
    { key: 'combustion', label: 'Combustion Chamber', score: health.combustion, icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'lubrication', label: 'Lubrication & Oil Film', score: health.lubrication, icon: <Droplets className="w-3.5 h-3.5" /> },
    { key: 'cooling', label: 'Thermal Cooling System', score: health.cooling, icon: <Thermometer className="w-3.5 h-3.5" /> },
    { key: 'fuelSystem', label: 'Fuel Injection Rail', score: health.fuelSystem, icon: <Fuel className="w-3.5 h-3.5" /> },
    { key: 'mechanical', label: 'Mechanical & Bearings', score: health.mechanical, icon: <Cog className="w-3.5 h-3.5" /> },
    { key: 'electrical', label: 'ECU & Sensor Bus', score: health.electrical, icon: <Zap className="w-3.5 h-3.5" /> },
  ] as const;

  const degradedSubsystems = subsystemEntries.filter(s => s.score < 70);
  const isTriggerConditionMet = degradedSubsystems.length > 0 || health.overallHealthIndex < 70;

  // Overlay state: auto-opens when condition is met, can be dismissed/reopened
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [lastTriggeredPreset, setLastTriggeredPreset] = useState<FaultPreset | null>(null);
  const [dismissedPreset, setDismissedPreset] = useState<FaultPreset | null>(null);

  // Auto-trigger whenever condition is met and preset changes or newly triggered
  useEffect(() => {
    if (isTriggerConditionMet) {
      // If new preset triggered or wasn't previously triggered
      if (activePreset !== dismissedPreset) {
        setIsOpen(true);
        setLastTriggeredPreset(activePreset);
      }
    } else {
      // Once health recovers above 70% across all subsystems
      setIsOpen(false);
      setDismissedPreset(null);
    }
  }, [isTriggerConditionMet, activePreset, dismissedPreset]);

  // Preset summary details
  const getPresetMeta = (preset: FaultPreset): FaultSummaryMeta => {
    switch (preset) {
      case 'BEARING_LUBRICATION':
        return {
          title: 'Bearing & Oil Degradation',
          category: 'Hydrodynamic Mechanical Breakdown',
          severity: 'CRITICAL',
          icon: <Wrench className="w-4 h-4 text-rose-600" />,
          summary: 'Progressive breakdown of hydrodynamic lubricating oil film between crankshaft journals and main bearings. Metal-to-metal boundary friction drives rapid vibration harmonic spikes and oil line depressurization.',
          telemetrySignatures: [
            { label: 'Airframe Vibration', value: `${telemetry.vibration} mm/s RMS (High > 3.8)`, status: 'bad' },
            { label: 'Oil Pressure', value: `${telemetry.oilPressure} bar (Floor < 3.8 bar)`, status: 'bad' },
            { label: 'Oil Sump Temp', value: `${telemetry.oilTemp}°C (Elevated)`, status: 'warn' },
          ],
          riskHorizon: 'Imminent journal surface galling and complete shaft seizure within 35–45 minutes if continuous duty power > 75% MCP is sustained.',
          immediateCountermeasure: 'Immediately decrease throttle to 65% MCP, reduce propeller governor load, descend to cooler ambient air, and divert to nearest safe landing facility.',
        };

      case 'INJECTOR_MISFIRE':
        return {
          title: 'Cylinder #3 Injector Misfire',
          category: 'Combustion & Fuel Metering Anomaly',
          severity: 'WARNING',
          icon: <Flame className="w-4 h-4 text-amber-600" />,
          summary: 'Partial fuel injector nozzle clogging on Cylinder #3 producing an asymmetric lean burn condition. Localized cylinder exhaust temperature climbs sharply and induces torsional crankshaft vibration harmonics.',
          telemetrySignatures: [
            { label: 'Cylinder #3 EGT', value: `${telemetry.egt[2]}°C (Thermal Delta > +80°C)`, status: 'bad' },
            { label: 'EGT Spread (Max-Min)', value: `${Math.max(...telemetry.egt) - Math.min(...telemetry.egt)}°C (Spread limit: 45°C)`, status: 'warn' },
            { label: 'Crankshaft Vibration', value: `${telemetry.vibration} mm/s (0.5x order)`, status: 'warn' },
          ],
          riskHorizon: 'Exhaust valve thermal erosion, localized detonation, and cylinder crown fatigue if sustained at high cruise power.',
          immediateCountermeasure: 'Command ECU fuel enrichment override, step down engine RPM to isolate torsional resonance band, and avoid prolonged climb rates.',
        };

      case 'COOLING_LEAK':
        return {
          title: 'Cooling Jacket Depressurization',
          category: 'Thermodynamic Heat Rejection Failure',
          severity: 'CRITICAL',
          icon: <Droplets className="w-4 h-4 text-rose-600" />,
          summary: 'Loss of cooling circuit pressure and fluid volume. Bulk liquid coolant escalates rapidly, severely degrading thermal dissipation across all four cylinder heads and causing rapid CHT escalation.',
          telemetrySignatures: [
            { label: 'Coolant Temperature', value: `${telemetry.coolantTemp}°C (Critical Limit: 88°C)`, status: 'bad' },
            { label: 'Peak Cylinder Head Temp', value: `${Math.max(...telemetry.cylinderTemps)}°C (Ceiling: 210°C)`, status: 'bad' },
            { label: 'Thermal Reserve', value: '0% (Cooling capacity collapsed)', status: 'bad' },
          ],
          riskHorizon: 'Catastrophic cylinder head warping, gasket breach, and automatic emergency thermal engine shutdown within 15–20 minutes.',
          immediateCountermeasure: 'Establish maximum glide airspeed for ram-air radiator convection, enrich mixture for internal evaporative cooling, and declare emergency priority landing.',
        };

      case 'SENSOR_MALFUNCTION':
        return {
          title: 'Sensor Bias / Transducer Malfunction',
          category: 'Instrumentation False Alarm',
          severity: 'ADVISORY',
          icon: <RadioTower className="w-4 h-4 text-indigo-600" />,
          summary: 'Isolated thermocouple transducer glitch reporting false 325°C on CHT #2. Physical correlation model confirms exhaust, coolant, and oil temperatures are nominal with zero thermodynamic distress.',
          telemetrySignatures: [
            { label: 'Thermocouple CHT #2', value: `${telemetry.cylinderTemps[1]}°C (Isolated outlier)`, status: 'warn' },
            { label: 'EGT #2 Correlation', value: `${telemetry.egt[1]}°C (Physics model nominal)`, status: 'nominal' },
            { label: 'Coolant Stability', value: `${telemetry.coolantTemp}°C (Normal thermal state)`, status: 'nominal' },
          ],
          riskHorizon: 'Zero physical engine structural risk; potential automated mission abort if false threshold warning is not suppressed.',
          immediateCountermeasure: 'Suppress false threshold alarm via autoencoder residual verification. Mission cleared to proceed with post-flight transducer inspection.',
        };

      default:
        return {
          title: 'Unspecified Propulsion Degradation',
          category: 'Telemetry Residual Deviation',
          severity: 'WARNING',
          icon: <Activity className="w-4 h-4 text-amber-600" />,
          summary: diagnosis.faultTitle || 'Subsystem health score has breached the 70% operational safety threshold due to real-time physical telemetry divergence.',
          telemetrySignatures: [
            { label: 'Engine Health Index', value: `${health.overallHealthIndex}%`, status: 'warn' },
            { label: 'Subsystems Below 70%', value: `${degradedSubsystems.length} subsystems`, status: 'bad' },
          ],
          riskHorizon: 'Elevated engine wear and degraded mission reliability index if operated outside nominal envelope.',
          immediateCountermeasure: diagnosis.recommendedAction || 'Inspect telemetry residuals and adjust flight profile parameters.',
        };
    }
  };

  const presetMeta = getPresetMeta(activePreset);

  const handleDismiss = () => {
    setIsOpen(false);
    setDismissedPreset(activePreset);
  };

  const handleReset = () => {
    setIsOpen(false);
    setDismissedPreset(null);
    if (onResetPreset) onResetPreset();
  };

  const handleGoToAdvisor = () => {
    setIsOpen(false);
    if (onNavigateToTab) onNavigateToTab('counterfactual');
  };

  // If no subsystem is degraded, render nothing
  if (!isTriggerConditionMet) {
    return null;
  }

  return (
    <>
      {/* Minimized Floating Status Badge (Visible when user dismissed the overlay while subsystems are still < 70%) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-fadeIn">
          <button
            id="btn-reopen-health-overlay"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white border-2 border-rose-400 text-slate-800 shadow-xl hover:shadow-2xl hover:bg-rose-50/50 transition cursor-pointer group"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div className="text-left font-mono">
              <div className="text-[11px] font-bold text-rose-700 uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Subsystem Health Alert (&lt; 70%)
              </div>
              <div className="text-[10px] text-slate-500">
                {degradedSubsystems.length} Subsystem{degradedSubsystems.length > 1 ? 's' : ''} Compromised • Click to inspect fault preset
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      )}

      {/* Main Modal Overlay */}
      {isOpen && (
        <div 
          id="subsystem-health-alert-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="alert-dialog-title"
        >
          <div className="relative w-full max-w-2xl bg-white border-2 border-rose-300 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Alert Header Ribbon */}
            <div className="bg-gradient-to-r from-rose-50 via-amber-50/50 to-white px-6 py-4 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center border border-rose-200 shadow-xs">
                  <AlertOctagon className="w-5 h-5 text-rose-600 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      THRESHOLD BREACH (&lt; 70%)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Propulsion Subsystem Alert
                    </span>
                  </div>
                  <h2 id="alert-dialog-title" className="text-base font-bold text-slate-900 font-mono mt-0.5 flex items-center gap-2">
                    Subsystem Health Compromised
                  </h2>
                </div>
              </div>

              <button
                id="btn-close-health-overlay"
                onClick={handleDismiss}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="Acknowledge and minimize alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* 1. Degraded Subsystems Overview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-600" />
                    Degraded Subsystems Below 70% Threshold
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    Critical Floor: 70%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {degradedSubsystems.map((sub) => {
                    const isCritical = sub.score < 50;
                    return (
                      <div 
                        key={sub.key} 
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isCritical 
                            ? 'bg-rose-50/70 border-rose-200' 
                            : 'bg-amber-50/70 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {sub.icon}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">
                              {sub.label}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              Nominal target: &gt;80%
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-base font-black font-mono ${
                            isCritical ? 'text-rose-600' : 'text-amber-600'
                          }`}>
                            {sub.score}%
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 block">
                            (Δ -{100 - sub.score}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Active Fault Preset Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center border border-slate-200 shadow-xs">
                      {presetMeta.icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                        ACTIVE FAULT PRESET INJECTION
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 font-mono">
                        {presetMeta.title}
                      </h3>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    presetMeta.severity === 'CRITICAL' 
                      ? 'bg-rose-100 text-rose-800 border-rose-200' 
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    SEVERITY: {presetMeta.severity}
                  </span>
                </div>

                {/* Concise summary */}
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block mb-1">
                    Mechanistic Fault Summary & Root Cause:
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {presetMeta.summary}
                  </p>
                </div>

                {/* Telemetry Signature Deviations */}
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block mb-1.5">
                    Real-time Sensor Signatures:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                    {presetMeta.telemetrySignatures.map((sig, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {sig.label}
                        </span>
                        <span className={`text-xs font-bold ${
                          sig.status === 'bad' ? 'text-rose-600' :
                          sig.status === 'warn' ? 'text-amber-600' : 'text-slate-800'
                        }`}>
                          {sig.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Horizon */}
                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80">
                  <span className="text-[10px] font-mono text-rose-800 font-bold uppercase tracking-wider block mb-0.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    Propulsion Risk Horizon:
                  </span>
                  <p className="text-xs text-rose-900 leading-relaxed font-sans">
                    {presetMeta.riskHorizon}
                  </p>
                </div>

                {/* Tactical Mitigation Advice */}
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                  <span className="text-[10px] font-mono text-indigo-800 font-bold uppercase tracking-wider block mb-0.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Recommended Countermeasure:
                  </span>
                  <p className="text-xs text-indigo-950 leading-relaxed font-sans">
                    {presetMeta.immediateCountermeasure}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                id="btn-acknowledge-alert"
                onClick={handleDismiss}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold transition cursor-pointer shadow-xs"
              >
                Acknowledge & Minimize
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="btn-overlay-reset-normal"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-mono font-bold transition cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                  Reset to Normal
                </button>

                <button
                  id="btn-overlay-counterfactual"
                  onClick={handleGoToAdvisor}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold transition cursor-pointer shadow-sm shadow-indigo-200"
                >
                  <span>Counterfactual Advice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

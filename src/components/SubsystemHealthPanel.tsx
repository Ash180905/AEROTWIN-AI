import React from 'react';
import { 
  EngineSubsystemHealth, 
  FaultDiagnosis, 
  AlertSeverity 
} from '../types';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Flame, 
  Droplets, 
  Thermometer, 
  Fuel, 
  Cpu, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle,
  RadioTower,
  Info
} from 'lucide-react';

interface SubsystemHealthPanelProps {
  health: EngineSubsystemHealth;
  diagnosis: FaultDiagnosis;
}

export const SubsystemHealthPanel: React.FC<SubsystemHealthPanelProps> = ({
  health,
  diagnosis
}) => {
  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
          label: 'CRITICAL ALERT',
          barColor: 'bg-rose-500'
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          label: 'MISSION WARNING',
          barColor: 'bg-amber-500'
        };
      case 'ADVISORY':
        return {
          bg: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: <Info className="w-4 h-4 text-yellow-600" />,
          label: 'TACTICAL ADVISORY',
          barColor: 'bg-yellow-500'
        };
      default:
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
          label: 'NOMINAL ENVELOPE',
          barColor: 'bg-emerald-500'
        };
    }
  };

  const badge = getSeverityBadge(diagnosis.severity);

  // Subsystem bar items
  const subsystems = [
    { name: 'Combustion', score: health.combustion, icon: <Flame className="w-3.5 h-3.5 text-amber-500" /> },
    { name: 'Lubrication', score: health.lubrication, icon: <Droplets className="w-3.5 h-3.5 text-blue-500" /> },
    { name: 'Cooling', score: health.cooling, icon: <Thermometer className="w-3.5 h-3.5 text-teal-500" /> },
    { name: 'Fuel System', score: health.fuelSystem, icon: <Fuel className="w-3.5 h-3.5 text-emerald-500" /> },
    { name: 'Mechanical', score: health.mechanical, icon: <Wrench className="w-3.5 h-3.5 text-indigo-500" /> },
    { name: 'Electrical / FADEC', score: health.electrical, icon: <Cpu className="w-3.5 h-3.5 text-indigo-500" /> },
  ];

  const getScoreColor = (val: number) => {
    if (val < 50) return 'text-rose-600 bg-rose-500';
    if (val < 75) return 'text-amber-600 bg-amber-500';
    if (val < 85) return 'text-indigo-600 bg-indigo-500';
    return 'text-emerald-600 bg-emerald-500';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Engine Health Index (EHI)
            </h3>
            <span className="text-[11px] text-slate-500">
              Multivariate AI Subsystem Health Evaluation
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold ${badge.bg}`}>
            {badge.icon}
            <span>{badge.label}</span>
          </div>
        </div>

        {/* Big Circular Dial & Overall Health */}
        <div className="flex items-center gap-4 my-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <path
                className="text-slate-200"
                strokeWidth="3.2"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Animated Progress Circle */}
              <path
                className={`transition-all duration-500 ${
                  health.overallHealthIndex < 60 ? 'text-rose-500' :
                  health.overallHealthIndex < 80 ? 'text-amber-500' : 'text-indigo-600'
                }`}
                strokeDasharray={`${health.overallHealthIndex}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-slate-900 font-mono leading-none">
                {health.overallHealthIndex}%
              </span>
              <span className="text-[9px] font-mono text-slate-400 font-semibold">HEALTH</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-xs font-mono text-slate-900 font-bold mb-1">
              STATUS: {diagnosis.faultTitle}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {diagnosis.isSensorFaultOnly 
                ? 'Sensor transducer anomaly isolated. Primary reciprocating block and hydraulic film remain healthy.'
                : diagnosis.faultDetected
                ? 'Degradation trajectory detected prior to threshold alarm triggering.'
                : 'All 6 critical subsystems tracking nominal aero thermodynamic physics envelope.'}
            </p>
          </div>
        </div>

        {/* 6 Subsystem Bars */}
        <div className="space-y-2.5 my-3">
          {subsystems.map((sub) => {
            const colorClass = getScoreColor(sub.score);
            const textColor = colorClass.split(' ')[0];
            const barBg = colorClass.split(' ')[1];

            return (
              <div key={sub.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                    {sub.icon}
                    {sub.name}
                    {sub.score < 70 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                        &lt;70%
                      </span>
                    )}
                  </span>
                  <span className={`font-bold ${textColor}`}>
                    {sub.score}%
                  </span>
                </div>
                <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barBg}`}
                    style={{ width: `${sub.score}%` }}
                  ></div>
                  {/* 70% Threshold marker */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-400/80 z-10" 
                    style={{ left: '70%' }}
                    title="70% Alert Threshold"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Novelty Spotlight: Sensor vs Engine Fault Discrimination */}
      <div className={`mt-3 pt-3 border-t border-slate-100 p-3 rounded-xl text-xs font-mono ${
        diagnosis.isSensorFaultOnly 
          ? 'bg-amber-50 border border-amber-200 text-amber-900'
          : 'bg-slate-50 border border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold flex items-center gap-1.5 text-[11px]">
            <RadioTower className={`w-3.5 h-3.5 ${diagnosis.isSensorFaultOnly ? 'text-amber-600' : 'text-indigo-600'}`} />
            SENSOR VS ENGINE FAULT DISCRIMINATION
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
            diagnosis.isSensorFaultOnly 
              ? 'bg-white text-amber-800 border-amber-300'
              : 'bg-white text-emerald-700 border-emerald-200'
          }`}>
            {diagnosis.isSensorFaultOnly ? 'SENSOR FAULT ISOLATED' : 'SENSORS CORRELATED'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal">
          {diagnosis.isSensorFaultOnly
            ? 'Cross-sensor physics validation confirms isolated thermocouple divergence. Suppresses false threshold alarms to protect mission continuity.'
            : 'Multivariate sensor fusion verifies all readings are thermodynamically correlated with physical engine dynamics.'}
        </p>
      </div>
    </div>
  );
};

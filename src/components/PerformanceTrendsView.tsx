import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  EngineTelemetry,
  PhysicsExpectedModel,
  FaultPreset,
  FaultDiagnosis
} from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  Zap,
  RotateCcw,
  Play,
  Pause,
  Sliders,
  Flame,
  Wrench,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Download,
  Info
} from 'lucide-react';

export interface PerformanceHistoryPoint {
  index: number;
  timeLabel: string;
  timestamp: number;
  // Vibration
  vibration: number;
  expectedVibration: number;
  vibrationResidual: number;
  vibrationWarningThreshold: number;
  vibrationCriticalThreshold: number;
  // EGT
  egt1: number;
  egt2: number;
  egt3: number;
  egt4: number;
  egtMax: number;
  expectedEgt: number;
  egtResidual: number;
  egtWarningThreshold: number;
  egtCriticalThreshold: number;
  // Auxiliary
  oilPressure: number;
  oilTemp: number;
  activePreset: FaultPreset;
  isEarlyWarning: boolean;
  isThresholdTripped: boolean;
}

interface PerformanceTrendsViewProps {
  telemetry: EngineTelemetry;
  physics: PhysicsExpectedModel;
  diagnosis: FaultDiagnosis;
  activePreset: FaultPreset;
  onSelectPreset: (preset: FaultPreset) => void;
  isRunning?: boolean;
}

// Generate realistic synthetic 50-point trajectory reflecting preset
export function generateInitialTrajectory(preset: FaultPreset, currentTelemetry: EngineTelemetry, currentPhysics: PhysicsExpectedModel): PerformanceHistoryPoint[] {
  const points: PerformanceHistoryPoint[] = [];
  const now = Date.now();

  for (let i = 49; i >= 0; i--) {
    const timeOffsetSec = i;
    const t = (50 - i) / 50; // Progress from 0 (past) to 1 (now)
    const timeLabel = `-${timeOffsetSec}s`;
    const pointTimestamp = now - timeOffsetSec * 1000;

    // Small stochastic noise
    const noise = (Math.sin(i * 1.7) * 0.5 + Math.cos(i * 2.3) * 0.5);
    const vibNoise = (Math.sin(i * 2.5) * 0.04 + Math.cos(i * 1.9) * 0.03);

    let vib = 2.12 + vibNoise;
    let egt1 = 688 + noise * 3;
    let egt2 = 694 + noise * 3;
    let egt3 = 702 + noise * 3;
    let egt4 = 691 + noise * 3;
    let oilP = 4.65;
    let oilT = 86.4;

    const expVib = 2.10;
    const expEgt = 695;

    if (preset === 'BEARING_LUBRICATION') {
      // Progressive acceleration in vibration over the last 35 points
      if (t > 0.3) {
        const factor = (t - 0.3) / 0.7; // 0 to 1
        vib = 2.12 + Math.pow(factor, 1.6) * 2.65 + vibNoise;
        oilP = 4.65 - factor * 1.35;
        oilT = 86.4 + factor * 19.5;
      }
    } else if (preset === 'INJECTOR_MISFIRE') {
      // Progressive divergence of Cylinder 3 EGT over the last 40 points
      if (t > 0.2) {
        const factor = (t - 0.2) / 0.8;
        egt3 = 702 + Math.pow(factor, 1.4) * 82 + noise * 4;
        vib = 2.12 + factor * 0.68 + vibNoise;
      }
    } else if (preset === 'COOLING_LEAK') {
      // Gradual thermal climb across all 4 cylinders
      if (t > 0.25) {
        const factor = (t - 0.25) / 0.75;
        const egtDrift = factor * 45;
        egt1 += egtDrift;
        egt2 += egtDrift;
        egt3 += egtDrift;
        egt4 += egtDrift;
      }
    } else if (preset === 'SENSOR_MALFUNCTION') {
      // Mechanical values are stable; only Cyl 2 CHT spiked elsewhere
      vib = 2.12 + vibNoise;
    }

    // For point 0 (current), match real incoming telemetry if present
    if (i === 0) {
      vib = currentTelemetry.vibration;
      egt1 = currentTelemetry.egt[0];
      egt2 = currentTelemetry.egt[1];
      egt3 = currentTelemetry.egt[2];
      egt4 = currentTelemetry.egt[3];
      oilP = currentTelemetry.oilPressure;
      oilT = currentTelemetry.oilTemp;
    }

    const egtMax = Math.max(egt1, egt2, egt3, egt4);
    const vibResidual = Number((vib - expVib).toFixed(2));
    const egtResidual = Number((egtMax - expEgt).toFixed(1));

    const isEarlyWarning = vibResidual > 0.4 || egtResidual > 30;
    const isThresholdTripped = vib >= 3.2 || egtMax >= 740;

    points.push({
      index: 50 - i,
      timeLabel: i === 0 ? 'Now' : timeLabel,
      timestamp: pointTimestamp,
      vibration: Number(vib.toFixed(2)),
      expectedVibration: expVib,
      vibrationResidual: vibResidual,
      vibrationWarningThreshold: 2.8,
      vibrationCriticalThreshold: 3.5,
      egt1: Math.round(egt1),
      egt2: Math.round(egt2),
      egt3: Math.round(egt3),
      egt4: Math.round(egt4),
      egtMax: Math.round(egtMax),
      expectedEgt: expEgt,
      egtResidual: egtResidual,
      egtWarningThreshold: 720,
      egtCriticalThreshold: 750,
      oilPressure: Number(oilP.toFixed(2)),
      oilTemp: Number(oilT.toFixed(1)),
      activePreset: preset,
      isEarlyWarning,
      isThresholdTripped
    });
  }

  return points;
}

export const PerformanceTrendsView: React.FC<PerformanceTrendsViewProps> = ({
  telemetry,
  physics,
  diagnosis,
  activePreset,
  onSelectPreset,
  isRunning = true
}) => {
  const [history, setHistory] = useState<PerformanceHistoryPoint[]>(() =>
    generateInitialTrajectory(activePreset, telemetry, physics)
  );
  const [isRecording, setIsRecording] = useState(true);
  const [focusedCylinder, setFocusedCylinder] = useState<'ALL' | 'CYL3' | 'MAX'>('ALL');
  const [showTableDrawer, setShowTableDrawer] = useState(false);
  const [lastPresetSeen, setLastPresetSeen] = useState<FaultPreset>(activePreset);

  const prevTelemetryRef = useRef<EngineTelemetry>(telemetry);

  // When preset changes externally, regenerate sequence so user instantly sees trajectory curve
  useEffect(() => {
    if (activePreset !== lastPresetSeen) {
      setLastPresetSeen(activePreset);
      setHistory(generateInitialTrajectory(activePreset, telemetry, physics));
    }
  }, [activePreset, lastPresetSeen, telemetry, physics]);

  // Append incoming telemetry live updates (keeping exact 50-point buffer)
  useEffect(() => {
    if (!isRecording) return;
    if (prevTelemetryRef.current.timestamp === telemetry.timestamp) return;
    prevTelemetryRef.current = telemetry;

    setHistory((prev) => {
      const expVib = physics.expectedVibration || 2.10;
      const expEgt = physics.expectedEgt || 695;
      const egtMax = Math.max(...telemetry.egt);
      const vibResidual = Number((telemetry.vibration - expVib).toFixed(2));
      const egtResidual = Number((egtMax - expEgt).toFixed(1));
      const isEarlyWarning = vibResidual > 0.4 || egtResidual > 30;
      const isThresholdTripped = telemetry.vibration >= 3.2 || egtMax >= 740;

      const newPoint: PerformanceHistoryPoint = {
        index: (prev[prev.length - 1]?.index || 50) + 1,
        timeLabel: 'Now',
        timestamp: telemetry.timestamp,
        vibration: telemetry.vibration,
        expectedVibration: expVib,
        vibrationResidual: vibResidual,
        vibrationWarningThreshold: 2.8,
        vibrationCriticalThreshold: 3.5,
        egt1: telemetry.egt[0],
        egt2: telemetry.egt[1],
        egt3: telemetry.egt[2],
        egt4: telemetry.egt[3],
        egtMax,
        expectedEgt: expEgt,
        egtResidual,
        egtWarningThreshold: 720,
        egtCriticalThreshold: 750,
        oilPressure: telemetry.oilPressure,
        oilTemp: telemetry.oilTemp,
        activePreset,
        isEarlyWarning,
        isThresholdTripped
      };

      const updated = [...prev.slice(1), newPoint];
      // Re-label relative offsets from 50 to Now
      return updated.map((pt, idx) => ({
        ...pt,
        timeLabel: idx === 49 ? 'Now' : `-${49 - idx}s`
      }));
    });
  }, [telemetry, physics, activePreset, isRecording]);

  // Trajectory Analytics Calculations
  const analytics = useMemo(() => {
    if (history.length < 10) {
      return {
        egtSlope: 0,
        vibSlope: 0,
        timeToEgtBreach: null,
        timeToVibBreach: null,
        earlyWarningPoint: null,
        thresholdPoint: null,
        earlyWarningLeadTimeSec: null
      };
    }

    // Rate of change over last 15 points (first derivative estimation)
    const recent = history.slice(-15);
    const firstPt = recent[0];
    const lastPt = recent[recent.length - 1];
    const dt = recent.length; // seconds approx

    const dVib = (lastPt.vibration - firstPt.vibration) / dt;
    const dEgt = (lastPt.egtMax - firstPt.egtMax) / dt;

    // Projected seconds until critical threshold
    let timeToVibBreach: number | null = null;
    if (dVib > 0.01 && lastPt.vibration < 3.5) {
      timeToVibBreach = Math.max(1, Math.round((3.5 - lastPt.vibration) / dVib));
    }

    let timeToEgtBreach: number | null = null;
    if (dEgt > 0.2 && lastPt.egtMax < 750) {
      timeToEgtBreach = Math.max(1, Math.round((750 - lastPt.egtMax) / dEgt));
    }

    // Find first point where early warning occurred vs threshold tripped
    const earlyWarnIdx = history.findIndex((pt) => pt.isEarlyWarning);
    const thresholdIdx = history.findIndex((pt) => pt.isThresholdTripped);

    let leadTime: number | null = null;
    if (earlyWarnIdx !== -1 && thresholdIdx !== -1 && thresholdIdx > earlyWarnIdx) {
      leadTime = thresholdIdx - earlyWarnIdx;
    } else if (earlyWarnIdx !== -1 && thresholdIdx === -1) {
      leadTime = 50 - earlyWarnIdx; // Warning detected, threshold not even tripped yet!
    }

    return {
      egtSlope: Number(dEgt.toFixed(2)),
      vibSlope: Number(dVib.toFixed(3)),
      timeToEgtBreach,
      timeToVibBreach,
      earlyWarningPoint: earlyWarnIdx !== -1 ? history[earlyWarnIdx] : null,
      thresholdPoint: thresholdIdx !== -1 ? history[thresholdIdx] : null,
      earlyWarningLeadTimeSec: leadTime
    };
  }, [history]);

  const handleResetHistory = () => {
    setHistory(generateInitialTrajectory(activePreset, telemetry, physics));
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Index',
      'TimeLabel',
      'Vibration_RMS',
      'Expected_Vib',
      'Vib_Residual',
      'EGT_Cyl1',
      'EGT_Cyl2',
      'EGT_Cyl3',
      'EGT_Cyl4',
      'EGT_Max',
      'Expected_EGT',
      'EGT_Residual',
      'Oil_Pressure',
      'Oil_Temp',
      'Preset'
    ];
    const rows = history.map((pt) => [
      pt.index,
      pt.timeLabel,
      pt.vibration,
      pt.expectedVibration,
      pt.vibrationResidual,
      pt.egt1,
      pt.egt2,
      pt.egt3,
      pt.egt4,
      pt.egtMax,
      pt.expectedEgt,
      pt.egtResidual,
      pt.oilPressure,
      pt.oilTemp,
      pt.activePreset
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aerotwin_telemetry_trajectory_50pts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom Recharts Tooltip for EGT
  const CustomEgtTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pt: PerformanceHistoryPoint = payload[0]?.payload;
    if (!pt) return null;

    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs font-mono text-slate-200 min-w-[220px]">
        <div className="flex items-center justify-between pb-1 mb-2 border-b border-slate-800">
          <span className="font-bold text-white">Time Offset: {pt.timeLabel}</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
            pt.egtMax >= 750 ? 'bg-rose-500/20 text-rose-400' :
            pt.egtMax >= 720 ? 'bg-amber-500/20 text-amber-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>
            Max {pt.egtMax}°C
          </span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-sky-400">
            <span>Cylinder #1:</span>
            <span className="font-bold">{pt.egt1}°C</span>
          </div>
          <div className="flex justify-between text-indigo-400">
            <span>Cylinder #2:</span>
            <span className="font-bold">{pt.egt2}°C</span>
          </div>
          <div className={`flex justify-between ${pt.egt3 >= 740 ? 'text-rose-400 font-bold animate-pulse' : 'text-rose-300'}`}>
            <span>Cylinder #3 (Fuel Spray):</span>
            <span className="font-bold">{pt.egt3}°C</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>Cylinder #4:</span>
            <span className="font-bold">{pt.egt4}°C</span>
          </div>
          <div className="pt-1 border-t border-slate-800 flex justify-between text-slate-400">
            <span>Physics Expected:</span>
            <span>{pt.expectedEgt}°C</span>
          </div>
          <div className="flex justify-between font-bold text-amber-400">
            <span>Physics Residual (Δ):</span>
            <span>+{pt.egtResidual}°C</span>
          </div>
        </div>
      </div>
    );
  };

  // Custom Recharts Tooltip for Vibration
  const CustomVibrationTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pt: PerformanceHistoryPoint = payload[0]?.payload;
    if (!pt) return null;

    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs font-mono text-slate-200 min-w-[220px]">
        <div className="flex items-center justify-between pb-1 mb-2 border-b border-slate-800">
          <span className="font-bold text-white">Time Offset: {pt.timeLabel}</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
            pt.vibration >= 3.5 ? 'bg-rose-500/20 text-rose-400' :
            pt.vibration >= 2.8 ? 'bg-amber-500/20 text-amber-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>
            {pt.vibration >= 3.5 ? 'CRITICAL' : pt.vibration >= 2.8 ? 'WARNING' : 'NOMINAL'}
          </span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-amber-400 font-bold">
            <span>Vibration RMS:</span>
            <span>{pt.vibration} mm/s</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Physics Expected:</span>
            <span>{pt.expectedVibration} mm/s</span>
          </div>
          <div className="flex justify-between text-cyan-400">
            <span>Residual (Δ):</span>
            <span>{pt.vibrationResidual > 0 ? `+${pt.vibrationResidual}` : pt.vibrationResidual} mm/s</span>
          </div>
          <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
            <span>Oil Pressure:</span>
            <span>{pt.oilPressure} bar</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Oil Temp:</span>
            <span>{pt.oilTemp}°C</span>
          </div>
        </div>
      </div>
    );
  };

  const currentPoint = history[history.length - 1] || history[0];

  return (
    <div className="w-full space-y-5">
      {/* 1. Header Banner & Scenario Controller */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Performance Degradation Trends
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                50-SAMPLE TRAJECTORY BUFFER
              </span>
            </div>
            <p className="text-xs text-slate-500">
              High-resolution historical tracking of Exhaust Gas Temperature (EGT) and Vibration RMS to observe pre-fault inception curves.
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause / Resume recording */}
          <button
            id="btn-toggle-recording"
            onClick={() => setIsRecording((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border shadow-xs ${
              isRecording
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
            }`}
          >
            {isRecording ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRecording ? 'Stream Active' : 'Stream Paused'}</span>
          </button>

          {/* Reset / Resynthesize trajectory */}
          <button
            id="btn-reset-trajectory"
            onClick={handleResetHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition cursor-pointer"
            title="Re-synthesize full 50-point trajectory curve"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset 50-Point Curve</span>
          </button>

          {/* Download CSV */}
          <button
            id="btn-export-csv"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
            title="Export 50 telemetry points to CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Fault Preset Selector Bar (Quick Switcher to observe trajectory curves) */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Select Fault Trajectory Scenario (Instantly replays 50-point degradation timeline):
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Sampling Rate: 1 Hz / 50 Hz internal
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            id="btn-preset-normal"
            onClick={() => onSelectPreset('NORMAL')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activePreset === 'NORMAL'
                ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200 ring-1 ring-emerald-500/50'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Nominal Cruise
              </span>
              {activePreset === 'NORMAL' && (
                <span className="text-[9px] px-1 bg-emerald-500/30 text-emerald-300 rounded font-mono font-bold">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Flat, stationary telemetry conforming to 1st-principles baseline.
            </p>
          </button>

          <button
            id="btn-preset-bearing"
            onClick={() => onSelectPreset('BEARING_LUBRICATION')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activePreset === 'BEARING_LUBRICATION'
                ? 'bg-rose-950/60 border-rose-500/80 text-rose-200 ring-1 ring-rose-500/50'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-rose-400" />
                Bearing Degradation
              </span>
              {activePreset === 'BEARING_LUBRICATION' && (
                <span className="text-[9px] px-1 bg-rose-500/30 text-rose-300 rounded font-mono font-bold">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Exponential climb in Vibration RMS (2.1 to 4.8 mm/s) & oil pressure drop.
            </p>
          </button>

          <button
            id="btn-preset-misfire"
            onClick={() => onSelectPreset('INJECTOR_MISFIRE')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activePreset === 'INJECTOR_MISFIRE'
                ? 'bg-amber-950/60 border-amber-500/80 text-amber-200 ring-1 ring-amber-500/50'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Injector Misfire (Cyl 3)
              </span>
              {activePreset === 'INJECTOR_MISFIRE' && (
                <span className="text-[9px] px-1 bg-amber-500/30 text-amber-300 rounded font-mono font-bold">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Cyl 3 EGT rapidly diverges from baseline up to 785°C backfire spikes.
            </p>
          </button>

          <button
            id="btn-preset-cooling"
            onClick={() => onSelectPreset('COOLING_LEAK')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activePreset === 'COOLING_LEAK'
                ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200 ring-1 ring-cyan-500/50'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
                Coolant Circuit Breach
              </span>
              {activePreset === 'COOLING_LEAK' && (
                <span className="text-[9px] px-1 bg-cyan-500/30 text-cyan-300 rounded font-mono font-bold">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Global thermal runaway; all 4 cylinders drift upward synchronously.
            </p>
          </button>
        </div>
      </div>

      {/* 3. Predictive Early-Warning Banner */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 shadow-sm flex flex-wrap items-center justify-between gap-4 ${
        currentPoint.isThresholdTripped
          ? 'bg-rose-50 border-rose-200 text-rose-900'
          : currentPoint.isEarlyWarning
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl mt-0.5 ${
            currentPoint.isThresholdTripped ? 'bg-rose-200 text-rose-800' :
            currentPoint.isEarlyWarning ? 'bg-amber-200 text-amber-800' :
            'bg-emerald-200 text-emerald-800'
          }`}>
            {currentPoint.isThresholdTripped ? <AlertTriangle className="w-5 h-5" /> :
             currentPoint.isEarlyWarning ? <Zap className="w-5 h-5" /> :
             <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wider font-mono">
                {currentPoint.isThresholdTripped
                  ? 'CRITICAL ALERT: Operational Threshold Breached'
                  : currentPoint.isEarlyWarning
                  ? 'PHYSICS-INFORMED PRE-FAULT WARNING ACTIVE'
                  : 'ALL SYSTEMS NOMINAL: Conforming to 1st-Principles Model'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white/80 border border-current/20">
                {activePreset}
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5 leading-relaxed max-w-3xl">
              {currentPoint.isThresholdTripped ? (
                <>
                  Conventional threshold limits have been tripped. The 50-point curve above shows the exact trajectory path leading to failure.
                  {analytics.earlyWarningLeadTimeSec && (
                    <strong className="block text-rose-950 mt-0.5">
                      Early Warning Advantage: Physics residual signaled this failure {analytics.earlyWarningLeadTimeSec} seconds before the conventional alarm sounded!
                    </strong>
                  )}
                </>
              ) : currentPoint.isEarlyWarning ? (
                <>
                  Telemetry residual ($\Delta$) has broken out of nominal $\pm 3\sigma$ physics bounds. 
                  Although raw values are currently below conventional emergency thresholds, the degradation trajectory predicts a critical boundary breach.
                </>
              ) : (
                'Sensor values are operating in continuous statistical equilibrium with theoretical thermodynamics. No degradation slope detected.'
              )}
            </p>
          </div>
        </div>

        {/* Lead-Time Badge */}
        {analytics.earlyWarningLeadTimeSec && (
          <div className="px-3 py-2 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2 font-mono">
            <Clock className="w-4 h-4 text-indigo-600" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Physics Lead-Time</span>
              <span className="text-sm font-extrabold text-indigo-700">+{analytics.earlyWarningLeadTimeSec} sec advantage</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Real-Time Trajectory Trajectory KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: EGT Peak & Slope */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
            <span>MAX EGT (50 pts)</span>
            <span className={analytics.egtSlope > 0.5 ? 'text-rose-600 font-bold flex items-center' : 'text-slate-400 flex items-center'}>
              {analytics.egtSlope > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {analytics.egtSlope > 0 ? `+${analytics.egtSlope}` : analytics.egtSlope} °C/s
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono ${
              currentPoint.egtMax >= 750 ? 'text-rose-600' :
              currentPoint.egtMax >= 720 ? 'text-amber-600' :
              'text-slate-900'
            }`}>
              {currentPoint.egtMax}°C
            </span>
            <span className="text-xs text-slate-400 font-mono">
              (Exp: {currentPoint.expectedEgt}°C)
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Residual Drift:</span>
            <span className={`font-mono font-bold ${currentPoint.egtResidual > 30 ? 'text-rose-600' : 'text-emerald-600'}`}>
              +{currentPoint.egtResidual}°C
            </span>
          </div>
        </div>

        {/* Metric 2: Vibration RMS & Slope */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
            <span>VIBRATION RMS</span>
            <span className={analytics.vibSlope > 0.01 ? 'text-rose-600 font-bold flex items-center' : 'text-slate-400 flex items-center'}>
              {analytics.vibSlope > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {analytics.vibSlope > 0 ? `+${analytics.vibSlope}` : analytics.vibSlope} mm/s²
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono ${
              currentPoint.vibration >= 3.5 ? 'text-rose-600' :
              currentPoint.vibration >= 2.8 ? 'text-amber-600' :
              'text-slate-900'
            }`}>
              {currentPoint.vibration} <span className="text-sm font-normal">mm/s</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              (Exp: {currentPoint.expectedVibration})
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>ISO 10816 Zone:</span>
            <span className={`font-mono font-bold ${
              currentPoint.vibration >= 3.5 ? 'text-rose-600' :
              currentPoint.vibration >= 2.8 ? 'text-amber-600' :
              'text-emerald-600'
            }`}>
              {currentPoint.vibration >= 3.5 ? 'Zone D (Danger)' : currentPoint.vibration >= 2.8 ? 'Zone C (Warning)' : 'Zone A/B (Good)'}
            </span>
          </div>
        </div>

        {/* Metric 3: Time to Threshold Breach */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
            <span>PROJECTED TIME-TO-LIMIT</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono ${
              currentPoint.isThresholdTripped ? 'text-rose-600' :
              analytics.timeToVibBreach || analytics.timeToEgtBreach ? 'text-amber-600' :
              'text-emerald-600'
            }`}>
              {currentPoint.isThresholdTripped ? '0s (TRIPPED)' :
               analytics.timeToVibBreach ? `${analytics.timeToVibBreach}s` :
               analytics.timeToEgtBreach ? `${analytics.timeToEgtBreach}s` :
               '> 600s (STABLE)'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Critical Constraint:</span>
            <span className="font-mono text-slate-700">
              {analytics.timeToVibBreach ? 'Bearing Seizure (3.5 mm/s)' :
               analytics.timeToEgtBreach ? 'Cyl 3 Overheat (750°C)' :
               'Within Safe Envelope'}
            </span>
          </div>
        </div>

        {/* Metric 4: Oil Lubrication Barrier Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
            <span>OIL PRESSURE & TEMP</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono ${currentPoint.oilPressure < 3.5 ? 'text-rose-600' : 'text-slate-900'}`}>
              {currentPoint.oilPressure} <span className="text-sm font-normal">bar</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              / {currentPoint.oilTemp}°C
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Film Thickness:</span>
            <span className={`font-mono font-bold ${currentPoint.oilPressure < 3.5 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {currentPoint.oilPressure < 3.5 ? '0.016 mm (Thinning)' : '0.042 mm (Optimal)'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. PRIMARY RECHARTS SECTION: EGT Trajectory & Vibration Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CHART 1: Exhaust Gas Temperature (EGT) Degradation Trajectory */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Exhaust Gas Temperature (EGT) Trajectory
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                  Last 50 Points
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Observes thermal divergence between individual cylinders and the theoretical model.
              </p>
            </div>

            {/* Cylinder Focus Filter */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-medium font-mono">
              <button
                onClick={() => setFocusedCylinder('ALL')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  focusedCylinder === 'ALL' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Cyls
              </button>
              <button
                onClick={() => setFocusedCylinder('CYL3')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  focusedCylinder === 'CYL3' ? 'bg-white text-rose-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cyl #3 Focus
              </button>
            </div>
          </div>

          {/* Recharts EGT Chart */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="timeLabel" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  interval={9}
                  stroke="#cbd5e1"
                />
                <YAxis 
                  domain={[650, 800]} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  stroke="#cbd5e1"
                  unit="°C"
                />
                <Tooltip content={<CustomEgtTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  iconType="circle"
                />

                {/* Advisory & Critical Threshold Reference Lines */}
                <ReferenceLine 
                  y={750} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  label={{ value: 'CRITICAL (750°C)', position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} 
                />
                <ReferenceLine 
                  y={720} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3" 
                  label={{ value: 'ADVISORY (720°C)', position: 'top', fill: '#f59e0b', fontSize: 9 }} 
                />

                {/* Physics Expected Baseline */}
                <Line
                  type="monotone"
                  dataKey="expectedEgt"
                  name="Physics Expected"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />

                {/* Cylinders */}
                {(focusedCylinder === 'ALL' || focusedCylinder === 'CYL3') && (
                  <Line
                    type="monotone"
                    dataKey="egt3"
                    name="Cyl #3 (Spray Port)"
                    stroke="#f43f5e"
                    strokeWidth={focusedCylinder === 'CYL3' ? 3 : 2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#f43f5e' }}
                  />
                )}

                {focusedCylinder === 'ALL' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="egt1"
                      name="Cyl #1"
                      stroke="#0ea5e9"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="egt2"
                      name="Cyl #2"
                      stroke="#818cf8"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="egt4"
                      name="Cyl #4"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
            <span>Baseline Expectation: 695°C</span>
            <span className="text-rose-600 font-bold">Cyl #3 Slope: {analytics.egtSlope > 0 ? `+${analytics.egtSlope}` : analytics.egtSlope} °C/s</span>
          </div>
        </div>

        {/* CHART 2: Vibration RMS Historical Degradation Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Vibration RMS Degradation Trajectory
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                  ISO 10816 Standard
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Visualizes hydrodynamic bearing wear and mechanical mount instability.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-500">Nominal</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 ml-1"></span>
              <span className="text-slate-500">Warning</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 ml-1"></span>
              <span className="text-slate-500">Seizure</span>
            </div>
          </div>

          {/* Recharts Area Chart for Vibration */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="vibGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="timeLabel" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  interval={9}
                  stroke="#cbd5e1"
                />
                <YAxis 
                  domain={[1.0, 5.2]} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  stroke="#cbd5e1"
                  unit=" mm/s"
                />
                <Tooltip content={<CustomVibrationTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                {/* ISO 10816 Zones via ReferenceLines */}
                <ReferenceLine 
                  y={3.5} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  label={{ value: 'SEIZURE RISK (3.5 mm/s)', position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} 
                />
                <ReferenceLine 
                  y={2.8} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3" 
                  label={{ value: 'WARNING (2.8 mm/s)', position: 'top', fill: '#f59e0b', fontSize: 9 }} 
                />

                {/* Expected Baseline */}
                <Line
                  type="monotone"
                  dataKey="expectedVibration"
                  name="Physics Expected"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />

                {/* Vibration Actual Area */}
                <Area
                  type="monotone"
                  dataKey="vibration"
                  name="Vibration RMS (Actual)"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fill="url(#vibGradient)"
                  activeDot={{ r: 5, fill: '#d97706' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
            <span>Nominal Baseline: 2.10 mm/s</span>
            <span className={`font-bold ${currentPoint.vibration >= 3.5 ? 'text-rose-600' : 'text-amber-600'}`}>
              Vib Acceleration: {analytics.vibSlope > 0 ? `+${analytics.vibSlope}` : analytics.vibSlope} mm/s²
            </span>
          </div>
        </div>
      </div>

      {/* 6. CHART 3: First-Principles Physics Residual Drift (Δ EGT vs Δ Vibration) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Physics-Informed Residual Drift Trajectory (Actual − Expected)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                EARLY INCEPTION DETECTOR
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Zero represents nominal physical compliance. Divergence above zero isolates mechanical and combustion anomalies long before threshold alarms sound.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-rose-600 font-bold">
              <span className="w-2.5 h-0.5 bg-rose-600 inline-block"></span>
              Δ EGT Max (°C)
            </span>
            <span className="flex items-center gap-1 text-amber-600 font-bold">
              <span className="w-2.5 h-0.5 bg-amber-600 inline-block"></span>
              Δ Vibration (mm/s)
            </span>
          </div>
        </div>

        {/* Dual Axis Residual Line Chart */}
        <div className="h-64 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="timeLabel" 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                interval={9}
                stroke="#cbd5e1"
              />
              {/* Left Y Axis for Δ EGT */}
              <YAxis 
                yAxisId="left"
                domain={[-10, 100]} 
                tick={{ fontSize: 10, fill: '#f43f5e' }} 
                stroke="#f43f5e"
                unit="°C"
                label={{ value: 'Δ EGT (°C)', angle: -90, position: 'insideLeft', fill: '#f43f5e', fontSize: 10 }}
              />
              {/* Right Y Axis for Δ Vibration */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[-0.2, 3.0]} 
                tick={{ fontSize: 10, fill: '#d97706' }} 
                stroke="#d97706"
                unit=" mm/s"
                label={{ value: 'Δ Vib (mm/s)', angle: 90, position: 'insideRight', fill: '#d97706', fontSize: 10 }}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [
                  name.includes('EGT') ? `${value}°C` : `${value} mm/s`,
                  name
                ]}
                labelFormatter={(label) => `Time Offset: ${label}`}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace', color: '#f8fafc' }}
              />

              {/* Zero Reference Line (Ideal Physics) */}
              <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" strokeDasharray="2 2" />
              <ReferenceLine 
                yAxisId="left" 
                y={30} 
                stroke="#f43f5e" 
                strokeDasharray="3 3" 
                label={{ value: 'EGT Residual Anomaly (+30°C)', position: 'insideTopLeft', fill: '#f43f5e', fontSize: 9 }}
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="egtResidual"
                name="EGT Residual (Δ)"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#f43f5e' }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="vibrationResidual"
                name="Vibration Residual (Δ)"
                stroke="#d97706"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#d97706' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 7. Trajectory Phase Breakdown & Timeline Explanation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              50-Point Trajectory Lifecycle Stages
            </h4>
          </div>
          <button
            onClick={() => setShowTableDrawer((prev) => !prev)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
          >
            {showTableDrawer ? 'Hide Raw Telemetry Buffer' : 'Inspect Raw 50-Sample Buffer'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-800">Stage 1: -50s to -30s</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">NOMINAL</span>
            </div>
            <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
              Thermodynamic equilibrium. Residuals are tightly bounded within standard stochastic noise ($\pm 1.8\%$). Zero wear progression.
            </p>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-900">Stage 2: -30s to -15s</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">MICRO-DRIFT</span>
            </div>
            <p className="text-[11px] text-amber-900 font-sans leading-relaxed">
              Inception of failure mechanism (hydrodynamic shear thinning or fuel injector atomization drop). <strong>Physics residual signals warning here!</strong>
            </p>
          </div>

          <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-rose-900">Stage 3: -15s to Now</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">RUNAWAY</span>
            </div>
            <p className="text-[11px] text-rose-900 font-sans leading-relaxed">
              Accelerating rate-of-change ($d/dt$). Hard threshold breached. Engine mount displacement visible in 3D twin workstation.
            </p>
          </div>
        </div>

        {/* Optional Collapsible Raw Telemetry Data Table */}
        {showTableDrawer && (
          <div className="mt-3 pt-3 border-t border-slate-100 max-h-56 overflow-y-auto font-mono text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase">
                  <th className="py-1 px-2">Index</th>
                  <th className="py-1 px-2">Offset</th>
                  <th className="py-1 px-2">Vib RMS</th>
                  <th className="py-1 px-2">Δ Vib</th>
                  <th className="py-1 px-2">Max EGT</th>
                  <th className="py-1 px-2">Cyl 3 EGT</th>
                  <th className="py-1 px-2">Δ EGT</th>
                  <th className="py-1 px-2">Oil Press</th>
                  <th className="py-1 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.slice().reverse().map((pt) => (
                  <tr key={pt.index} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-1 px-2 text-slate-500">#{pt.index}</td>
                    <td className="py-1 px-2 font-bold text-slate-700">{pt.timeLabel}</td>
                    <td className={`py-1 px-2 ${pt.vibration >= 3.2 ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                      {pt.vibration}
                    </td>
                    <td className="py-1 px-2 text-slate-500">+{pt.vibrationResidual}</td>
                    <td className={`py-1 px-2 ${pt.egtMax >= 740 ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                      {pt.egtMax}°C
                    </td>
                    <td className={`py-1 px-2 ${pt.egt3 >= 740 ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                      {pt.egt3}°C
                    </td>
                    <td className="py-1 px-2 text-slate-500">+{pt.egtResidual}°C</td>
                    <td className="py-1 px-2 text-slate-700">{pt.oilPressure} bar</td>
                    <td className="py-1 px-2">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        pt.isThresholdTripped ? 'bg-rose-100 text-rose-700' :
                        pt.isEarlyWarning ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {pt.isThresholdTripped ? 'TRIPPED' : pt.isEarlyWarning ? 'EARLY WARN' : 'NOMINAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

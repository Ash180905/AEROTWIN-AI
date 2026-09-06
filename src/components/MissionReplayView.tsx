import React, { useState } from 'react';
import { MISSION_034_REPLAY } from '../utils/simulationData';
import { MissionReplayEvent } from '../types';
import { 
  History, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  TrendingDown,
  PlaneTakeoff,
  PlaneLanding,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

export const MissionReplayView: React.FC = () => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeEvent = MISSION_034_REPLAY[currentStepIdx];

  // Auto-play replay
  React.useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= MISSION_034_REPLAY.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <History className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-sm font-bold font-mono tracking-wider text-slate-900 uppercase flex items-center gap-2">
                Mission 034 Flight Replay & Telemetry Investigation
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                POST-FLIGHT AUDIT
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Chronological mission playback demonstrating early bearing anomaly detection, RUL collapse, and tactical RTB diversion
            </p>
          </div>

          {/* Player controls */}
          <div className="flex items-center gap-2">
            <button
              id="btn-replay-prev"
              disabled={currentStepIdx === 0}
              onClick={() => setCurrentStepIdx(p => Math.max(0, p - 1))}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              id="btn-replay-play"
              onClick={() => setIsPlaying(p => !p)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold transition cursor-pointer shadow-sm shadow-indigo-200"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE REPLAY' : 'AUTO-PLAY'}</span>
            </button>

            <button
              id="btn-replay-next"
              disabled={currentStepIdx === MISSION_034_REPLAY.length - 1}
              onClick={() => setCurrentStepIdx(p => Math.min(MISSION_034_REPLAY.length - 1, p + 1))}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline Milestone Stepper */}
        <div className="my-6">
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-slate-200 rounded-full"></div>
            <div
              className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-indigo-600 rounded-full transition-all duration-300"
              style={{
                width: `${(currentStepIdx / (MISSION_034_REPLAY.length - 1)) * 100}%`
              }}
            ></div>

            {/* Step markers */}
            <div className="relative flex justify-between">
              {MISSION_034_REPLAY.map((evt, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const isCritical = evt.faultProb > 50;

                return (
                  <button
                    key={idx}
                    id={`replay-milestone-${idx}`}
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIdx(idx);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-bold transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 scale-125 shadow-md'
                          : isCritical
                          ? 'bg-rose-50 border-2 border-rose-400 text-rose-700'
                          : isPassed
                          ? 'bg-indigo-50 border-2 border-indigo-400 text-indigo-700'
                          : 'bg-slate-100 border border-slate-200 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className={`text-[10px] font-mono mt-2 transition ${
                      isCurrent ? 'text-indigo-600 font-bold' : 'text-slate-500'
                    }`}>
                      {evt.timeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Milestone Card */}
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                PHASE: {activeEvent.phase}
              </span>
              <span className="text-xs font-mono text-slate-500">
                MET: {activeEvent.timeLabel} HRS
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900">
              {activeEvent.eventTitle}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              {activeEvent.summary}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5 font-semibold">
                Synchronized Health
              </span>
              <div className="flex justify-between items-center text-xs font-mono mb-1">
                <span className="text-slate-600">Engine Health Index:</span>
                <span className={`font-bold ${activeEvent.engineHealth > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {activeEvent.engineHealth}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono mb-2">
                <span className="text-slate-600">Fault Probability:</span>
                <span className={`font-bold ${activeEvent.faultProb > 50 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {activeEvent.faultProb}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center pt-2.5 border-t border-slate-100">
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[9px]">RPM</span>
                <span className="text-slate-800 font-bold">{activeEvent.telemetrySnapshot.rpm}</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[9px]">OIL P</span>
                <span className="text-slate-800 font-bold">{activeEvent.telemetrySnapshot.oilPressure}b</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[9px]">VIB</span>
                <span className="text-slate-800 font-bold">{activeEvent.telemetrySnapshot.vibration}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Replay Telemetry Trends Graph */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <TrendingDown className="w-4 h-4 text-indigo-600" />
            </div>
            <h4 className="text-xs font-bold font-mono text-slate-900 uppercase">
              Degradation Trajectory Across Mission 034 (Vibration vs Oil Pressure)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            SAMPLING: 1 Hz DOWN-SAMPLED FLIGHT RECORDER
          </span>
        </div>

        {/* SVG Chart */}
        <div className="w-full h-48 bg-slate-950 rounded-xl p-4 relative flex items-end shadow-inner">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 700 160">
            {/* Grid lines */}
            <line x1="0" y1="40" x2="700" y2="40" stroke="#334155" strokeDasharray="4 4" strokeWidth="0.8" />
            <line x1="0" y1="80" x2="700" y2="80" stroke="#334155" strokeDasharray="4 4" strokeWidth="0.8" />
            <line x1="0" y1="120" x2="700" y2="120" stroke="#334155" strokeDasharray="4 4" strokeWidth="0.8" />

            {/* Vibration line (rising) */}
            <polyline
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.5"
              points="20,120 120,118 220,95 320,75 420,55 520,38 620,48 680,130"
            />

            {/* Oil Pressure line (falling) */}
            <polyline
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              points="20,40 120,42 220,50 320,65 420,80 520,95 620,98 680,105"
            />

            {/* Vertical scrubber marker */}
            <line
              x1={20 + (currentStepIdx / (MISSION_034_REPLAY.length - 1)) * 660}
              y1="0"
              x2={20 + (currentStepIdx / (MISSION_034_REPLAY.length - 1)) * 660}
              y2="160"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
          </svg>

          {/* Legend */}
          <div className="absolute top-3 right-4 flex items-center gap-4 text-[10px] font-mono bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700 shadow-md">
            <span className="flex items-center gap-1.5 text-purple-300">
              <span className="w-2.5 h-0.5 bg-purple-400 inline-block"></span> Vibration (Rising)
            </span>
            <span className="flex items-center gap-1.5 text-indigo-300">
              <span className="w-2.5 h-0.5 bg-indigo-400 inline-block"></span> Oil Pressure (Decaying)
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> Replay Cursor
            </span>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-emerald-600 font-mono font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Outcome: AeroTwin AI prevented UAV loss. Asset safely recovered 23 minutes before projected mechanical seizure.
          </span>
          <span className="font-mono text-slate-500 text-[11px] font-semibold">
            SAVED ASSET VALUE: ₹38.5 CRORE ($4.6M USD)
          </span>
        </div>
      </div>
    </div>
  );
};

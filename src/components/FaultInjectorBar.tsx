import React from 'react';
import { FaultPreset, EngineTelemetry } from '../types';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Flame, 
  Wrench, 
  Droplets, 
  RadioTower, 
  CheckCircle2,
  Gauge,
  Sliders,
  Radio
} from 'lucide-react';

interface FaultInjectorBarProps {
  activePreset: FaultPreset;
  onSelectPreset: (preset: FaultPreset) => void;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  simSpeed: number;
  setSimSpeed: (speed: number) => void;
  onReset: () => void;
  telemetry: EngineTelemetry;
  onThrottleChange: (val: number) => void;
  onAltitudeChange: (val: number) => void;
}

export const FaultInjectorBar: React.FC<FaultInjectorBarProps> = ({
  activePreset,
  onSelectPreset,
  isRunning,
  setIsRunning,
  simSpeed,
  setSimSpeed,
  onReset,
  telemetry,
  onThrottleChange,
  onAltitudeChange,
}) => {
  const presets: { id: FaultPreset; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'NORMAL',
      label: 'Normal Flight Profile',
      desc: 'Healthy baseline across all 12 sensor channels',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'hover:border-emerald-500'
    },
    {
      id: 'BEARING_LUBRICATION',
      label: 'Bearing & Oil Degradation',
      desc: 'Vibration 2.1→4.6, Oil P 4.8→3.3 bar, Oil T 88→105°C',
      icon: <Wrench className="w-3.5 h-3.5" />,
      color: 'hover:border-rose-500'
    },
    {
      id: 'INJECTOR_MISFIRE',
      label: 'Cyl #3 Injector Misfire',
      desc: 'Cyl 3 EGT 690→785°C, fuel jitter, 0.5x crank harmonic',
      icon: <Flame className="w-3.5 h-3.5" />,
      color: 'hover:border-amber-500'
    },
    {
      id: 'COOLING_LEAK',
      label: 'Cooling Jacket Depressurization',
      desc: 'Coolant 82→118°C, bulk CHT climb, thermal emergency',
      icon: <Droplets className="w-3.5 h-3.5" />,
      color: 'hover:border-red-500'
    },
    {
      id: 'SENSOR_MALFUNCTION',
      label: 'Sensor Glitch (Thermocouple #2)',
      desc: 'Ghost CHT spike to 325°C while oil & EGT remain cold',
      icon: <RadioTower className="w-3.5 h-3.5" />,
      color: 'hover:border-cyan-500'
    }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
            Physics Telemetry Stream & Controlled Degradation Injection
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
            SIH Demonstration Testbed
          </span>
        </div>

        {/* Play / Speed Controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-sim"
            onClick={() => setIsRunning(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer shadow-xs ${
              isRunning 
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'PAUSE STREAM' : 'RUN STREAM'}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5 text-xs font-mono">
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                id={`btn-speed-${speed}x`}
                onClick={() => setSimSpeed(speed)}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  simSpeed === speed 
                    ? 'bg-white text-indigo-600 font-bold shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Reset button */}
          <button
            id="btn-reset-sim"
            onClick={onReset}
            title="Reset telemetry to nominal cruise"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-mono font-medium transition cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Preset Injection Buttons */}
      <div className="my-4">
        <div className="text-[11px] font-mono text-slate-500 mb-2.5 flex items-center justify-between font-medium">
          <span>SELECT DEGRADATION TRAJECTORY (Inject Fault into Digital Twin):</span>
          <span className="text-indigo-600 font-bold">ACTIVE: {activePreset}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {presets.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                id={`preset-btn-${p.id}`}
                onClick={() => onSelectPreset(p.id)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-slate-900 mb-1">
                    <span className={isSelected ? 'text-indigo-600' : 'text-slate-500'}>
                      {p.icon}
                    </span>
                    <span className="truncate">{p.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-mono">
                    {p.desc}
                  </p>
                </div>
                <span className={`text-[9px] font-mono mt-3 self-start px-2 py-0.5 rounded font-bold border ${
                  isSelected 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white text-slate-500 border-slate-200'
                }`}>
                  {isSelected ? 'INJECTED' : 'INJECT'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Manual Throttle & Altitude Controls */}
      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-mono">
        <div>
          <div className="flex justify-between text-slate-700 mb-1.5">
            <span>FADEC THROTTLE ANGLE: <strong className="text-indigo-600 font-bold">{telemetry.throttle}%</strong></span>
            <span className="text-slate-500">RPM: {telemetry.rpm}</span>
          </div>
          <input
            id="slider-throttle"
            type="range"
            min="20"
            max="100"
            value={telemetry.throttle}
            onChange={(e) => onThrottleChange(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-700 mb-1.5">
            <span>FLIGHT LEVEL (ALTITUDE): <strong className="text-indigo-600 font-bold">{telemetry.altitude.toLocaleString()} ft</strong></span>
            <span className="text-slate-500">AIR TEMP: {telemetry.ambientTemp}°C</span>
          </div>
          <input
            id="slider-altitude"
            type="range"
            min="1000"
            max="30000"
            step="500"
            value={telemetry.altitude}
            onChange={(e) => onAltitudeChange(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
          />
        </div>
      </div>
    </div>
  );
};

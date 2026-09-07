import React from 'react';
import { 
  ShieldCheck, 
  Radio, 
  Cpu, 
  Plane, 
  Activity, 
  GitFork, 
  History, 
  Sliders, 
  FileText,
  WifiOff,
  Lock,
  Box
} from 'lucide-react';
import { UAVFleetItem } from '../types';

interface HeaderProps {
  activeTab: 'twin' | '3d-twin' | 'counterfactual' | 'replay' | 'whatif' | 'passport';
  setActiveTab: (tab: 'twin' | '3d-twin' | 'counterfactual' | 'replay' | 'whatif' | 'passport') => void;
  selectedUav: UAVFleetItem;
  setSelectedUavId: (id: string) => void;
  fleet: UAVFleetItem[];
  isCommsBlackout: boolean;
  setIsCommsBlackout: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedUav,
  setSelectedUavId,
  fleet,
  isCommsBlackout,
  setIsCommsBlackout
}) => {
  return (
    <header className="border-b border-slate-200 bg-white text-slate-900 sticky top-0 z-40 shadow-xs">
      {/* Top Banner: Defense Classification & System Identity */}
      <div className="px-4 sm:px-6 py-2 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SIH26054 DEFENSE AI COGNITION
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-slate-600 font-mono font-medium hidden md:inline text-[11px]">
            DRDO MALE UAV AERO PISTON DIGITAL TWIN
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Telemetry link status */}
          <div className="flex items-center gap-2">
            {isCommsBlackout ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-800 font-mono text-[11px] font-semibold">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>COMMS BLACKOUT: AUTONOMOUS ONBOARD EDGE AI</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-600 font-mono text-[11px]">
                <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>EDGE TELEMETRY: 50Hz</span>
                </div>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-indigo-500" /> AES-256 GCM
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-500 hidden sm:inline">RTT: 42ms</span>
              </div>
            )}

            <button
              id="btn-toggle-comms-blackout"
              onClick={() => setIsCommsBlackout(prev => !prev)}
              title="Simulate Satellite Comms Loss to test Onboard Autonomous Edge AI"
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold transition cursor-pointer ${
                isCommsBlackout 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              {isCommsBlackout ? 'Restore GCS Link' : 'Simulate Link Drop'}
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

          {/* Active Airframe selector */}
          <div className="flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-500 font-mono text-[11px]">AIRFRAME:</span>
            <select
              id="select-fleet-airframe"
              value={selectedUav.id}
              onChange={(e) => setSelectedUavId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs cursor-pointer"
            >
              {fleet.map((uav) => (
                <option key={uav.id} value={uav.id}>
                  {uav.tailNumber} ({uav.id}) — {uav.healthPercent}%
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200 border border-indigo-500">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                AeroTwin AI
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                  v3.4 Hybrid Twin
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Physics-Informed Propulsion Health & Mission Reliability Command
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 overflow-x-auto max-w-full">
          <button
            id="tab-live-twin"
            onClick={() => setActiveTab('twin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeTab === 'twin'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Digital Twin Cockpit</span>
          </button>

          <button
            id="tab-3d-twin"
            onClick={() => setActiveTab('3d-twin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeTab === '3d-twin'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-indigo-400" />
            <span>3D Virtual Twin</span>
            <span className={`text-[9px] px-1 py-0.5 rounded font-mono font-bold ${
              activeTab === '3d-twin'
                ? 'bg-indigo-500/80 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              60 FPS
            </span>
          </button>

          <button
            id="tab-counterfactual"
            onClick={() => setActiveTab('counterfactual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeTab === 'counterfactual'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Counterfactual & XAI</span>
          </button>

          <button
            id="tab-mission-replay"
            onClick={() => setActiveTab('replay')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeTab === 'replay'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Mission 034 Replay</span>
          </button>

          <button
            id="tab-what-if"
            onClick={() => setActiveTab('whatif')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeTab === 'whatif'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>What-If Planner</span>
          </button>

          <button
            id="tab-passport"
            onClick={() => setActiveTab('passport')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeTab === 'passport'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Passport & Fleet</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

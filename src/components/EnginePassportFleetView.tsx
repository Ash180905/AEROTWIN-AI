import React, { useState } from 'react';
import { SAMPLE_ENGINE_PASSPORT, SAMPLE_FLEET } from '../utils/simulationData';
import { UAVFleetItem } from '../types';
import { 
  FileText, 
  Plane, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Award,
  ChevronRight,
  Database
} from 'lucide-react';

interface EnginePassportFleetViewProps {
  onSelectUav: (uav: UAVFleetItem) => void;
  selectedUavId: string;
}

export const EnginePassportFleetView: React.FC<EnginePassportFleetViewProps> = ({
  onSelectUav,
  selectedUavId,
}) => {
  const [subTab, setSubTab] = useState<'passport' | 'fleet'>('passport');
  const passport = SAMPLE_ENGINE_PASSPORT;

  return (
    <div className="space-y-4">
      {/* Sub navigation bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            id="tab-sub-passport"
            onClick={() => setSubTab('passport')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
              subTab === 'passport'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Digital Engine Passport (AE-2047)</span>
          </button>

          <button
            id="tab-sub-fleet"
            onClick={() => setSubTab('fleet')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
              subTab === 'fleet'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>MALE UAV Fleet Readiness (5 Airframes)</span>
          </button>
        </div>

        <div className="text-xs font-mono text-slate-500 hidden sm:flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-semibold">DRDO SECURE PROPULSION REGISTRY</span>
        </div>
      </div>

      {/* Subtab 1: Digital Engine Passport */}
      {subTab === 'passport' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Identity & Lifetime Metrics */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs font-mono">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {passport.engineId} PASSPORT
                </h3>
                <span className="text-[11px] text-slate-500">
                  {passport.serialNumber}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-sans">ENGINE MODEL</span>
                <span className="text-slate-800 font-bold text-xs">{passport.model}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-sans">ASSIGNED AIRFRAME</span>
                <span className="text-indigo-600 font-bold text-xs">{passport.uavAirframe}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-sans">FLIGHT HOURS</span>
                  <span className="text-base font-black text-slate-900">{passport.totalFlightHours}h</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-sans">TOTAL MISSIONS</span>
                  <span className="text-base font-black text-slate-900">{passport.totalMissions}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">SINCE OVERHAUL</span>
                  <span className="text-slate-800 font-bold">{passport.lastOverhaulHoursAgo}h</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block font-sans">NEXT SERVICE DUE</span>
                  <span className="text-amber-600 font-bold">in {passport.nextScheduledMaintenanceHours}h</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed">
              ✓ Tamper-proof cryptographic signature verified by Ground Maintenance Command.
            </div>
          </div>

          {/* Component Life Limit Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <Layers className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                  Component Life Limit & Degradation Matrix
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                TOTAL LIFE ACCUMULATION (TBO: 2,000 Hours)
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              {passport.lifeLimits.map((c, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-800 font-semibold">{c.component}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[11px]">
                        {c.consumedHours} / {c.maxHours} Hours
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] border ${
                        c.healthPercent < 75 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {c.healthPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        c.healthPercent < 75 ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${(c.consumedHours / c.maxHours) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Maintenance History Ledger */}
            <div className="pt-3 mt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold font-mono text-slate-800 uppercase mb-3 flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                Historical Maintenance & Service Ledger
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-[11px] font-mono">
                {passport.maintenanceLogs.map((log, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-slate-800 font-semibold mb-1">
                      <span>{log.type}</span>
                      <span className="text-slate-500">{log.date}</span>
                    </div>
                    <p className="text-slate-600">{log.details}</p>
                    <span className="text-[10px] text-indigo-600 font-semibold block mt-1">Signed: {log.technician}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: MALE UAV Fleet Readiness */}
      {subTab === 'fleet' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <Plane className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold font-mono tracking-wider text-slate-900 uppercase">
                  MALE UAV Fleet Command & Engine Health Overview
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time operational readiness across all deployed Tapas / MALE airframes
              </p>
            </div>

            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg font-bold">
              4 OF 5 AIRFRAMES DEPLOYABLE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SAMPLE_FLEET.map((uav) => {
              const isSelected = selectedUavId === uav.id;

              return (
                <div
                  key={uav.id}
                  id={`fleet-card-${uav.id}`}
                  onClick={() => onSelectUav(uav)}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-slate-900">
                          {uav.tailNumber}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                          {uav.id}
                        </span>
                      </div>

                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        uav.status === 'AIRBORNE_NOMINAL' || uav.status === 'MISSION_READY'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : uav.status === 'AIRBORNE_CAUTION'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {uav.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-500 mb-3 space-y-0.5">
                      <div>Mission: <strong className="text-slate-800">{uav.missionCode}</strong></div>
                      <div>Zone: {uav.assignedZone}</div>
                    </div>

                    {/* Health & MRI progress */}
                    <div className="space-y-2.5 mb-3.5 font-mono text-xs">
                      <div>
                        <div className="flex justify-between text-slate-500 mb-1 font-sans">
                          <span>Engine Health Index</span>
                          <span className={`font-bold ${uav.healthPercent > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {uav.healthPercent}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              uav.healthPercent > 80 ? 'bg-emerald-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${uav.healthPercent}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-500 mb-1 font-sans">
                          <span>Mission Reliability (MRI)</span>
                          <span className="font-bold text-indigo-600">{uav.mriPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${uav.mriPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Flight: {uav.flightDuration}</span>
                    <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                      {isSelected ? 'MONITORING' : 'SELECT TWIN'} <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

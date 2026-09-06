import React from 'react';
import { RulPrediction, MissionReliability, FaultDiagnosis } from '../types';
import { 
  Hourglass, 
  Target, 
  TrendingDown, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  Compass
} from 'lucide-react';

interface RulMissionReliabilityProps {
  rul: RulPrediction;
  reliability: MissionReliability;
  diagnosis: FaultDiagnosis;
}

export const RulMissionReliability: React.FC<RulMissionReliabilityProps> = ({
  rul,
  reliability,
  diagnosis,
}) => {
  const isHealthy = reliability.missionCompletionProbability >= 85;
  const isCaution = reliability.missionCompletionProbability < 85 && reliability.missionCompletionProbability >= 50;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      {/* Top Banner */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              Remaining Useful Life & Mission Reliability (MRI)
            </h3>
            <span className="text-[11px] text-slate-500">
              Connecting Engine Physical Health to Tactical Mission Survivability
            </span>
          </div>

          <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
            DRDO SIH26054 KEY METRIC
          </div>
        </div>

        {/* Primary Twin Gauges: RUL & Mission Probability */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-4">
          {/* Card 1: Estimated RUL */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Hourglass className="w-3.5 h-3.5 text-indigo-600" />
                ESTIMATED ENGINE RUL
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                rul.degradationRate === 'ACCELERATING' 
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : rul.degradationRate === 'MODERATE'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {rul.degradationRate}
              </span>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black font-mono text-slate-900">
                {rul.estimatedHours} <span className="text-sm font-normal text-slate-500">Hours</span>
              </div>
              <div className="text-xs font-mono text-slate-500">
                Confidence Bound: ±{rul.marginHours} Hours
              </div>
            </div>

            {rul.criticalFailureEtaMinutes ? (
              <div className="text-xs font-mono px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1.5 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                Failure Projected in: <span className="font-bold">{rul.criticalFailureEtaMinutes} mins</span>
              </div>
            ) : (
              <div className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
                Maintenance Priority: <span className="text-emerald-600 font-bold">{rul.maintenancePriority}</span>
              </div>
            )}
          </div>

          {/* Card 2: Mission Completion Probability */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                MISSION COMPLETION PROBABILITY
              </span>
              <span className="text-xs font-bold text-indigo-600 font-mono">
                MRI: {reliability.missionReliabilityIndex}%
              </span>
            </div>

            <div className="my-2">
              <div className={`text-2xl font-black font-mono ${
                isHealthy ? 'text-emerald-600' : isCaution ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {reliability.missionCompletionProbability}%
              </div>
              <div className="text-xs font-mono text-slate-500">
                Remaining Flight: {reliability.missionRemainingHours}h / {reliability.missionTotalHours}h
              </div>
            </div>

            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isHealthy ? 'bg-emerald-500' : isCaution ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${reliability.missionCompletionProbability}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Mission Safe Margin Assessment */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-3 text-xs font-mono">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-600 font-medium">Safe Operating Health Margin:</span>
            <span className={`font-bold ${reliability.safeMarginHours > 5 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {reliability.safeMarginHours > 0 ? `+${reliability.safeMarginHours} Hours Margin` : `${reliability.safeMarginHours} Hours DEFICIT`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {reliability.safeMarginHours > 6
              ? 'Engine has ample predicted health margin to safely complete the full surveillance patrol.'
              : reliability.safeMarginHours > 0
              ? 'Health margin narrowing. Close engine monitoring required during high-altitude loiter.'
              : 'CRITICAL: Engine failure predicted before scheduled mission completion. Mission abort protocol advised.'}
          </p>
        </div>

        {/* Risk Breakdown Category Matrix */}
        <div className="space-y-1.5 my-2">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block font-semibold">
            Systemic Risk Sub-Factors
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {reliability.risks.map((risk, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">{risk.system} Risk</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  risk.level === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                  risk.level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {risk.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono flex items-center justify-between">
        <span>DEGRADATION MODEL: LSTM + SURVIVAL REGRESSION</span>
        <span className="text-indigo-600 font-bold">ALGORITHM CONFIDENCE: 92.4%</span>
      </div>
    </div>
  );
};

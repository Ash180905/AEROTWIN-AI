import React, { useState } from 'react';
import { CounterfactualOption, EngineTelemetry, FaultDiagnosis } from '../types';
import { 
  GitFork, 
  CheckCircle2, 
  AlertTriangle, 
  Compass, 
  Radio, 
  ArrowRight, 
  ShieldCheck,
  Send,
  Zap
} from 'lucide-react';

interface CounterfactualAdvisorProps {
  options: CounterfactualOption[];
  telemetry: EngineTelemetry;
  diagnosis: FaultDiagnosis;
  onApplyOption: (option: CounterfactualOption) => void;
}

export const CounterfactualAdvisor: React.FC<CounterfactualAdvisorProps> = ({
  options,
  telemetry,
  diagnosis,
  onApplyOption,
}) => {
  const [activeIntervention, setActiveIntervention] = useState<string | null>(null);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);

  const handleApply = (opt: CounterfactualOption) => {
    setActiveIntervention(opt.id);
    onApplyOption(opt);
    setDispatchNotice(`TACTICAL ACTION EXECUTED: ${opt.title}. Autopilot flight profile updated. Engine de-rate commanded via CAN bus.`);
    setTimeout(() => setDispatchNotice(null), 7000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <GitFork className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase flex items-center gap-2">
              Counterfactual Mission AI (Decision Support Engine)
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
              Counterfactual Reasoning
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Answers: <strong className="text-slate-700">"What action gives the highest chance of saving the UAV and completing the mission?"</strong>
          </p>
        </div>

        <div className="text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
          CURRENT STATE: <span className={diagnosis.severity === 'CRITICAL' ? 'text-rose-600 font-bold' : diagnosis.severity === 'WARNING' ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>{diagnosis.faultTitle}</span>
        </div>
      </div>

      {/* Dispatch confirmation toast */}
      {dispatchNotice && (
        <div className="my-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-mono flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600 animate-bounce" />
            <span>{dispatchNotice}</span>
          </div>
          <span className="text-[10px] text-indigo-700 uppercase font-bold">FADEC COMMAND LINK OK</span>
        </div>
      )}

      {/* 4 Counterfactual Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-4">
        {options.map((opt) => {
          const isSelected = activeIntervention === opt.id;
          const isRec = opt.isRecommended;

          return (
            <div
              key={opt.id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                isSelected
                  ? 'bg-indigo-50/70 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                  : isRec
                  ? 'bg-white border-2 border-indigo-500/80 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center font-bold font-mono text-xs text-slate-700 border border-slate-200">
                      {opt.id}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {opt.title}
                    </span>
                  </div>

                  {isRec && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      AI RECOMMENDED
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  {opt.description}
                </p>

                {/* Risk and Recovery Scores */}
                <div className="grid grid-cols-2 gap-2 mb-3 font-mono text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Failure Risk</span>
                    <span className={`text-base font-bold ${
                      opt.failureRiskPercent > 60 ? 'text-rose-600' :
                      opt.failureRiskPercent > 30 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {opt.failureRiskPercent}%
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Airframe Recovery</span>
                    <span className="text-base font-bold text-indigo-600">
                      {opt.missionRecoveryPercent}%
                    </span>
                  </div>
                </div>

                {/* Tactical outcome */}
                <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 mb-3 leading-relaxed">
                  <span className="text-slate-800 font-bold block mb-0.5">Projected Outcome:</span>
                  {opt.tacticalOutcome}
                </div>
              </div>

              {/* Action Button */}
              <button
                id={`btn-apply-option-${opt.id}`}
                onClick={() => handleApply(opt)}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isRec
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    APPLIED TO FLIGHT COMPUTER
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    EXECUTE INTERVENTION ({opt.adjustedRpm} RPM)
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Counterfactual optimization simulates 10,000 aerothermal trajectory states every 2 seconds.
        </span>
        <span className="font-mono text-[11px] text-slate-400">
          UAV ACTUATOR LATENCY: 120ms
        </span>
      </div>
    </div>
  );
};

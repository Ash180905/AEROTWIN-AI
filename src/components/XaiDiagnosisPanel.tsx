import React from 'react';
import { FaultDiagnosis } from '../types';
import { Sparkles, BrainCircuit, CheckCircle2, AlertTriangle, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface XaiDiagnosisPanelProps {
  diagnosis: FaultDiagnosis;
}

export const XaiDiagnosisPanel: React.FC<XaiDiagnosisPanelProps> = ({ diagnosis }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <BrainCircuit className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase flex items-center gap-2">
              Explainable AI (XAI) Feature Attribution & Diagnostic Evidence
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
              SHAP Value Analysis
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Transparent breakdown revealing <em>why</em> the AI classified this specific propulsion state
          </p>
        </div>

        <div className="text-xs font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg font-bold">
          DIAGNOSTIC CONFIDENCE: {diagnosis.confidence}%
        </div>
      </div>

      {/* Main Diagnosis Summary */}
      <div className="my-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-bold font-mono text-slate-500">
            AI CLASSIFICATION & ROOT CAUSE
          </span>
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
            diagnosis.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            diagnosis.severity === 'WARNING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            diagnosis.severity === 'ADVISORY' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
            'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            SEVERITY: {diagnosis.severity}
          </span>
        </div>
        <h4 className="text-base font-bold text-slate-900 mb-2">
          {diagnosis.faultTitle}
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          {diagnosis.recommendedAction}
        </p>
      </div>

      {/* SHAP Attribution Waterfall Bars */}
      <div className="my-4">
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2.5">
          <span className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Parameter SHAP Attribution Breakdown
          </span>
          <span>% Relative Influence on Diagnosis</span>
        </div>

        <div className="space-y-2.5">
          {diagnosis.shapAttributions.map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                  {item.direction === 'increase' ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  {item.parameter}
                </span>
                <span className="text-indigo-600 font-bold">
                  +{item.contributionPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full bg-indigo-600"
                  style={{ width: `${item.contributionPercent}%` }}
                ></div>
              </div>

              <div className="text-[11px] text-slate-500">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostic Evidence Chain */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        <span className="text-xs font-mono font-bold text-slate-700 uppercase block mb-2.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          Multivariate Sensor Fusion Evidence Log
        </span>
        <ul className="space-y-1.5 text-slate-600 font-mono text-[11px]">
          {diagnosis.evidenceText.map((ev, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span>{ev}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

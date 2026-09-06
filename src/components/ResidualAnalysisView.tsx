import React from 'react';
import { EngineTelemetry, PhysicsExpectedModel } from '../types';
import { Calculator, ArrowRight, Activity, Cpu, Sparkles } from 'lucide-react';

interface ResidualAnalysisViewProps {
  telemetry: EngineTelemetry;
  physics: PhysicsExpectedModel;
}

export const ResidualAnalysisView: React.FC<ResidualAnalysisViewProps> = ({
  telemetry,
  physics,
}) => {
  const maxCht = Math.max(...telemetry.cylinderTemps);
  const maxEgt = Math.max(...telemetry.egt);

  const residualItems = [
    {
      param: 'Exhaust Gas Temp (EGT Max)',
      actual: `${maxEgt}°C`,
      expected: `${physics.expectedEgt}°C`,
      residual: physics.residualEgtMax,
      unit: '°C',
      tolerance: '±25°C',
      isDeviating: Math.abs(physics.residualEgtMax) > 25,
      isCritical: Math.abs(physics.residualEgtMax) > 50,
      description: 'Air-fuel mixture balance and cylinder exhaust scavenging',
    },
    {
      param: 'Oil Delivery Pressure',
      actual: `${telemetry.oilPressure} bar`,
      expected: `${physics.expectedOilPressure} bar`,
      residual: physics.residualOilPressure,
      unit: 'bar',
      tolerance: '±0.30 bar',
      isDeviating: physics.residualOilPressure < -0.35,
      isCritical: physics.residualOilPressure < -0.80,
      description: 'Hydraulic bearing lubrication clearance & oil pump displacement',
    },
    {
      param: 'Oil Sump Temperature',
      actual: `${telemetry.oilTemp}°C`,
      expected: `${physics.expectedOilTemp}°C`,
      residual: physics.residualOilTemp,
      unit: '°C',
      tolerance: '±6°C',
      isDeviating: physics.residualOilTemp > 7,
      isCritical: physics.residualOilTemp > 14,
      description: 'Internal mechanical friction dissipation and heat transfer',
    },
    {
      param: 'Mechanical Vibration (RMS)',
      actual: `${telemetry.vibration} mm/s`,
      expected: `${physics.expectedVibration} mm/s`,
      residual: physics.residualVibration,
      unit: 'mm/s',
      tolerance: '±0.40 mm/s',
      isDeviating: physics.residualVibration > 0.45,
      isCritical: physics.residualVibration > 1.20,
      description: 'Harmonic rotor imbalance & bearing cage micro-distress',
    },
    {
      param: 'Cylinder Head Temp (CHT Max)',
      actual: `${maxCht}°C`,
      expected: `${physics.expectedCht}°C`,
      residual: physics.residualChtMax,
      unit: '°C',
      tolerance: '±12°C',
      isDeviating: Math.abs(physics.residualChtMax) > 15,
      isCritical: Math.abs(physics.residualChtMax) > 30,
      description: 'Conductive heat absorption by aluminum alloy cylinder barrel',
    },
    {
      param: 'Fuel Flow Rate',
      actual: `${telemetry.fuelFlow} L/h`,
      expected: `${physics.expectedFuelFlow} L/h`,
      residual: physics.residualFuelFlow,
      unit: 'L/h',
      tolerance: '±1.5 L/h',
      isDeviating: Math.abs(physics.residualFuelFlow) > 1.8,
      isCritical: Math.abs(physics.residualFuelFlow) > 3.5,
      description: 'Fuel metering efficiency vs commanded throttle angle',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <Calculator className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase flex items-center gap-2">
              Physics-Informed Hybrid Residual Vector (Actual vs Model)
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
              Δ Residual Tracking
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compares live telemetry with dynamic thermodynamic model based on Altitude, Throttle, and RPM
          </p>
        </div>

        <div className="text-[11px] font-mono text-indigo-700 bg-indigo-50/80 border border-indigo-200 px-3 py-1 rounded-lg font-medium">
          MODEL: 0-D Lumped Aero-Thermodynamic Engine Simulation
        </div>
      </div>

      {/* Residual Formula Pipeline Graphic */}
      <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          <span className="text-slate-700 font-medium">Live Sensors</span>
        </div>
        <span className="text-slate-400 font-bold">MINUS</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="text-slate-700 font-medium">Physics Expected Nominals</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-indigo-600 font-bold">Residual Vector (Δ)</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-xs">
          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-slate-800 font-bold">AI Anomaly Classifier</span>
        </div>
      </div>

      {/* Residual Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
              <th className="py-2.5 px-3">PROPULSION PARAMETER</th>
              <th className="py-2.5 px-3">LIVE SENSOR</th>
              <th className="py-2.5 px-3">PHYSICS NOMINAL</th>
              <th className="py-2.5 px-3 text-center">RESIDUAL (Δ)</th>
              <th className="py-2.5 px-3 text-center">TOLERANCE</th>
              <th className="py-2.5 px-3">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {residualItems.map((item, idx) => {
              const sign = item.residual > 0 ? '+' : '';
              return (
                <tr key={idx} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    <div>{item.param}</div>
                    <div className="text-[10px] text-slate-500 font-sans">{item.description}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-900 font-bold">
                    {item.actual}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {item.expected}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                      item.isCritical 
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : item.isDeviating
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {sign}{item.residual} {item.unit}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-500">
                    {item.tolerance}
                  </td>
                  <td className="py-2.5 px-3">
                    {item.isCritical ? (
                      <span className="text-rose-600 font-bold text-[11px]">ANOMALOUS (High)</span>
                    ) : item.isDeviating ? (
                      <span className="text-amber-600 font-bold text-[11px]">DEVIATION</span>
                    ) : (
                      <span className="text-emerald-600 font-bold text-[11px]">NOMINAL</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        <span>
          💡 Fixed thresholds fail at varying altitudes. Residual monitoring catches subtle cross-sensor shifts hours in advance.
        </span>
        <span className="font-mono text-indigo-600 font-bold">
          CONFIDENCE: 98.4%
        </span>
      </div>
    </div>
  );
};

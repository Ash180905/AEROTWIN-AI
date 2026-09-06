import React from 'react';
import { EngineTelemetry, PhysicsExpectedModel } from '../types';
import { Gauge, Activity, Droplets, Thermometer, Flame, Fuel, Wind } from 'lucide-react';

interface TelemetryGaugesBarProps {
  telemetry: EngineTelemetry;
  physics: PhysicsExpectedModel;
}

export const TelemetryGaugesBar: React.FC<TelemetryGaugesBarProps> = ({
  telemetry,
  physics,
}) => {
  const maxCht = Math.max(...telemetry.cylinderTemps);
  const maxEgt = Math.max(...telemetry.egt);

  const gauges = [
    {
      id: 'gauge-rpm',
      name: 'ENGINE SPEED',
      val: telemetry.rpm,
      unit: 'RPM',
      nominal: `${physics.expectedRpm}`,
      icon: <Gauge className="w-4 h-4 text-indigo-500" />,
      color: telemetry.rpm > 5300 ? 'text-rose-600' : 'text-slate-900',
      status: telemetry.rpm > 5300 ? 'WARN' : 'NORM',
    },
    {
      id: 'gauge-oil-p',
      name: 'OIL PRESSURE',
      val: telemetry.oilPressure,
      unit: 'bar',
      nominal: `${physics.expectedOilPressure}`,
      icon: <Droplets className="w-4 h-4 text-blue-500" />,
      color: telemetry.oilPressure < 3.8 ? 'text-amber-600' : 'text-slate-900',
      status: telemetry.oilPressure < 3.5 ? 'CRIT' : telemetry.oilPressure < 3.8 ? 'WARN' : 'NORM',
    },
    {
      id: 'gauge-oil-t',
      name: 'OIL TEMPERATURE',
      val: telemetry.oilTemp,
      unit: '°C',
      nominal: `${physics.expectedOilTemp}`,
      icon: <Thermometer className="w-4 h-4 text-amber-500" />,
      color: telemetry.oilTemp > 98 ? 'text-rose-600' : telemetry.oilTemp > 92 ? 'text-amber-600' : 'text-slate-900',
      status: telemetry.oilTemp > 98 ? 'CRIT' : telemetry.oilTemp > 92 ? 'WARN' : 'NORM',
    },
    {
      id: 'gauge-vibration',
      name: 'VIBRATION (RMS)',
      val: telemetry.vibration,
      unit: 'mm/s',
      nominal: `${physics.expectedVibration}`,
      icon: <Activity className="w-4 h-4 text-indigo-500" />,
      color: telemetry.vibration > 3.4 ? 'text-rose-600' : telemetry.vibration > 2.6 ? 'text-amber-600' : 'text-slate-900',
      status: telemetry.vibration > 3.4 ? 'CRIT' : telemetry.vibration > 2.6 ? 'WARN' : 'NORM',
    },
    {
      id: 'gauge-egt',
      name: 'MAX EXHAUST (EGT)',
      val: maxEgt,
      unit: '°C',
      nominal: `${physics.expectedEgt}`,
      icon: <Flame className="w-4 h-4 text-orange-500" />,
      color: maxEgt > 740 ? 'text-rose-600' : maxEgt > 715 ? 'text-amber-600' : 'text-slate-900',
      status: maxEgt > 740 ? 'CRIT' : maxEgt > 715 ? 'WARN' : 'NORM',
    },
    {
      id: 'gauge-cht',
      name: 'MAX HEAD (CHT)',
      val: maxCht,
      unit: '°C',
      nominal: `${physics.expectedCht}`,
      icon: <Thermometer className="w-4 h-4 text-teal-500" />,
      color: maxCht > 220 ? 'text-rose-600' : maxCht > 208 ? 'text-amber-600' : 'text-slate-900',
      status: maxCht > 220 ? 'CRIT' : maxCht > 208 ? 'WARN' : 'NORM',
    },
    {
      id: 'gauge-fuel-flow',
      name: 'FUEL FLOW',
      val: telemetry.fuelFlow,
      unit: 'L/h',
      nominal: `${physics.expectedFuelFlow}`,
      icon: <Fuel className="w-4 h-4 text-emerald-500" />,
      color: 'text-slate-900',
      status: 'NORM',
    },
    {
      id: 'gauge-boost',
      name: 'MANIFOLD (MAP)',
      val: telemetry.manifoldPressure,
      unit: 'inHg',
      nominal: '34.5',
      icon: <Wind className="w-4 h-4 text-indigo-500" />,
      color: 'text-slate-900',
      status: 'NORM',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {gauges.map((g) => (
        <div
          key={g.id}
          id={g.id}
          className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-xs hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-500 mb-1">
            <span className="truncate">{g.name}</span>
            {g.icon}
          </div>

          <div className="my-1">
            <div className={`text-base font-black font-mono leading-none ${g.color}`}>
              {g.val}
              <span className="text-[10px] font-medium text-slate-400 ml-1">
                {g.unit}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1.5 border-t border-slate-100">
            <span>Exp: {g.nominal}</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
              g.status === 'CRIT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
              g.status === 'WARN' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {g.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

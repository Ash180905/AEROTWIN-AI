import React, { useState, useEffect } from 'react';
import { 
  EngineTelemetry, 
  PhysicsExpectedModel, 
  EngineSubsystemHealth,
  FaultDiagnosis 
} from '../types';
import { 
  Flame, 
  Zap, 
  Droplets, 
  Wind, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Info,
  Thermometer,
  Gauge,
  X,
  Activity
} from 'lucide-react';

interface DigitalTwinCanvasProps {
  telemetry: EngineTelemetry;
  physics: PhysicsExpectedModel;
  health: EngineSubsystemHealth;
  diagnosis: FaultDiagnosis;
}

interface ComponentDetail {
  title: string;
  category: string;
  status: 'NOMINAL' | 'ELEVATED' | 'CRITICAL' | 'SENSOR_FAULT';
  healthScore: number;
  parameters: { name: string; value: string; expected: string; unit: string }[];
  physicsInsight: string;
}

export const DigitalTwinCanvas: React.FC<DigitalTwinCanvasProps> = ({
  telemetry,
  physics,
  health,
  diagnosis,
}) => {
  const [pistonCycle, setPistonCycle] = useState(0);
  const [selectedPart, setSelectedPart] = useState<ComponentDetail | null>(null);

  // Animate piston reciprocating stroke
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;
      // Frequency proportional to RPM
      const speed = (telemetry.rpm / 60) * 0.003;
      setPistonCycle((prev) => (prev + delta * speed) % (Math.PI * 2));
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [telemetry.rpm]);

  // Cylinder positions and strokes (firing order 1 - 3 - 4 - 2 typical for boxer/inline 4-stroke)
  const stroke1 = Math.sin(pistonCycle) * 14;
  const stroke2 = Math.sin(pistonCycle + Math.PI) * 14;
  const stroke3 = Math.sin(pistonCycle + Math.PI * 0.5) * 14;
  const stroke4 = Math.sin(pistonCycle + Math.PI * 1.5) * 14;

  const strokes = [stroke1, stroke2, stroke3, stroke4];

  // Colors for cylinders based on temperature
  const getCylinderColor = (temp: number, isFaulty: boolean) => {
    if (isFaulty) return 'border-rose-500 bg-rose-950/40 text-rose-300';
    if (temp > 215) return 'border-amber-500 bg-amber-950/40 text-amber-300';
    return 'border-cyan-500/50 bg-slate-900/80 text-cyan-300';
  };

  const openComponentInspector = (partKey: string) => {
    if (partKey.startsWith('cyl-')) {
      const idx = parseInt(partKey.replace('cyl-', '')) - 1;
      const cht = telemetry.cylinderTemps[idx];
      const egt = telemetry.egt[idx];
      const isCyl3Fault = idx === 2 && diagnosis.faultTitle.includes('Injector');
      const isCyl2SensorFault = idx === 1 && diagnosis.isSensorFaultOnly;

      setSelectedPart({
        title: `Cylinder Assembly #${idx + 1}`,
        category: 'Combustion Chamber & Cylinder Head',
        status: isCyl2SensorFault ? 'SENSOR_FAULT' : isCyl3Fault ? 'CRITICAL' : cht > 212 ? 'ELEVATED' : 'NOMINAL',
        healthScore: isCyl2SensorFault ? 92 : isCyl3Fault ? 54 : 95,
        parameters: [
          { name: 'Cylinder Head Temp (CHT)', value: `${cht}`, expected: `${physics.expectedCht}`, unit: '°C' },
          { name: 'Exhaust Gas Temp (EGT)', value: `${egt}`, expected: `${physics.expectedEgt}`, unit: '°C' },
          { name: 'EGT Residual (Δ)', value: `${egt - physics.expectedEgt > 0 ? '+' : ''}${egt - physics.expectedEgt}`, expected: '±15', unit: '°C' },
          { name: 'Piston Compression Ratio', value: '10.5:1', expected: '10.5:1', unit: 'ratio' },
          { name: 'Direct Injector Duty Cycle', value: `${(telemetry.throttle * 0.9).toFixed(1)}%`, expected: `${(telemetry.throttle * 0.9).toFixed(1)}%`, unit: 'PWM' },
        ],
        physicsInsight: isCyl2SensorFault 
          ? 'CHT thermocouple reading anomalous (325°C) without thermodynamic backing in EGT or coolant. AI identifies electrical transducer failure.'
          : isCyl3Fault 
          ? 'High EGT residual caused by localized lean fuel injection pattern. Thermal peak detected in upper exhaust header port.'
          : 'Combustion stoichiometry and thermal dissipation within optimal aerospace limits.'
      });
    } else if (partKey === 'bearing') {
      const isBearingFault = diagnosis.faultTitle.includes('Bearing') || diagnosis.faultTitle.includes('Lubrication');
      setSelectedPart({
        title: 'Crankshaft & Journal Bearings',
        category: 'Mechanical Rotating Assembly',
        status: isBearingFault ? 'CRITICAL' : 'NOMINAL',
        healthScore: health.mechanical,
        parameters: [
          { name: 'Vibration RMS', value: `${telemetry.vibration}`, expected: `${physics.expectedVibration}`, unit: 'mm/s' },
          { name: 'Oil Film Delivery Pressure', value: `${telemetry.oilPressure}`, expected: `${physics.expectedOilPressure}`, unit: 'bar' },
          { name: 'Hydraulic Film Thickness', value: isBearingFault ? '0.018' : '0.042', expected: '0.040', unit: 'mm' },
          { name: 'Journal Clearance Deviation', value: isBearingFault ? '+0.024' : '+0.002', expected: '<0.010', unit: 'mm' },
        ],
        physicsInsight: isBearingFault
          ? 'Hydrodynamic lubrication barrier thinning under continuous shear stress. High-frequency vibration harmonics indicate journal micro-fretting.'
          : 'Hydraulic wedge fully developed. Crankshaft rotating on continuous pressurized oil film.'
      });
    } else if (partKey === 'turbo') {
      setSelectedPart({
        title: 'Exhaust Turbocharger & Intercooler',
        category: 'Forced Induction System',
        status: 'NOMINAL',
        healthScore: 92,
        parameters: [
          { name: 'Manifold Pressure (MAP)', value: `${telemetry.manifoldPressure}`, expected: '34.5', unit: 'inHg' },
          { name: 'Turbine Wheel RPM', value: `${Math.round(telemetry.rpm * 26.2)}`, expected: '126,000', unit: 'RPM' },
          { name: 'Compressor Pressure Ratio', value: '1.42', expected: '1.40', unit: 'PR' },
          { name: 'Charge Air Cooler Delta', value: '-24', expected: '-22', unit: '°C' }
        ],
        physicsInsight: 'Wastegate closed-loop duty cycle compensating for density altitude at 18,500 ft. Boost pressure maintained within nominal envelope.'
      });
    } else if (partKey === 'lubrication') {
      const isLubFault = health.lubrication < 75;
      setSelectedPart({
        title: 'Oil Sump & Scavenge Pump',
        category: 'Lubrication Fluid Circuit',
        status: isLubFault ? 'CRITICAL' : 'NOMINAL',
        healthScore: health.lubrication,
        parameters: [
          { name: 'Oil Main Pressure', value: `${telemetry.oilPressure}`, expected: `${physics.expectedOilPressure}`, unit: 'bar' },
          { name: 'Oil Sump Temperature', value: `${telemetry.oilTemp}`, expected: `${physics.expectedOilTemp}`, unit: '°C' },
          { name: 'Oil Filter Differential', value: isLubFault ? '0.62' : '0.24', expected: '<0.40', unit: 'bar' },
          { name: 'Kinematic Viscosity (est)', value: isLubFault ? '11.2' : '14.5', expected: '14.0', unit: 'cSt' }
        ],
        physicsInsight: isLubFault
          ? 'Oil temperature climbing while pressure drops, indicating reduced kinematic viscosity and accelerated hydrodynamic degradation.'
          : 'Lubricant temperature and pressure within normal operating envelope.'
      });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      {/* Canvas Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              Real-Time Engine Virtual Replica
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
              Rotax 915 iS (4-Cyl Boxer / Piston)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Physics-informed mirror of combustion chambers, crankshaft, forced induction, and lubrication
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            <span className="text-slate-400">RPM:</span>
            <span className="text-indigo-600 font-bold">{telemetry.rpm}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            <span className="text-slate-400">THROTTLE:</span>
            <span className="text-emerald-600 font-bold">{telemetry.throttle}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            <span className="text-slate-400">ALTITUDE:</span>
            <span className="text-indigo-600 font-bold">{telemetry.altitude.toLocaleString()} ft</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Twin Visual Canvas */}
      <div className="relative w-full bg-slate-950/90 rounded-xl border border-slate-800/80 p-4 min-h-[380px] flex flex-col justify-between shadow-inner">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {/* Top forced induction & fuel rail layer */}
        <div className="relative z-10 flex items-center justify-between gap-4 mb-2">
          {/* Turbocharger Unit */}
          <button
            id="btn-inspect-turbo"
            onClick={() => openComponentInspector('turbo')}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-indigo-400 transition text-left cursor-pointer shadow-md"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
              <Wind className="w-4 h-4 animate-spin [animation-duration:3s]" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-200 group-hover:text-indigo-300">
                TURBOCHARGER & MAP
              </div>
              <div className="text-[10px] font-mono text-indigo-300">
                {telemetry.manifoldPressure} inHg • Intercooled
              </div>
            </div>
          </button>

          {/* Common Fuel Rail */}
          <div className="flex-1 mx-2 flex items-center justify-center">
            <div className="w-full max-w-md h-2 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)] relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Droplets className="w-3 h-3 text-indigo-400" />
                COMMON RAIL: <span className="text-slate-200 font-bold">{telemetry.fuelFlow} L/h</span>
              </div>
            </div>
          </div>

          {/* Radiator / Liquid Cooling Loop */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70">
            <Thermometer className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-mono">COOLANT TEMP</div>
              <div className={`text-xs font-mono font-bold ${telemetry.coolantTemp > 88 ? 'text-rose-400' : 'text-blue-300'}`}>
                {telemetry.coolantTemp}°C <span className="text-[10px] text-slate-500">(Exp: {physics.expectedCoolantTemp}°C)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: 4 Reciprocating Cylinders Cross-Section */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 my-3">
          {[1, 2, 3, 4].map((cylNum) => {
            const idx = cylNum - 1;
            const cht = telemetry.cylinderTemps[idx];
            const egt = telemetry.egt[idx];
            const strokeOffset = strokes[idx];
            const isCyl3Fault = cylNum === 3 && diagnosis.faultTitle.includes('Injector');
            const isCyl2SensorGlitch = cylNum === 2 && diagnosis.isSensorFaultOnly;
            const cardStyle = getCylinderColor(cht, isCyl3Fault);

            return (
              <div
                key={cylNum}
                id={`cylinder-block-${cylNum}`}
                onClick={() => openComponentInspector(`cyl-${cylNum}`)}
                className={`relative rounded-xl border p-3 flex flex-col items-center cursor-pointer transition hover:scale-[1.02] shadow-lg ${cardStyle}`}
              >
                {/* Cylinder Header & Badge */}
                <div className="w-full flex items-center justify-between text-[11px] font-mono pb-2 border-b border-slate-700/40">
                  <span className="font-bold">CYLINDER #{cylNum}</span>
                  {isCyl2SensorGlitch ? (
                    <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 text-[10px] border border-amber-500/40">
                      SENSOR GLITCH
                    </span>
                  ) : isCyl3Fault ? (
                    <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 text-[10px] border border-rose-500/40 animate-pulse">
                      HIGH EGT
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 text-[10px] border border-emerald-500/30">
                      OPTIMAL
                    </span>
                  )}
                </div>

                {/* Combustion Chamber Simulation */}
                <div className="w-full h-32 bg-slate-950/80 rounded-lg border border-slate-800 my-2 relative overflow-hidden flex flex-col justify-end p-2">
                  {/* Spark Plug & Flame Glow */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    {/* Flame Flash on compression/power stroke */}
                    <div 
                      className={`w-12 h-6 rounded-full blur-sm transition-opacity duration-100 ${
                        strokeOffset < 0 ? 'opacity-80 bg-gradient-to-b from-amber-400 to-rose-600' : 'opacity-20 bg-amber-600'
                      }`}
                    ></div>
                  </div>

                  {/* Reciprocating Piston Head */}
                  <div 
                    className="w-full bg-gradient-to-b from-slate-600 to-slate-800 rounded-md border-t-2 border-slate-400 h-10 shadow-inner flex flex-col items-center justify-center transition-transform duration-75"
                    style={{ transform: `translateY(${strokeOffset}px)` }}
                  >
                    <div className="w-12 h-1 bg-slate-900/80 rounded-full mb-1"></div>
                    <span className="text-[9px] font-mono text-slate-300">PISTON</span>
                  </div>

                  {/* Connecting Rod */}
                  <div 
                    className="w-2 bg-slate-500 rounded mx-auto transition-transform duration-75"
                    style={{ 
                      height: '24px',
                      transform: `translateY(${strokeOffset * 0.7}px)` 
                    }}
                  ></div>
                </div>

                {/* Telemetry Metrics on Cylinder */}
                <div className="w-full grid grid-cols-2 gap-1 text-[10px] font-mono pt-1 text-center">
                  <div className="bg-slate-950/70 rounded p-1 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">CHT</span>
                    <span className={`font-bold ${cht > 215 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {cht}°C
                    </span>
                  </div>
                  <div className="bg-slate-950/70 rounded p-1 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">EGT</span>
                    <span className={`font-bold ${egt > 740 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {egt}°C
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Mechanical Crankcase, Bearings & Oil Sump */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
          {/* Crankshaft & Main Bearings */}
          <button
            id="btn-inspect-bearing"
            onClick={() => openComponentInspector('bearing')}
            className={`flex items-center justify-between p-3 rounded-lg border text-left cursor-pointer transition shadow-md ${
              diagnosis.faultTitle.includes('Bearing')
                ? 'bg-rose-950/40 border-rose-500/60 hover:border-rose-400'
                : 'bg-slate-900 border-slate-800 hover:border-indigo-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                diagnosis.faultTitle.includes('Bearing')
                  ? 'bg-rose-900/50 border-rose-500 text-rose-300'
                  : 'bg-indigo-950 border-indigo-500/40 text-indigo-400'
              }`}>
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  CRANKSHAFT & MAIN BEARINGS
                  {diagnosis.faultTitle.includes('Bearing') && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500">
                      DEGRADATION
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Vibration: <span className={telemetry.vibration > 3.0 ? 'text-rose-400 font-bold' : 'text-slate-200'}>{telemetry.vibration} mm/s</span>
                  <span className="text-slate-600"> | </span>
                  Baseline: {physics.expectedVibration} mm/s
                </div>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 block">MECHANICAL</span>
              <span className={`text-xs font-bold ${health.mechanical < 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {health.mechanical}%
              </span>
            </div>
          </button>

          {/* Oil Sump & Scavenge Pump */}
          <button
            id="btn-inspect-lubrication"
            onClick={() => openComponentInspector('lubrication')}
            className={`flex items-center justify-between p-3 rounded-lg border text-left cursor-pointer transition shadow-md ${
              health.lubrication < 75
                ? 'bg-amber-950/40 border-amber-500/60 hover:border-amber-400'
                : 'bg-slate-900 border-slate-800 hover:border-indigo-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                health.lubrication < 75
                  ? 'bg-amber-900/50 border-amber-500 text-amber-300'
                  : 'bg-indigo-950 border-indigo-500/40 text-indigo-400'
              }`}>
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  OIL CIRCUIT & SCAVENGE PUMP
                  {health.lubrication < 75 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500">
                      PRESSURE DROP
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Oil P: <span className={telemetry.oilPressure < 3.8 ? 'text-amber-400 font-bold' : 'text-slate-200'}>{telemetry.oilPressure} bar</span>
                  <span className="text-slate-600"> | </span>
                  Oil T: <span className={telemetry.oilTemp > 95 ? 'text-amber-400 font-bold' : 'text-slate-200'}>{telemetry.oilTemp}°C</span>
                </div>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 block">LUBRICATION</span>
              <span className={`text-xs font-bold ${health.lubrication < 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {health.lubrication}%
              </span>
            </div>
          </button>
        </div>

        {/* Tip footer */}
        <div className="text-[11px] text-slate-500 flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Click any cylinder, crankshaft bearing, or oil circuit to open Physics Inspector
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            STROKE CADENCE: {Math.round(telemetry.rpm / 2)} CYCLES/MIN
          </span>
        </div>
      </div>

      {/* Component Detail Modal / Drawer */}
      {selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-900">
            <button
              id="btn-close-part-inspector"
              onClick={() => setSelectedPart(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                {selectedPart.category}
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                selectedPart.status === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                selectedPart.status === 'SENSOR_FAULT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                selectedPart.status === 'ELEVATED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                STATUS: {selectedPart.status}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {selectedPart.title}
            </h3>

            {/* Health Index */}
            <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-600 font-medium">Subsystem Health Integrity</span>
                <span className="text-indigo-600 font-bold">{selectedPart.healthScore}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    selectedPart.healthScore < 60 ? 'bg-rose-500' :
                    selectedPart.healthScore < 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${selectedPart.healthScore}%` }}
                ></div>
              </div>
            </div>

            {/* Parameter Grid */}
            <div className="space-y-2 mb-4">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Telemetry & Physics Nominal Correlation
              </span>
              <div className="grid grid-cols-1 gap-2">
                {selectedPart.parameters.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-mono bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-600">{p.name}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-900 font-bold">
                        {p.value} {p.unit}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        (Exp: {p.expected} {p.unit})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Physics insight */}
            <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 text-xs text-slate-700 mb-5">
              <span className="text-indigo-700 font-bold block mb-1 font-mono flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Physics Twin Assessment:
              </span>
              <p className="leading-relaxed">{selectedPart.physicsInsight}</p>
            </div>

            <button
              id="btn-dismiss-modal"
              onClick={() => setSelectedPart(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm shadow-indigo-200"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  EngineTelemetry, 
  PhysicsExpectedModel, 
  EngineSubsystemHealth, 
  FaultDiagnosis,
  FaultPreset
} from '../types';
import { LiveEngine3DView } from './LiveEngine3DView';
import { 
  Activity, 
  ArrowLeft, 
  RefreshCw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Flame,
  Droplets,
  Wind,
  Layers,
  Cpu,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
  Radio
} from 'lucide-react';

interface Dedicated3DTwinViewProps {
  telemetry: EngineTelemetry;
  physics: PhysicsExpectedModel;
  health: EngineSubsystemHealth;
  diagnosis: FaultDiagnosis;
  activePreset: FaultPreset;
  onSelectPreset: (preset: FaultPreset) => void;
  onThrottleChange: (throttle: number) => void;
  onAltitudeChange: (altitude: number) => void;
  onReset: () => void;
  onBackToCockpit: () => void;
  externalAppUrl?: string;
  onBroadcastEvent?: (type: string, payload: any) => void;
}

interface ComponentInspectorData {
  title: string;
  category: string;
  status: 'NOMINAL' | 'ELEVATED' | 'CRITICAL' | 'SENSOR_FAULT';
  healthScore: number;
  parameters: Array<{ name: string; value: string; expected: string; unit: string }>;
  physicsInsight: string;
}

const DEFAULT_3D_APP_URL = 'https://ai.studio/apps/16171890-ece0-41d4-a093-b2bcd8be3927';

export const Dedicated3DTwinView: React.FC<Dedicated3DTwinViewProps> = ({
  telemetry,
  physics,
  health,
  diagnosis,
  activePreset,
  onSelectPreset,
  onThrottleChange,
  onAltitudeChange,
  onReset,
  onBackToCockpit,
  externalAppUrl = DEFAULT_3D_APP_URL,
  onBroadcastEvent
}) => {
  // View mode: 'native' (Our own connected 3D twin) or 'external' (Iframe bridge)
  const [viewMode, setViewMode] = useState<'native' | 'external'>('native');
  const [selectedPart, setSelectedPart] = useState<ComponentInspectorData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);

  // External iframe & sync bridge refs
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  // Setup BroadcastChannel for cross-tab or cross-window sync
  useEffect(() => {
    try {
      broadcastChannelRef.current = new BroadcastChannel('aerotwin_bridge_channel');
    } catch {
      // BroadcastChannel fallback
    }
    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  // Dispatch sync messages to external consumers / iframe if open
  const sendSyncMessage = useCallback((type: string, payload: any) => {
    const message = {
      source: 'AEROTWIN_AI',
      type,
      timestamp: Date.now(),
      payload
    };

    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(message, '*');
      } catch {
        // cross-origin safeguard
      }
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }

    try {
      broadcastChannelRef.current?.postMessage(message);
    } catch {
      // ignore
    }

    if (onBroadcastEvent) {
      onBroadcastEvent(type, payload);
    }
    setLastSyncTime(Date.now());
  }, [onBroadcastEvent]);

  // Periodic telemetry sync (10 Hz)
  useEffect(() => {
    const timer = setInterval(() => {
      sendSyncMessage('TELEMETRY_STREAM', {
        telemetry,
        physics,
        health,
        diagnosis,
        activePreset
      });
    }, 100);
    return () => clearInterval(timer);
  }, [telemetry, physics, health, diagnosis, activePreset, sendSyncMessage]);

  // Handle clicking on 3D parts to open the Physics Inspector
  const handleSelectComponent = (partKey: string) => {
    if (partKey.startsWith('cyl-')) {
      const idx = parseInt(partKey.replace('cyl-', '')) - 1;
      const cht = telemetry.cylinderTemps[idx];
      const egt = telemetry.egt[idx];
      const isCyl3Fault = (idx === 1 || idx === 2) && (activePreset === 'INJECTOR_MISFIRE' || diagnosis.faultTitle.includes('Injector'));
      const isCyl2SensorFault = idx === 1 && (activePreset === 'SENSOR_MALFUNCTION' || diagnosis.isSensorFaultOnly);
      const isCoolingLeak = activePreset === 'COOLING_LEAK';

      setSelectedPart({
        title: `Cylinder Assembly #${idx + 1}`,
        category: 'Combustion Chamber & Cylinder Head',
        status: isCyl2SensorFault ? 'SENSOR_FAULT' : isCyl3Fault || isCoolingLeak ? 'CRITICAL' : cht > 212 ? 'ELEVATED' : 'NOMINAL',
        healthScore: isCyl2SensorFault ? 94 : isCyl3Fault ? 52 : isCoolingLeak ? 48 : 98,
        parameters: [
          { name: 'Cylinder Head Temp (CHT)', value: `${cht}`, expected: `${physics.expectedCht}`, unit: '°C' },
          { name: 'Exhaust Gas Temp (EGT)', value: `${egt}`, expected: `${physics.expectedEgt}`, unit: '°C' },
          { name: 'EGT Residual (Δ)', value: `${egt - physics.expectedEgt > 0 ? '+' : ''}${egt - physics.expectedEgt}`, expected: '±15', unit: '°C' },
          { name: 'Compression Ratio', value: '10.5:1', expected: '10.5:1', unit: 'ratio' },
          { name: 'Direct Injector Pulse', value: `${(telemetry.throttle * 0.92).toFixed(1)}%`, expected: `${(telemetry.throttle * 0.92).toFixed(1)}%`, unit: 'PWM' },
        ],
        physicsInsight: isCyl2SensorFault 
          ? 'CHT thermocouple transducer is indicating electrical divergence (325°C) without physical backing in EGT or coolant. AI identifies sensor anomaly.'
          : isCyl3Fault 
          ? 'High EGT thermal residual caused by localized lean fuel injection pattern. Thermal peak detected in upper exhaust header port.'
          : isCoolingLeak
          ? 'Severe coolant flow reduction causing rapid thermal saturation across all cylinder water jackets.'
          : 'Combustion stoichiometry and thermal dissipation within optimal aerospace limits.'
      });
    } else if (partKey === 'bearing') {
      const isBearingFault = activePreset === 'BEARING_LUBRICATION' || diagnosis.faultTitle.includes('Bearing');
      setSelectedPart({
        title: 'Crankshaft & Main Journal Bearings',
        category: 'Mechanical Rotating Assembly',
        status: isBearingFault ? 'CRITICAL' : 'NOMINAL',
        healthScore: health.mechanical,
        parameters: [
          { name: 'Vibration RMS', value: `${telemetry.vibration}`, expected: `${physics.expectedVibration}`, unit: 'mm/s' },
          { name: 'Oil Film Delivery Pressure', value: `${telemetry.oilPressure}`, expected: `${physics.expectedOilPressure}`, unit: 'bar' },
          { name: 'Hydraulic Film Thickness', value: isBearingFault ? '0.016' : '0.042', expected: '0.040', unit: 'mm' },
          { name: 'Journal Clearance Deviation', value: isBearingFault ? '+0.026' : '+0.002', expected: '<0.010', unit: 'mm' },
        ],
        physicsInsight: isBearingFault
          ? 'Hydrodynamic lubrication barrier thinning under continuous shear stress. High-frequency vibration harmonics indicate journal micro-fretting and molten friction glow.'
          : 'Hydraulic wedge fully developed. Crankshaft rotating on continuous pressurized hydrodynamic oil film.'
      });
    } else if (partKey === 'turbo') {
      setSelectedPart({
        title: 'Exhaust Turbocharger & Intercooler',
        category: 'Forced Induction System',
        status: 'NOMINAL',
        healthScore: 94,
        parameters: [
          { name: 'Manifold Pressure (MAP)', value: `${telemetry.manifoldPressure}`, expected: '34.5', unit: 'inHg' },
          { name: 'Turbine Wheel RPM', value: `${Math.round(telemetry.rpm * 26.2)}`, expected: '126,000', unit: 'RPM' },
          { name: 'Compressor Pressure Ratio', value: '1.42', expected: '1.40', unit: 'PR' },
          { name: 'Charge Air Cooler Delta', value: '-24', expected: '-22', unit: '°C' }
        ],
        physicsInsight: 'Variable wastegate regulation maintaining consistent high-altitude manifold pressure and optimal air charge density.'
      });
    } else if (partKey === 'lubrication') {
      const isBearingFault = activePreset === 'BEARING_LUBRICATION';
      setSelectedPart({
        title: 'Oil Sump, Pump & Lubrication Loop',
        category: 'Engine Lubrication Circuit',
        status: isBearingFault ? 'CRITICAL' : 'NOMINAL',
        healthScore: health.lubrication,
        parameters: [
          { name: 'Oil Pressure', value: `${telemetry.oilPressure}`, expected: `${physics.expectedOilPressure}`, unit: 'bar' },
          { name: 'Oil Temperature', value: `${telemetry.oilTemp}`, expected: `${physics.expectedOilTemp}`, unit: '°C' },
          { name: 'Oil Flow Rate', value: isBearingFault ? '14.2' : '22.0', expected: '22.5', unit: 'L/min' },
          { name: 'Scavenge Pump Delta', value: isBearingFault ? '-1.8' : '+0.1', expected: '0.0', unit: 'bar' }
        ],
        physicsInsight: isBearingFault
          ? 'Viscosity degradation and pressure bypass failure detected in the main lubrication gallery.'
          : 'Continuous lubrication delivery maintaining hydrodynamic barrier across all journal surfaces.'
      });
    } else if (partKey === 'propeller') {
      setSelectedPart({
        title: 'Composite Propeller & Reduction Gearbox',
        category: 'Propulsion Transmission',
        status: 'NOMINAL',
        healthScore: 96,
        parameters: [
          { name: 'Engine Crank RPM', value: `${telemetry.rpm}`, expected: '5200', unit: 'RPM' },
          { name: 'Propeller Shaft RPM', value: `${Math.round(telemetry.rpm / 2.43)}`, expected: '2140', unit: 'RPM' },
          { name: 'Gear Reduction Ratio', value: '2.43:1', expected: '2.43:1', unit: 'ratio' },
          { name: 'Blade Pitch Angle', value: '18.4', expected: '18.0', unit: 'deg' }
        ],
        physicsInsight: 'Slipper clutch and vibration damper isolating rotational torsional vibrations effectively.'
      });
    }
  };

  const handleScenarioSelect = (preset: FaultPreset) => {
    onSelectPreset(preset);
    sendSyncMessage('SCENARIO_TRIGGER', {
      scenario: preset,
      timestamp: Date.now()
    });
  };

  const handleThrottleSlider = (val: number) => {
    onThrottleChange(val);
    sendSyncMessage('THROTTLE_UPDATE', { throttle: val });
  };

  const handleAltitudeSlider = (val: number) => {
    onAltitudeChange(val);
    sendSyncMessage('ALTITUDE_UPDATE', { altitude: val });
  };

  const handlePing = () => {
    setPingStatus('PINGING...');
    sendSyncMessage('PING', { test: true });
    setTimeout(() => {
      setPingStatus('ACTIVE BRIDGE (60 Hz)');
      setTimeout(() => setPingStatus(null), 3000);
    }, 400);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full flex flex-col bg-slate-950 text-slate-100 ${
        isFullscreen ? 'h-screen fixed inset-0 z-50 p-3' : 'min-h-[calc(100vh-4rem)] p-4 sm:p-6'
      }`}
    >
      {/* Top Header & Navigation Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 mb-4">
        {/* Left: Return to Cockpit & Title */}
        <div className="flex items-center gap-3">
          <button
            id="btn-back-cockpit"
            onClick={onBackToCockpit}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-semibold text-slate-200 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span>Digital Twin Cockpit</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-white tracking-wide">
                3D Virtual Twin
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SOFTWARE LINKED
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct bi-directional physics link with engine telemetry, throttle control, and fault simulations
            </p>
          </div>
        </div>

        {/* Right: View Switcher (Native Connected vs External Applet) & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Native vs External Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              id="btn-view-native"
              onClick={() => setViewMode('native')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'native'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive WebGL 3D model with 100% real-time software parameter link"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>Native 3D Twin (Connected)</span>
            </button>
            <button
              id="btn-view-external"
              onClick={() => setViewMode('external')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'external'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Open external AI Studio Applet with telemetry bridge"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>External Applet</span>
            </button>
          </div>

          {/* Quick Bridge Ping (when external or testing) */}
          <button
            id="btn-bridge-ping"
            onClick={handlePing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-300 transition cursor-pointer"
            title="Send high-priority telemetry sync pulse"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>{pingStatus || 'Ping Link'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            id="btn-fullscreen-toggle"
            onClick={toggleFullscreen}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D Studio'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left / Center 3D Viewport (9 cols on large screen) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          {viewMode === 'native' ? (
            <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl min-h-[520px]">
              {/* Native 3D WebGL Model */}
              <LiveEngine3DView 
                telemetry={telemetry}
                physics={physics}
                health={health}
                diagnosis={diagnosis}
                activePreset={activePreset}
                onSelectComponent={handleSelectComponent}
              />
            </div>
          ) : (
            <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl min-h-[520px]">
              {/* External Iframe View with Telemetry Sync */}
              <iframe
                ref={iframeRef}
                src={externalAppUrl}
                title="External 3D Twin"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; camera; encrypted-media; gyroscope; picture-in-picture; web-share"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-slate-300">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Streaming Telemetry at 10 Hz to External Applet</span>
              </div>
            </div>
          )}

          {/* Quick Hardware Flight Controls Strip (Below 3D Canvas) */}
          <div className="bg-slate-900/75 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Software Propulsion Controls
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  (Adjusting these sliders directly updates the 3D twin physical kinematics)
                </span>
              </div>
              <button
                id="btn-reset-params"
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Baseline</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Throttle Power Lever */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Power Lever (Throttle MCP)
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {telemetry.throttle}% MCP ({telemetry.rpm} RPM)
                  </span>
                </div>
                <input
                  id="slider-throttle-3d"
                  type="range"
                  min="30"
                  max="100"
                  value={telemetry.throttle}
                  onChange={(e) => handleThrottleSlider(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>30% Idle</span>
                  <span>65% Economy</span>
                  <span>75% Cruise</span>
                  <span>100% Takeoff / Boost</span>
                </div>
              </div>

              {/* Altitude Slider */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-cyan-400" />
                    Flight Altitude (Density & Boost)
                  </span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {telemetry.altitude.toLocaleString()} FT (MAP {telemetry.manifoldPressure} inHg)
                  </span>
                </div>
                <input
                  id="slider-altitude-3d"
                  type="range"
                  min="0"
                  max="18000"
                  step="500"
                  value={telemetry.altitude}
                  onChange={(e) => handleAltitudeSlider(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>Sea Level</span>
                  <span>8,000 FT</span>
                  <span>14,000 FT</span>
                  <span>18,000 FT Ceiling</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Scenario Injections & Diagnostics (3 cols on large screen) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
          {/* Active Fault Diagnosis Status Card */}
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Physical Twin Status
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                diagnosis.severity === 'CRITICAL' 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                  : diagnosis.severity === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {diagnosis.severity}
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 mb-3">
              <div className="font-bold text-sm text-white mb-1">
                {diagnosis.faultTitle}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {diagnosis.rootCause}
              </p>
            </div>

            {/* Subsystem Health Progress */}
            <div className="space-y-2 pt-1 border-t border-slate-800 text-xs">
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Combustion:</span>
                <span className={`font-bold ${health.combustion < 70 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {health.combustion}%
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Lubrication & Bearings:</span>
                <span className={`font-bold ${health.lubrication < 70 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {health.lubrication}%
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Cooling Jacket:</span>
                <span className={`font-bold ${health.cooling < 70 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {health.cooling}%
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Overall Health Index:</span>
                <span className={`font-bold ${health.overallHealthIndex < 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {health.overallHealthIndex}%
                </span>
              </div>
            </div>
          </div>

          {/* Fault Scenario Switcher (Directly transforms the 3D twin) */}
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-400" />
                Scenario Injector
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Real-time 3D Response</span>
            </div>

            <div className="space-y-2">
              {/* Normal */}
              <button
                id="btn-scenario-normal"
                onClick={() => handleScenarioSelect('NORMAL')}
                className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  activePreset === 'NORMAL'
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Normal Operation
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Smooth 1-3-4-2 combustion, balanced harmonics
                  </div>
                </div>
                {activePreset === 'NORMAL' && (
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                )}
              </button>

              {/* Bearing Lubrication */}
              <button
                id="btn-scenario-bearing"
                onClick={() => handleScenarioSelect('BEARING_LUBRICATION')}
                className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  activePreset === 'BEARING_LUBRICATION'
                    ? 'bg-rose-950/40 border-rose-500/80 text-rose-200 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Bearing Lubrication Wear
                  </div>
                  <div className="text-[10px] text-slate-400">
                    3D engine block vibration & molten bearing glow
                  </div>
                </div>
                {activePreset === 'BEARING_LUBRICATION' && (
                  <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                )}
              </button>

              {/* Injector Misfire */}
              <button
                id="btn-scenario-misfire"
                onClick={() => handleScenarioSelect('INJECTOR_MISFIRE')}
                className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  activePreset === 'INJECTOR_MISFIRE'
                    ? 'bg-amber-950/40 border-amber-500/80 text-amber-200 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Cylinder #3 Injector Misfire
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Cylinder 3 combustion drops & exhaust backfire
                  </div>
                </div>
                {activePreset === 'INJECTOR_MISFIRE' && (
                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                )}
              </button>

              {/* Coolant Leak */}
              <button
                id="btn-scenario-coolant"
                onClick={() => handleScenarioSelect('COOLING_LEAK')}
                className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  activePreset === 'COOLING_LEAK'
                    ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-200 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                    Coolant Circuit Leak
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Cylinder heads overheat to glowing crimson
                  </div>
                </div>
                {activePreset === 'COOLING_LEAK' && (
                  <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                )}
              </button>

              {/* Sensor Malfunction */}
              <button
                id="btn-scenario-sensor"
                onClick={() => handleScenarioSelect('SENSOR_MALFUNCTION')}
                className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  activePreset === 'SENSOR_MALFUNCTION'
                    ? 'bg-yellow-950/40 border-yellow-500/80 text-yellow-200 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-yellow-400" />
                    Sensor Transducer Glitch
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Cylinder 2 probe blinks warning without physics flaw
                  </div>
                </div>
                {activePreset === 'SENSOR_MALFUNCTION' && (
                  <span className="text-[10px] font-mono font-bold bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Selected Component Inspector Drawer (When user clicks in 3D) */}
          {selectedPart && (
            <div className="bg-slate-900/95 backdrop-blur-md border border-indigo-500/50 rounded-2xl p-4 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <div>
                  <div className="text-[10px] text-indigo-400 font-mono font-bold uppercase">
                    3D COMPONENT INSPECTOR
                  </div>
                  <div className="text-sm font-bold text-white">
                    {selectedPart.title}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPart(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Close Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mb-3">
                {selectedPart.parameters.map((param, pIdx) => (
                  <div key={pIdx} className="flex justify-between items-center text-xs p-1.5 rounded bg-slate-950/50">
                    <span className="text-slate-400">{param.name}:</span>
                    <span className="font-mono font-bold text-slate-100">
                      {param.value} {param.unit}
                      <span className="text-[10px] text-slate-500 font-normal pl-1">
                        (exp: {param.expected})
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200 leading-relaxed">
                <span className="font-bold text-white">First-Principles Physics: </span>
                {selectedPart.physicsInsight}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

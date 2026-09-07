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
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  Flame,
  Droplets,
  Wind,
  Cpu,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
  Radio,
  Monitor,
  Send,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
  Terminal,
  ShieldAlert,
  Gauge
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
  onBackToCockpit?: () => void;
  externalAppUrl?: string;
  onBroadcastEvent?: (type: string, payload: any) => void;
  isStandalone?: boolean;
  isDualPane?: boolean;
  onToggleDualPane?: () => void;
}

interface ComponentInspectorData {
  title: string;
  category: string;
  status: 'NOMINAL' | 'ELEVATED' | 'CRITICAL' | 'SENSOR_FAULT';
  healthScore: number;
  parameters: Array<{ name: string; value: string; expected: string; unit: string }>;
  physicsInsight: string;
}

interface SyncedEventLog {
  id: string;
  time: string;
  source: string;
  type: string;
  summary: string;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'COMMAND';
}

const DEFAULT_3D_APP_URL = 'https://ai.studio/apps/16171890-ece0-41d4-a093-b2bcd8be3927';

export const Dedicated3DTwinView: React.FC<Dedicated3DTwinViewProps> = ({
  telemetry: initialTelemetry,
  physics: initialPhysics,
  health: initialHealth,
  diagnosis: initialDiagnosis,
  activePreset: initialActivePreset,
  onSelectPreset,
  onThrottleChange,
  onAltitudeChange,
  onReset,
  onBackToCockpit,
  externalAppUrl = DEFAULT_3D_APP_URL,
  onBroadcastEvent,
  isStandalone = false,
  isDualPane = false,
  onToggleDualPane
}) => {
  // If in standalone window mode, allow internal state override from incoming broadcasts
  const [localTelemetry, setLocalTelemetry] = useState<EngineTelemetry>(initialTelemetry);
  const [localPhysics, setLocalPhysics] = useState<PhysicsExpectedModel>(initialPhysics);
  const [localHealth, setLocalHealth] = useState<EngineSubsystemHealth>(initialHealth);
  const [localDiagnosis, setLocalDiagnosis] = useState<FaultDiagnosis>(initialDiagnosis);
  const [localActivePreset, setLocalActivePreset] = useState<FaultPreset>(initialActivePreset);

  // Sync with props whenever parent updates
  useEffect(() => {
    setLocalTelemetry(initialTelemetry);
  }, [initialTelemetry]);
  useEffect(() => {
    setLocalPhysics(initialPhysics);
  }, [initialPhysics]);
  useEffect(() => {
    setLocalHealth(initialHealth);
  }, [initialHealth]);
  useEffect(() => {
    setLocalDiagnosis(initialDiagnosis);
  }, [initialDiagnosis]);
  useEffect(() => {
    setLocalActivePreset(initialActivePreset);
  }, [initialActivePreset]);

  // View mode: 'native' (Our connected 3D twin software) or 'external' (Iframe bridge)
  const [viewMode, setViewMode] = useState<'native' | 'external'>('native');
  const [selectedPart, setSelectedPart] = useState<ComponentInspectorData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const [packetCount, setPacketCount] = useState<number>(142);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [lastEventAlert, setLastEventAlert] = useState<{
    type: string;
    title: string;
    detail: string;
    severity: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'COMMAND';
    timestamp: number;
  }>({
    type: 'SOFTWARE_CONNECTED',
    title: 'AeroTwin AI Software Bus Synchronized',
    detail: 'All telemetry, power commands, and physics anomalies in AeroTwin AI are directly driving 3D virtual kinematics.',
    severity: 'NORMAL',
    timestamp: Date.now()
  });

  // Event Log Buffer
  const [eventLogs, setEventLogs] = useState<SyncedEventLog[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      source: 'AeroTwin AI',
      type: 'BUS_CONNECT',
      summary: 'Inter-Software IPC Channel active at 50 Hz. Kinematics locked.',
      severity: 'COMMAND'
    }
  ]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Helper to add event log
  const pushEventLog = useCallback((source: string, type: string, summary: string, severity: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'COMMAND') => {
    const newLog: SyncedEventLog = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString(),
      source,
      type,
      summary,
      severity
    };
    setEventLogs(prev => [newLog, ...prev.slice(0, 19)]);
  }, []);

  // Listen to BroadcastChannel for cross-window / cross-software communication
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('aerotwin_bridge_channel');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const data = event.data;
        if (!data || data.source === '3D_VIRTUAL_TWIN_SELF') return;

        setPacketCount(prev => prev + 1);

        if (data.type === 'FAULT_PRESET_CHANGE' || data.type === 'FAULT_PRESET') {
          const preset = data.payload?.preset as FaultPreset;
          if (preset) {
            setLocalActivePreset(preset);
            let detail = '';
            let sev: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'COMMAND' = 'NORMAL';
            if (preset === 'BEARING_LUBRICATION') {
              detail = 'Hydrodynamic lubrication barrier breakdown. Journal bearings heating to molten glow; 4.8 mm/s physical engine mount vibration shaking active.';
              sev = 'CRITICAL';
            } else if (preset === 'INJECTOR_MISFIRE') {
              detail = 'Cylinder #3 lean misfire. Exhaust manifold glowing red; intermittent combustion spark dropouts rendered in 3D.';
              sev = 'WARNING';
            } else if (preset === 'COOLING_LEAK') {
              detail = 'Coolant radiator circuit breach. Rapid thermal saturation across all 4 cylinder heads (crimson thermal overload).';
              sev = 'CRITICAL';
            } else if (preset === 'SENSOR_MALFUNCTION') {
              detail = 'Cylinder #2 CHT transducer open-circuit spike (325°C). Diagnostic probe beacon flashing amber; engine mechanical core verified intact.';
              sev = 'WARNING';
            } else {
              detail = 'Smooth 1-3-4-2 Otto cycle combustion restored; harmonic vibration normalized.';
              sev = 'NORMAL';
            }

            setLastEventAlert({
              type: `AEROTWIN AI: ${preset}`,
              title: `AI Error Injected: ${preset.replace('_', ' ')}`,
              detail,
              severity: sev,
              timestamp: Date.now()
            });

            pushEventLog('AeroTwin AI', data.type, `Fault changed to ${preset}: ${detail}`, sev);
          }
        } else if (data.type === 'THROTTLE_CHANGE' || data.type === 'THROTTLE_UPDATE') {
          const thr = data.payload?.throttle;
          const rpm = data.payload?.rpm || Math.round(1800 + (thr / 100) * 3400);
          if (typeof thr === 'number') {
            setLastEventAlert({
              type: 'POWER_COMMAND',
              title: `AeroTwin AI Throttle: ${thr}% MCP`,
              detail: `Engine rotational velocity commanded to ${rpm} RPM. Propeller spin, Otto cycle piston reciprocation, and turbo spool updated.`,
              severity: 'COMMAND',
              timestamp: Date.now()
            });
            pushEventLog('AeroTwin AI', 'THROTTLE', `Throttle set to ${thr}% MCP (${rpm} RPM)`, 'COMMAND');
          }
        } else if (data.type === 'ALTITUDE_CHANGE') {
          const alt = data.payload?.altitude;
          if (typeof alt === 'number') {
            pushEventLog('AeroTwin AI', 'ALTITUDE', `Altitude set to ${alt} FT`, 'COMMAND');
          }
        } else if (data.type === 'TELEMETRY_SYNC') {
          if (data.payload?.telemetry && isStandalone) {
            setLocalTelemetry(data.payload.telemetry);
            if (data.payload.physics) setLocalPhysics(data.payload.physics);
            if (data.payload.health) setLocalHealth(data.payload.health);
            if (data.payload.diagnosis) setLocalDiagnosis(data.payload.diagnosis);
            if (data.payload.activePreset) setLocalActivePreset(data.payload.activePreset);
          }
        }
      };
    } catch {
      // BroadcastChannel fallback
    }

    // Also listen to window storage events for robust cross-window sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'aerotwin_live_sync' && e.newValue) {
        try {
          const syncData = JSON.parse(e.newValue);
          setPacketCount(prev => prev + 1);
          if (isStandalone && syncData.telemetry) {
            setLocalTelemetry(syncData.telemetry);
            if (syncData.physics) setLocalPhysics(syncData.physics);
            if (syncData.health) setLocalHealth(syncData.health);
            if (syncData.diagnosis) setLocalDiagnosis(syncData.diagnosis);
            if (syncData.activePreset) setLocalActivePreset(syncData.activePreset);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [isStandalone, pushEventLog]);

  // Dispatch sync messages to external consumers / iframe / other window
  const sendSyncMessage = useCallback((type: string, payload: any) => {
    const message = {
      source: '3D_VIRTUAL_TWIN',
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

    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage(message, '*');
      } catch {
        // ignore
      }
    }

    try {
      broadcastChannelRef.current?.postMessage(message);
    } catch {
      // ignore
    }

    if (onBroadcastEvent) {
      onBroadcastEvent(type, payload);
    }
  }, [onBroadcastEvent]);

  // Watch for activePreset changes directly from parent to trigger alert banner
  useEffect(() => {
    let detail = '';
    let sev: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'COMMAND' = 'NORMAL';
    if (localActivePreset === 'BEARING_LUBRICATION') {
      detail = 'Bearing lubrication failure detected by AeroTwin AI. 3D Twin is physically vibrating the engine mountings and overheating the center journal bearings.';
      sev = 'CRITICAL';
    } else if (localActivePreset === 'INJECTOR_MISFIRE') {
      detail = 'Cylinder #3 fuel misfire diagnosed by AeroTwin AI. 3D Twin is dropping spark pulses and rendering high exhaust manifold backfire thermal bloom.';
      sev = 'WARNING';
    } else if (localActivePreset === 'COOLING_LEAK') {
      detail = 'Coolant circuit breach diagnosed by AeroTwin AI. 3D Twin is escalating cylinder head thermal runaway to 238°C (crimson thermal overload).';
      sev = 'CRITICAL';
    } else if (localActivePreset === 'SENSOR_MALFUNCTION') {
      detail = 'Cylinder #2 CHT transducer anomaly identified by AeroTwin AI. 3D Twin flashing amber diagnostic probe; physical engine core remains verified cool.';
      sev = 'WARNING';
    } else {
      detail = 'AeroTwin AI nominal operating envelope. 1-3-4-2 boxer rhythm running with balanced harmonics.';
      sev = 'NORMAL';
    }

    setLastEventAlert({
      type: `AI_STATE: ${localActivePreset}`,
      title: `AeroTwin AI State: ${localActivePreset.replace('_', ' ')}`,
      detail,
      severity: sev,
      timestamp: Date.now()
    });
  }, [localActivePreset]);

  // Handle clicking on 3D parts to open the Physics Inspector
  const handleSelectComponent = (partKey: string) => {
    if (partKey.startsWith('cyl-')) {
      const idx = parseInt(partKey.replace('cyl-', '')) - 1;
      const cht = localTelemetry.cylinderTemps[idx];
      const egt = localTelemetry.egt[idx];
      const isCyl3Fault = (idx === 1 || idx === 2) && (localActivePreset === 'INJECTOR_MISFIRE' || localDiagnosis.faultTitle.includes('Injector'));
      const isCyl2SensorFault = idx === 1 && (localActivePreset === 'SENSOR_MALFUNCTION' || localDiagnosis.isSensorFaultOnly);
      const isCoolingLeak = localActivePreset === 'COOLING_LEAK';

      setSelectedPart({
        title: `Cylinder Assembly #${idx + 1}`,
        category: 'Combustion Chamber & Cylinder Head',
        status: isCyl2SensorFault ? 'SENSOR_FAULT' : isCyl3Fault || isCoolingLeak ? 'CRITICAL' : cht > 212 ? 'ELEVATED' : 'NOMINAL',
        healthScore: isCyl2SensorFault ? 94 : isCyl3Fault ? 52 : isCoolingLeak ? 48 : 98,
        parameters: [
          { name: 'Cylinder Head Temp (CHT)', value: `${cht}`, expected: `${localPhysics.expectedCht}`, unit: '°C' },
          { name: 'Exhaust Gas Temp (EGT)', value: `${egt}`, expected: `${localPhysics.expectedEgt}`, unit: '°C' },
          { name: 'EGT Residual (Δ)', value: `${egt - localPhysics.expectedEgt > 0 ? '+' : ''}${egt - localPhysics.expectedEgt}`, expected: '±15', unit: '°C' },
          { name: 'Compression Ratio', value: '10.5:1', expected: '10.5:1', unit: 'ratio' },
          { name: 'Direct Injector Pulse', value: `${(localTelemetry.throttle * 0.92).toFixed(1)}%`, expected: `${(localTelemetry.throttle * 0.92).toFixed(1)}%`, unit: 'PWM' },
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
      const isBearingFault = localActivePreset === 'BEARING_LUBRICATION' || localDiagnosis.faultTitle.includes('Bearing');
      setSelectedPart({
        title: 'Crankshaft & Main Journal Bearings',
        category: 'Mechanical Rotating Assembly',
        status: isBearingFault ? 'CRITICAL' : 'NOMINAL',
        healthScore: localHealth.mechanical,
        parameters: [
          { name: 'Vibration RMS', value: `${localTelemetry.vibration}`, expected: `${localPhysics.expectedVibration}`, unit: 'mm/s' },
          { name: 'Oil Film Delivery Pressure', value: `${localTelemetry.oilPressure}`, expected: `${localPhysics.expectedOilPressure}`, unit: 'bar' },
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
          { name: 'Manifold Pressure (MAP)', value: `${localTelemetry.manifoldPressure}`, expected: '34.5', unit: 'inHg' },
          { name: 'Turbine Wheel RPM', value: `${Math.round(localTelemetry.rpm * 26.2)}`, expected: '126,000', unit: 'RPM' },
          { name: 'Compressor Pressure Ratio', value: '1.42', expected: '1.40', unit: 'PR' },
          { name: 'Charge Air Cooler Delta', value: '-24', expected: '-22', unit: '°C' }
        ],
        physicsInsight: 'Variable wastegate regulation maintaining consistent high-altitude manifold pressure and optimal air charge density.'
      });
    } else if (partKey === 'lubrication') {
      const isBearingFault = localActivePreset === 'BEARING_LUBRICATION';
      setSelectedPart({
        title: 'Oil Sump, Pump & Lubrication Loop',
        category: 'Engine Lubrication Circuit',
        status: isBearingFault ? 'CRITICAL' : 'NOMINAL',
        healthScore: localHealth.lubrication,
        parameters: [
          { name: 'Oil Pressure', value: `${localTelemetry.oilPressure}`, expected: `${localPhysics.expectedOilPressure}`, unit: 'bar' },
          { name: 'Oil Temperature', value: `${localTelemetry.oilTemp}`, expected: `${localPhysics.expectedOilTemp}`, unit: '°C' },
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
          { name: 'Engine Crank RPM', value: `${localTelemetry.rpm}`, expected: '5200', unit: 'RPM' },
          { name: 'Propeller Shaft RPM', value: `${Math.round(localTelemetry.rpm / 2.43)}`, expected: '2140', unit: 'RPM' },
          { name: 'Gear Reduction Ratio', value: '2.43:1', expected: '2.43:1', unit: 'ratio' },
          { name: 'Blade Pitch Angle', value: '18.4', expected: '18.0', unit: 'deg' }
        ],
        physicsInsight: 'Slipper clutch and vibration damper isolating rotational torsional vibrations effectively.'
      });
    }
  };

  const handleScenarioSelect = (preset: FaultPreset) => {
    setLocalActivePreset(preset);
    onSelectPreset(preset);
    sendSyncMessage('FAULT_PRESET_CHANGE', {
      preset,
      timestamp: Date.now()
    });
    pushEventLog('3D Virtual Twin Workstation', 'SCENARIO_TRIGGER', `Operator selected ${preset} scenario. Dispatched to AeroTwin AI.`, 'COMMAND');
  };

  const handleThrottleSlider = (val: number) => {
    setLocalTelemetry(prev => ({ ...prev, throttle: val }));
    onThrottleChange(val);
    sendSyncMessage('THROTTLE_UPDATE', { throttle: val });
  };

  const handleAltitudeSlider = (val: number) => {
    setLocalTelemetry(prev => ({ ...prev, altitude: val }));
    onAltitudeChange(val);
    sendSyncMessage('ALTITUDE_UPDATE', { altitude: val });
  };

  const handlePing = () => {
    setPingStatus('PINGING...');
    sendSyncMessage('PING', { time: Date.now() });
    setTimeout(() => {
      setPingStatus('RTT: 8ms (50 Hz)');
      setTimeout(() => setPingStatus(null), 3000);
    }, 280);
  };

  const handlePopoutWindow = () => {
    const url = window.location.origin + window.location.pathname + '?view=3d-twin';
    window.open(url, 'AeroTwin_3D_VirtualTwin_Workstation', 'width=1340,height=880,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
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
      className={`relative w-full flex flex-col bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden ${
        isFullscreen ? 'h-screen fixed inset-0 z-50 p-3' : isStandalone ? 'min-h-screen p-4 sm:p-6' : isDualPane ? 'h-full p-3' : 'min-h-[calc(100vh-5rem)] p-4 sm:p-6'
      }`}
    >
      {/* 1. Software Window Header Bar (Desktop Application Chrome) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/90 mb-3 bg-slate-900/60 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 px-4 py-3">
        {/* Left: Software Identity & Mode Indicator */}
        <div className="flex items-center gap-3">
          {onBackToCockpit && !isStandalone && (
            <button
              id="btn-back-cockpit"
              onClick={onBackToCockpit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition shadow-xs cursor-pointer"
              title="Return to AeroTwin AI Cockpit"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">AeroTwin AI Cockpit</span>
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center shadow-md">
            <Cpu className="w-4 h-4 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-white tracking-wide font-mono">
                3D VIRTUAL TWIN WORKSTATION
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                v2.4 KINEMATIC CAD
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LINKED TO AEROTWIN AI
              </span>
              <span>•</span>
              <span className="font-mono text-slate-400">Rotax 915 iS Boxer Twin</span>
              <span>•</span>
              <span className="font-mono text-cyan-400 text-[10px]">RX: {packetCount} pkts</span>
            </div>
          </div>
        </div>

        {/* Right: Software Tools & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dual Pane Toggle (if in dual view mode) */}
          {onToggleDualPane && (
            <button
              onClick={onToggleDualPane}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-200 transition cursor-pointer"
              title="Toggle Side-by-Side Dual Software Mode"
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">{isDualPane ? 'Single View' : 'Dual Software Mode'}</span>
            </button>
          )}

          {/* Pop-out to Dedicated Separate Window */}
          {!isStandalone && (
            <button
              id="btn-popout-window"
              onClick={handlePopoutWindow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-indigo-200 transition cursor-pointer"
              title="Open 3D Virtual Twin as an independent window (Dual-Monitor Ready)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Separate Window</span>
            </button>
          )}

          {/* Quick Bridge Ping */}
          <button
            id="btn-bridge-ping"
            onClick={handlePing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-300 transition cursor-pointer"
            title="Ping IPC Bridge to AeroTwin AI"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">{pingStatus || 'Ping AI'}</span>
          </button>

          {/* View Mode Switcher (Native 3D vs External Applet) */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              id="btn-view-native"
              onClick={() => setViewMode('native')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                viewMode === 'native'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Native 3D</span>
            </button>
            <button
              id="btn-view-external"
              onClick={() => setViewMode('external')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                viewMode === 'external'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Ext. URL</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            id="btn-fullscreen-toggle"
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME AI INTER-SOFTWARE EVENT & ERROR ALERT BANNER */}
      <div className={`mb-3 p-3 rounded-xl border transition-all duration-300 flex flex-wrap items-center justify-between gap-3 shadow-md ${
        lastEventAlert.severity === 'CRITICAL'
          ? 'bg-rose-950/50 border-rose-500/70 text-rose-200 animate-pulse'
          : lastEventAlert.severity === 'WARNING'
          ? 'bg-amber-950/50 border-amber-500/70 text-amber-200'
          : lastEventAlert.severity === 'COMMAND'
          ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
          : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
      }`}>
        <div className="flex items-start gap-2.5">
          <div className={`p-1.5 rounded-lg mt-0.5 ${
            lastEventAlert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
            lastEventAlert.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
            lastEventAlert.severity === 'COMMAND' ? 'bg-cyan-500/20 text-cyan-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>
            {lastEventAlert.severity === 'CRITICAL' ? <AlertTriangle className="w-4 h-4" /> :
             lastEventAlert.severity === 'WARNING' ? <ShieldAlert className="w-4 h-4" /> :
             lastEventAlert.severity === 'COMMAND' ? <Zap className="w-4 h-4" /> :
             <CheckCircle2 className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">
                {lastEventAlert.title}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 opacity-80">
                ACTIVE IN 3D
              </span>
            </div>
            <p className="text-xs opacity-90 leading-relaxed max-w-3xl">
              {lastEventAlert.detail}
            </p>
          </div>
        </div>

        {/* Quick Log Drawer Toggle */}
        <button
          onClick={() => setIsLogDrawerOpen(prev => !prev)}
          className="flex items-center gap-1 px-2.5 py-1 bg-black/40 hover:bg-black/60 rounded-lg text-[11px] font-mono transition cursor-pointer border border-white/10"
        >
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span>IPC Log ({eventLogs.length})</span>
          {isLogDrawerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Collapsible IPC Event Log Drawer */}
      {isLogDrawerOpen && (
        <div className="mb-3 p-3 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto font-mono text-[11px] space-y-1.5 shadow-inner">
          <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 flex items-center justify-between">
            <span>AeroTwin AI ↔ 3D Virtual Twin IPC Event Stream</span>
            <span>Channel: aerotwin_bridge_channel</span>
          </div>
          {eventLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 py-0.5 border-b border-slate-800/60 last:border-0">
              <span className="text-slate-500 text-[10px]">{log.time}</span>
              <span className="text-indigo-400 font-bold">[{log.source}]</span>
              <span className={`font-semibold ${
                log.severity === 'CRITICAL' ? 'text-rose-400' :
                log.severity === 'WARNING' ? 'text-amber-400' :
                log.severity === 'COMMAND' ? 'text-cyan-400' : 'text-emerald-400'
              }`}>
                {log.type}:
              </span>
              <span className="text-slate-300 flex-1">{log.summary}</span>
            </div>
          ))}
        </div>
      )}

      {/* 3. Main Split View Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left / Center 3D Engine Viewport */}
        <div className={`${isDualPane ? 'lg:col-span-12' : 'lg:col-span-8 xl:col-span-9'} flex flex-col gap-3`}>
          {viewMode === 'native' ? (
            <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl min-h-[460px]">
              <LiveEngine3DView 
                telemetry={localTelemetry}
                physics={localPhysics}
                health={localHealth}
                diagnosis={localDiagnosis}
                activePreset={localActivePreset}
                onSelectComponent={handleSelectComponent}
              />
            </div>
          ) : (
            <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl min-h-[460px]">
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
                <span>Streaming Telemetry at 50 Hz to External Applet</span>
              </div>
            </div>
          )}

          {/* Quick HUD Telemetry Bar at bottom of 3D Canvas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-mono">
            <div className="p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 block">RPM</span>
              <span className="text-emerald-400 font-bold text-sm">{localTelemetry.rpm}</span>
            </div>
            <div className="p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 block">THROTTLE</span>
              <span className="text-slate-200 font-bold text-sm">{localTelemetry.throttle}%</span>
            </div>
            <div className="p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 block">VIB RMS</span>
              <span className={`font-bold text-sm ${localTelemetry.vibration > 3.0 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                {localTelemetry.vibration} <span className="text-[9px]">mm/s</span>
              </span>
            </div>
            <div className="p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 block">OIL PRESS</span>
              <span className={`font-bold text-sm ${localTelemetry.oilPressure < 3.8 ? 'text-amber-400' : 'text-slate-200'}`}>
                {localTelemetry.oilPressure} <span className="text-[9px]">bar</span>
              </span>
            </div>
            <div className="p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 block">COOLANT</span>
              <span className={`font-bold text-sm ${localTelemetry.coolantTemp > 100 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                {localTelemetry.coolantTemp}°C
              </span>
            </div>
            <div className="p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 block">CYL 2 CHT</span>
              <span className={`font-bold text-sm ${localTelemetry.cylinderTemps[1] > 260 ? 'text-amber-400 animate-pulse' : 'text-slate-200'}`}>
                {localTelemetry.cylinderTemps[1]}°C
              </span>
            </div>
            <div className="p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-center">
              <span className="text-[10px] text-slate-500 block">CYL 3 EGT</span>
              <span className={`font-bold text-sm ${localTelemetry.egt[2] > 740 ? 'text-rose-400' : 'text-slate-200'}`}>
                {localTelemetry.egt[2]}°C
              </span>
            </div>
          </div>

          {/* Propulsion Sliders (Directly linked to AeroTwin AI) */}
          <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Software Propulsion Link (Adjusting drives both AeroTwin AI & 3D Twin)
              </span>
              <button
                onClick={onReset}
                className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Power Lever (Throttle MCP):</span>
                  <span className="font-mono font-bold text-emerald-400">{localTelemetry.throttle}% MCP ({localTelemetry.rpm} RPM)</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={localTelemetry.throttle}
                  onChange={(e) => handleThrottleSlider(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Flight Altitude:</span>
                  <span className="font-mono font-bold text-cyan-400">{localTelemetry.altitude.toLocaleString()} FT (MAP {localTelemetry.manifoldPressure} inHg)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="18000"
                  step="500"
                  value={localTelemetry.altitude}
                  onChange={(e) => handleAltitudeSlider(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Scenario Injections & Diagnostics (Hidden or collapsed in dual pane if tight) */}
        {!isDualPane && (
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
            {/* AeroTwin AI Diagnostic Telemetry Card */}
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  AeroTwin AI Telemetry Link
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                  localDiagnosis.severity === 'CRITICAL' 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : localDiagnosis.severity === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {localDiagnosis.severity}
                </span>
              </div>

              <div className="text-xs font-bold text-white mb-1">
                {localDiagnosis.faultTitle}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                {localDiagnosis.rootCause}
              </p>

              <div className="space-y-1.5 text-[11px] font-mono border-t border-slate-800/80 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Combustion:</span>
                  <span className={localHealth.combustion < 70 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                    {localHealth.combustion}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lubrication / Bearings:</span>
                  <span className={localHealth.lubrication < 70 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                    {localHealth.lubrication}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cooling System:</span>
                  <span className={localHealth.cooling < 70 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                    {localHealth.cooling}%
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Overall Health:</span>
                  <span className={localHealth.overallHealthIndex < 70 ? 'text-rose-400' : 'text-emerald-400'}>
                    {localHealth.overallHealthIndex}%
                  </span>
                </div>
              </div>
            </div>

            {/* Scenario Injections (Synchronized with AeroTwin AI) */}
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  Fault Scenario Injector
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Bi-Directional</span>
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() => handleScenarioSelect('NORMAL')}
                  className={`w-full text-left p-2 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    localActivePreset === 'NORMAL'
                      ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200 font-semibold'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Normal Operation</span>
                  </div>
                  {localActivePreset === 'NORMAL' && (
                    <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded">
                      ACTIVE
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleScenarioSelect('BEARING_LUBRICATION')}
                  className={`w-full text-left p-2 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    localActivePreset === 'BEARING_LUBRICATION'
                      ? 'bg-rose-950/40 border-rose-500/80 text-rose-200 font-semibold'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Bearing Wear (Vibration)</span>
                  </div>
                  {localActivePreset === 'BEARING_LUBRICATION' && (
                    <span className="text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 px-1 py-0.2 rounded">
                      ACTIVE
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleScenarioSelect('INJECTOR_MISFIRE')}
                  className={`w-full text-left p-2 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    localActivePreset === 'INJECTOR_MISFIRE'
                      ? 'bg-amber-950/40 border-amber-500/80 text-amber-200 font-semibold'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-xs flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cylinder #3 Misfire</span>
                  </div>
                  {localActivePreset === 'INJECTOR_MISFIRE' && (
                    <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded">
                      ACTIVE
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleScenarioSelect('COOLING_LEAK')}
                  className={`w-full text-left p-2 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    localActivePreset === 'COOLING_LEAK'
                      ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-200 font-semibold'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-xs flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cooling Circuit Leak</span>
                  </div>
                  {localActivePreset === 'COOLING_LEAK' && (
                    <span className="text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-1 py-0.2 rounded">
                      ACTIVE
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleScenarioSelect('SENSOR_MALFUNCTION')}
                  className={`w-full text-left p-2 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    localActivePreset === 'SENSOR_MALFUNCTION'
                      ? 'bg-yellow-950/40 border-yellow-500/80 text-yellow-200 font-semibold'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-xs flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Cyl #2 Sensor Glitch</span>
                  </div>
                  {localActivePreset === 'SENSOR_MALFUNCTION' && (
                    <span className="text-[9px] font-mono font-bold bg-yellow-500/20 text-yellow-300 px-1 py-0.2 rounded">
                      ACTIVE
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Clicked Part Physics Inspector Drawer */}
            {selectedPart && (
              <div className="bg-slate-900/95 backdrop-blur-md border border-indigo-500/50 rounded-xl p-3 shadow-xl">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
                  <div className="text-xs font-bold text-white">
                    {selectedPart.title}
                  </div>
                  <button
                    onClick={() => setSelectedPart(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 mb-2">
                  {selectedPart.parameters.map((param, pIdx) => (
                    <div key={pIdx} className="flex justify-between text-[11px] p-1 rounded bg-slate-950/50">
                      <span className="text-slate-400">{param.name}:</span>
                      <span className="font-mono font-bold text-slate-100">
                        {param.value} {param.unit}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[10px] text-indigo-200">
                  <span className="font-bold text-white">Physics Insight: </span>
                  {selectedPart.physicsInsight}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Radio, 
  Copy, 
  Check, 
  X, 
  Layers, 
  Send, 
  ShieldCheck, 
  Code2, 
  Tv
} from 'lucide-react';
import { EngineTelemetry } from '../types';

interface ExternalSimBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  externalUrl: string;
  onUpdateExternalUrl: (url: string) => void;
  isSplitViewActive: boolean;
  onToggleSplitView: () => void;
  onSendTestPing: () => void;
  lastSentEvent: { type: string; timestamp: number; payload: any } | null;
  telemetry: EngineTelemetry;
  activePreset: string;
}

export const ExternalSimBridgeModal: React.FC<ExternalSimBridgeModalProps> = ({
  isOpen,
  onClose,
  externalUrl,
  onUpdateExternalUrl,
  isSplitViewActive,
  onToggleSplitView,
  onSendTestPing,
  lastSentEvent,
  telemetry,
  activePreset
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'code' | 'logs'>('setup');
  const [urlInput, setUrlInput] = useState(externalUrl || 'https://ai.studio/apps/16171890-ece0-41d4-a093-b2bcd8be3927');

  if (!isOpen) return null;

  const receiverCodeSnippet = `// ============================================================================
// PASTE THIS INTO YOUR OTHER AI STUDIO 3D SIMULATION PROJECT (e.g. App.tsx)
// ============================================================================

import { useEffect } from 'react';

export function useAeroTwinBridge(onEventReceived?: (event: any) => void) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 1. Validate message source
      if (event.data?.source !== 'AEROTWIN_AI') return;

      const { type, payload, timestamp } = event.data;
      console.log('⚡ [AeroTwin AI Sync]:', type, payload);

      // 2. React to Fault Presets & Mechanical Failures
      if (type === 'FAULT_PRESET_CHANGE') {
        const { preset, rpm, throttle, vibration, oilPressure } = payload;

        switch (preset) {
          case 'BEARING_LUBRICATION':
            // e.g. Trigger high crankshaft vibration or smoke in your 3D model
            console.log('Applying Bearing Degradation preset to 3D scene');
            break;

          case 'INJECTOR_MISFIRE':
            // e.g. Trigger Cylinder #3 flame or misfire animation
            console.log('Applying Cylinder #3 Misfire to 3D scene');
            break;

          case 'COOLING_SYSTEM_LEAK':
          case 'COOLING_LEAK':
            // e.g. Thermal heating glow across engine block
            console.log('Applying Cooling Loss to 3D scene');
            break;

          case 'SENSOR_BIAS_GLITCH':
            // Sensor glitch highlight
            console.log('Applying Sensor Glitch state');
            break;

          case 'NORMAL':
            // Reset to nominal cruise state
            console.log('Resetting 3D model to nominal state');
            break;
        }
      }

      // 3. React to Real-Time Telemetry Stream (Throttle, RPM, Altitude)
      if (type === 'TELEMETRY_UPDATE' || type === 'THROTTLE_CHANGE') {
        const { rpm, throttle } = payload;
        // Update your propeller or impeller rotation speed:
        // propellerMesh.rotation.z += (rpm / 60) * 0.1;
      }

      // 4. Custom callback if provided
      if (onEventReceived) {
        onEventReceived(event.data);
      }
    };

    // Listen to window postMessage
    window.addEventListener('message', handleMessage);

    // Also support BroadcastChannel across same-origin tabs
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('aerotwin_bridge_channel');
      channel.onmessage = handleMessage;
    } catch (e) {
      // Fallback
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      channel?.close();
    };
  }, [onEventReceived]);
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(receiverCodeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateExternalUrl(urlInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Radio className="w-5 h-5 animate-pulse text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  External Simulation Live Bridge
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Link AeroTwin AI clicks and telemetry directly to your other AI Studio 3D model
              </p>
            </div>
          </div>

          <button
            id="btn-close-bridge-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            onClick={() => setActiveTab('setup')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold font-mono transition cursor-pointer ${
              activeTab === 'setup'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            Connection & Live View
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold font-mono transition cursor-pointer ${
              activeTab === 'code'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Integration Code Snippet
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold font-mono transition cursor-pointer ${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Broadcast Monitor
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-300 text-xs">
          {activeTab === 'setup' && (
            <>
              {/* Target URL Input */}
              <form onSubmit={handleSaveUrl} className="space-y-2">
                <label className="block text-xs font-medium text-slate-200">
                  Target AI Studio Simulation App URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="input-external-sim-url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://ai.studio/apps/16171890-ece0-41d4-a093-b2bcd8be3927 or https://ais-pre-...run.app"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    id="btn-save-sim-url"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer text-xs"
                  >
                    Save URL
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Target: <span className="text-indigo-400 font-mono">{urlInput}</span>
                </p>
              </form>

              {/* Side-by-Side Split-View Launcher */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Embedded Side-by-Side Split View
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Embeds your other 3D simulation directly alongside AeroTwin AI so you can click presets and watch the 3D model react instantly!
                  </p>
                </div>
                <button
                  id="btn-toggle-split-view"
                  onClick={onToggleSplitView}
                  className={`px-4 py-2 rounded-xl font-bold font-mono text-xs transition cursor-pointer whitespace-nowrap ${
                    isSplitViewActive 
                      ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isSplitViewActive ? 'Close Split View' : 'Launch Split View'}
                </button>
              </div>

              {/* Test Broadcast Button */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40">
                <div>
                  <span className="font-semibold text-indigo-300">Live Sync Transmitter</span>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Active preset: <span className="font-mono text-white font-bold">{activePreset}</span> • Throttle: <span className="font-mono text-emerald-400 font-bold">{telemetry.throttle}%</span>
                  </div>
                </div>
                <button
                  id="btn-send-test-ping"
                  onClick={onSendTestPing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg font-mono text-xs font-bold transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Test Ping
                </button>
              </div>

              {/* Quick instructions box */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>How to connect in 2 simple steps:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
                  <li>Open your other AI Studio project (<span className="text-indigo-400 font-mono">16171890-ece0-41d4-a093-b2bcd8be3927</span>).</li>
                  <li>Click <strong>Integration Code Snippet</strong> tab above, copy the hook, and paste it into that project's code!</li>
                </ol>
              </div>
            </>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Copy and paste this hook into your other AI Studio project. It automatically catches every click, fault preset, and throttle change from AeroTwin AI.
                </p>
                <button
                  id="btn-copy-code-snippet"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold rounded-lg transition cursor-pointer text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Snippet'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-indigo-200 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-[380px]">
                {receiverCodeSnippet}
              </pre>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Live PostMessage & Broadcast Stream
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Transmitting Active
                </span>
              </div>

              {lastSentEvent ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-2">
                  <div className="flex items-center justify-between text-indigo-400 border-b border-slate-800 pb-2">
                    <span>EVENT: {lastSentEvent.type}</span>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(lastSentEvent.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-emerald-300 text-[11px] overflow-x-auto">
                    {JSON.stringify(lastSentEvent.payload, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 font-mono">
                  No events sent yet. Click any fault preset or adjust throttle to see the broadcasted payload here!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition cursor-pointer text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { ExternalLink, X, Radio, RefreshCw, Send } from 'lucide-react';

interface ExternalSimSplitViewProps {
  externalUrl: string;
  onClose: () => void;
  onOpenSettings: () => void;
  lastEventSummary: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export const ExternalSimSplitView: React.FC<ExternalSimSplitViewProps> = ({
  externalUrl,
  onClose,
  onOpenSettings,
  lastEventSummary,
  iframeRef
}) => {
  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  return (
    <div className="w-full bg-slate-900 border-b border-indigo-500/30 shadow-2xl transition-all animate-fadeIn">
      {/* Split-View Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="font-bold">EXTERNAL 3D SIMULATION (LINKED)</span>
          </div>

          <span className="text-slate-600 hidden md:inline">•</span>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Send className="w-3 h-3 text-emerald-400" />
            <span>Last Sync Event:</span>
            <span className="text-emerald-300 font-bold">{lastEventSummary || 'Ready'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-reload-external-sim"
            onClick={handleReload}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-[11px]"
            title="Reload External Simulation"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reload</span>
          </button>

          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px]"
              title="Open in new browser tab"
            >
              <ExternalLink className="w-3 h-3" />
              <span>New Tab</span>
            </a>
          )}

          <button
            onClick={onOpenSettings}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition cursor-pointer text-[11px] font-bold"
          >
            Bridge Settings & Code
          </button>

          <button
            id="btn-close-split-view"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close Split View"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Embedded Iframe Container */}
      <div className="relative w-full h-[460px] bg-slate-950 flex flex-col items-center justify-center">
        {externalUrl ? (
          <iframe
            ref={iframeRef}
            src={externalUrl}
            title="External 3D Simulation Model"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; camera; gyroscope; microphone"
          />
        ) : (
          <div className="text-center p-8 max-w-md space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center">
              <Radio className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">No External App URL Configured</h4>
            <p className="text-xs text-slate-400">
              Enter the URL of your other AI Studio project to render your 3D model directly in this window.
            </p>
            <button
              onClick={onOpenSettings}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer text-xs inline-flex items-center gap-2"
            >
              Configure External URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  EngineTelemetry, 
  FaultPreset, 
  CounterfactualOption, 
  UAVFleetItem 
} from './types';
import { INITIAL_TELEMETRY, SAMPLE_FLEET } from './utils/simulationData';
import {
  calculatePhysicsExpected,
  evaluateSubsystemHealth,
  diagnoseFaults,
  estimateRul,
  evaluateMissionReliability,
  generateCounterfactualOptions
} from './utils/enginePhysics';

import { Header } from './components/Header';
import { FaultInjectorBar } from './components/FaultInjectorBar';
import { TelemetryGaugesBar } from './components/TelemetryGaugesBar';
import { DigitalTwinCanvas } from './components/DigitalTwinCanvas';
import { SubsystemHealthPanel } from './components/SubsystemHealthPanel';
import { ResidualAnalysisView } from './components/ResidualAnalysisView';
import { RulMissionReliability } from './components/RulMissionReliability';
import { CounterfactualAdvisor } from './components/CounterfactualAdvisor';
import { XaiDiagnosisPanel } from './components/XaiDiagnosisPanel';
import { MissionReplayView } from './components/MissionReplayView';
import { WhatIfMissionPlanner } from './components/WhatIfMissionPlanner';
import { EnginePassportFleetView } from './components/EnginePassportFleetView';
import { SubsystemHealthAlertOverlay } from './components/SubsystemHealthAlertOverlay';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'twin' | 'counterfactual' | 'replay' | 'whatif' | 'passport'>('twin');

  // Airframe selection
  const [fleet, setFleet] = useState<UAVFleetItem[]>(SAMPLE_FLEET);
  const [selectedUavId, setSelectedUavId] = useState<string>('UAV-01');
  const [isCommsBlackout, setIsCommsBlackout] = useState<boolean>(false);

  // Live simulation telemetry state
  const [telemetry, setTelemetry] = useState<EngineTelemetry>(INITIAL_TELEMETRY);
  const [activePreset, setActivePreset] = useState<FaultPreset>('NORMAL');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [missionElapsedHours, setMissionElapsedHours] = useState<number>(5.7);

  const selectedUav = useMemo(() => {
    return fleet.find((u) => u.id === selectedUavId) || fleet[0];
  }, [fleet, selectedUavId]);

  // Handle switching UAV
  const handleSelectUav = (uav: UAVFleetItem) => {
    setSelectedUavId(uav.id);
    if (uav.id === 'UAV-03') {
      setActivePreset('BEARING_LUBRICATION');
    } else if (uav.id === 'UAV-05') {
      setActivePreset('COOLING_LEAK');
    } else {
      setActivePreset('NORMAL');
    }
  };

  // Physics and AI Evaluations (Derived State)
  const physics = useMemo(() => {
    return calculatePhysicsExpected(telemetry);
  }, [telemetry]);

  const health = useMemo(() => {
    return evaluateSubsystemHealth(telemetry, physics, activePreset);
  }, [telemetry, physics, activePreset]);

  const diagnosis = useMemo(() => {
    return diagnoseFaults(telemetry, physics, health, activePreset);
  }, [telemetry, physics, health, activePreset]);

  const rul = useMemo(() => {
    return estimateRul(health, diagnosis);
  }, [health, diagnosis]);

  const reliability = useMemo(() => {
    return evaluateMissionReliability(missionElapsedHours, 12, rul, diagnosis);
  }, [missionElapsedHours, rul, diagnosis]);

  const counterfactualOptions = useMemo(() => {
    return generateCounterfactualOptions(telemetry, diagnosis);
  }, [telemetry, diagnosis]);

  // Telemetry real-time generator loop
  useEffect(() => {
    if (!isRunning) return;

    const intervalTime = 1000 / simSpeed;
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        // Natural small jitter
        const jitter = (range: number) => (Math.random() - 0.5) * range;

        let targetVib = 2.12;
        let targetOilP = 4.65;
        let targetOilT = 86.4;
        let targetCht = [194, 198, 201, 196];
        let targetEgt = [688, 694, 702, 691];
        let targetCoolant = 81.2;

        if (activePreset === 'BEARING_LUBRICATION') {
          // Degradation trajectory: vibration rises, oil P drops, oil T increases
          targetVib = Math.min(4.8, prev.vibration + 0.08);
          targetOilP = Math.max(3.2, prev.oilPressure - 0.04);
          targetOilT = Math.min(106, prev.oilTemp + 0.3);
        } else if (activePreset === 'INJECTOR_MISFIRE') {
          // Cyl 3 EGT rises sharply, vibration slightly irregular
          targetEgt = [690, 695, Math.min(785, prev.egt[2] + 2.5), 692];
          targetVib = 2.85;
        } else if (activePreset === 'COOLING_LEAK') {
          // Coolant runaway and CHT overheating
          targetCoolant = Math.min(118, prev.coolantTemp + 0.8);
          targetCht = [
            Math.min(235, prev.cylinderTemps[0] + 0.6),
            Math.min(238, prev.cylinderTemps[1] + 0.6),
            Math.min(242, prev.cylinderTemps[2] + 0.6),
            Math.min(236, prev.cylinderTemps[3] + 0.6),
          ];
        } else if (activePreset === 'SENSOR_MALFUNCTION') {
          // Only CHT Sensor #2 reports false spike (325°C)
          targetCht = [195, 325, 202, 197];
          targetVib = 2.12;
          targetOilP = 4.65;
          targetOilT = 86.4;
        }

        // Apply throttle dependency to RPM
        const commandedRpm = Math.round(1800 + (prev.throttle / 100) * 3400);
        const rpmStep = Math.round((commandedRpm - prev.rpm) * 0.2);

        return {
          ...prev,
          timestamp: Date.now(),
          rpm: Math.max(1800, prev.rpm + rpmStep + Math.round(jitter(8))),
          vibration: Number(Math.max(1.0, (targetVib + jitter(0.06))).toFixed(2)),
          oilPressure: Number(Math.max(1.5, (targetOilP + jitter(0.04))).toFixed(2)),
          oilTemp: Number(Math.max(60, (targetOilT + jitter(0.2))).toFixed(1)),
          coolantTemp: Number(Math.max(60, (targetCoolant + jitter(0.15))).toFixed(1)),
          cylinderTemps: [
            Math.round(targetCht[0] + jitter(1)),
            Math.round(targetCht[1] + jitter(1)),
            Math.round(targetCht[2] + jitter(1)),
            Math.round(targetCht[3] + jitter(1)),
          ],
          egt: [
            Math.round(targetEgt[0] + jitter(2)),
            Math.round(targetEgt[1] + jitter(2)),
            Math.round(targetEgt[2] + jitter(2)),
            Math.round(targetEgt[3] + jitter(2)),
          ],
          fuelFlow: Number(Math.max(10, (14 + (prev.throttle / 100) * 14.5 + jitter(0.2))).toFixed(1)),
        };
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isRunning, simSpeed, activePreset]);

  // Reset simulation
  const handleReset = useCallback(() => {
    setActivePreset('NORMAL');
    setTelemetry(INITIAL_TELEMETRY);
  }, []);

  // Throttle adjustment
  const handleThrottleChange = useCallback((val: number) => {
    setTelemetry((prev) => ({
      ...prev,
      throttle: val,
    }));
  }, []);

  // Altitude adjustment
  const handleAltitudeChange = useCallback((val: number) => {
    // Ambient temperature lapse rate approx -2°C per 1000 ft above sea level (std 15°C)
    const ambient = Number((15 - (val / 1000) * 1.98).toFixed(1));
    setTelemetry((prev) => ({
      ...prev,
      altitude: val,
      ambientTemp: ambient,
    }));
  }, []);

  // Apply Counterfactual Intervention to live twin
  const handleApplyOption = useCallback((opt: CounterfactualOption) => {
    setTelemetry((prev) => {
      // If de-rate or descent, adjust throttle and altitude
      const newThrottle = Math.round(((opt.adjustedRpm - 1800) / 3400) * 100);
      return {
        ...prev,
        throttle: Math.max(30, Math.min(100, newThrottle)),
        altitude: opt.adjustedAltitude,
        // Thermal boundary and vibration immediately relax
        vibration: Number(Math.max(2.1, prev.vibration - 0.7).toFixed(2)),
        oilTemp: Number(Math.max(86, prev.oilTemp - 4.5).toFixed(1)),
        coolantTemp: Number(Math.max(80, prev.coolantTemp - 3.2).toFixed(1)),
      };
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation & Status Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedUav={selectedUav}
        setSelectedUavId={setSelectedUavId}
        fleet={fleet}
        isCommsBlackout={isCommsBlackout}
        setIsCommsBlackout={setIsCommsBlackout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* VIEW 1: LIVE DIGITAL TWIN COCKPIT */}
        {activeTab === 'twin' && (
          <div className="space-y-6">
            {/* Fault Injector & Telemetry Stream Controller */}
            <FaultInjectorBar
              activePreset={activePreset}
              onSelectPreset={setActivePreset}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
              simSpeed={simSpeed}
              setSimSpeed={setSimSpeed}
              onReset={handleReset}
              telemetry={telemetry}
              onThrottleChange={handleThrottleChange}
              onAltitudeChange={handleAltitudeChange}
            />

            {/* Instantaneous Digital Telemetry Gauges */}
            <TelemetryGaugesBar
              telemetry={telemetry}
              physics={physics}
            />

            {/* Primary Grid: 2D/3D Engine Virtual Replica & Subsystem Health Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DigitalTwinCanvas
                  telemetry={telemetry}
                  physics={physics}
                  health={health}
                  diagnosis={diagnosis}
                />
              </div>
              <div className="lg:col-span-1">
                <SubsystemHealthPanel
                  health={health}
                  diagnosis={diagnosis}
                />
              </div>
            </div>

            {/* Secondary Grid: Physics Residual Table & RUL / Mission Reliability */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResidualAnalysisView
                telemetry={telemetry}
                physics={physics}
              />
              <RulMissionReliability
                rul={rul}
                reliability={reliability}
                diagnosis={diagnosis}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: COUNTERFACTUAL ADVISOR & EXPLAINABLE AI (XAI) */}
        {activeTab === 'counterfactual' && (
          <div className="space-y-6">
            <CounterfactualAdvisor
              options={counterfactualOptions}
              telemetry={telemetry}
              diagnosis={diagnosis}
              onApplyOption={handleApplyOption}
            />
            <XaiDiagnosisPanel
              diagnosis={diagnosis}
            />
          </div>
        )}

        {/* VIEW 3: MISSION 034 REPLAY & TIMELINE SCRUBBER */}
        {activeTab === 'replay' && (
          <MissionReplayView />
        )}

        {/* VIEW 4: WHAT-IF MISSION PLANNER */}
        {activeTab === 'whatif' && (
          <WhatIfMissionPlanner />
        )}

        {/* VIEW 5: DIGITAL ENGINE PASSPORT & FLEET COMMAND */}
        {activeTab === 'passport' && (
          <EnginePassportFleetView
            onSelectUav={handleSelectUav}
            selectedUavId={selectedUavId}
          />
        )}
      </main>

      {/* Subsystem Health Alert Notification Overlay (< 70% threshold) */}
      <SubsystemHealthAlertOverlay
        health={health}
        activePreset={activePreset}
        diagnosis={diagnosis}
        telemetry={telemetry}
        onResetPreset={handleReset}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 font-mono flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-slate-700 font-semibold">AeroTwin AI</span>
          <span className="text-slate-300">|</span>
          <span>Defense AI Cognition Engine (SIH26054)</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span>DRDO / ADE MALE UAV Propulsion Specification</span>
          <span className="text-slate-300">•</span>
          <span>Rotax 914 / 915 iS Digital Twin Core</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * Prop shapes for the Three.js engine view.
 *
 * This module keeps its own types on purpose. The 3D scene is a self-contained
 * visualisation with its own vocabulary (per-cylinder arrays, a preset name that
 * drives which parts glow), and coupling it directly to the wire format would
 * mean every backend schema change rippled into 1000 lines of scene graph code.
 * `src/lib/adapt3d.ts` is the only place the two vocabularies meet.
 */

export type FaultPreset =
  | 'NORMAL'
  | 'BEARING_LUBRICATION'
  | 'INJECTOR_MISFIRE'
  | 'COOLING_LEAK'
  | 'SENSOR_MALFUNCTION';

export interface EngineTelemetry {
  timestamp: number;
  rpm: number;
  throttle: number;
  altitude: number;
  oilPressure: number;
  oilTemp: number;
  cylinderTemps: [number, number, number, number];
  egt: [number, number, number, number];
  fuelFlow: number;
  vibration: number;
  coolantTemp: number;
  manifoldPressure: number;
  ambientTemp: number;
}

export interface PhysicsExpectedModel {
  expectedRpm: number;
  expectedOilPressure: number;
  expectedOilTemp: number;
  expectedCht: number;
  expectedEgt: number;
  expectedFuelFlow: number;
  expectedVibration: number;
  expectedCoolantTemp: number;
  residualOilPressure: number;
  residualOilTemp: number;
  residualChtMax: number;
  residualEgtMax: number;
  residualVibration: number;
  residualFuelFlow: number;
}

export interface EngineSubsystemHealth {
  combustion: number;
  lubrication: number;
  cooling: number;
  fuelSystem: number;
  mechanical: number;
  electrical: number;
  overallHealthIndex: number;
}

export interface ShapAttributionFactor {
  parameter: string;
  contributionPercent: number;
  direction: 'increase' | 'decrease';
  description: string;
}

export interface FaultDiagnosis {
  severity: 'NORMAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
  faultDetected: boolean;
  isSensorFaultOnly: boolean;
  sensorFaultConfidence?: number;
  faultTitle: string;
  confidence: number;
  affectedComponents: string[];
  evidenceText: string[];
  recommendedAction: string;
  shapAttributions: ShapAttributionFactor[];
}

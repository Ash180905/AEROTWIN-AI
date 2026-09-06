export type FlightPhase = 'PRE_FLIGHT' | 'TAKEOFF' | 'CLIMB' | 'CRUISE' | 'DESCENT' | 'APPROACH' | 'RTB_EMERGENCY';

export type AlertSeverity = 'NORMAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL';

export type FaultPreset = 
  | 'NORMAL'
  | 'BEARING_LUBRICATION'
  | 'INJECTOR_MISFIRE'
  | 'COOLING_LEAK'
  | 'SENSOR_MALFUNCTION';

export interface EngineTelemetry {
  timestamp: number;
  rpm: number;
  throttle: number; // 0 - 100%
  altitude: number; // feet
  oilPressure: number; // bar (nominal 3.8 - 5.0)
  oilTemp: number; // °C (nominal 80 - 95)
  cylinderTemps: [number, number, number, number]; // CHT °C (nominal 170 - 210)
  egt: [number, number, number, number]; // Exhaust Gas Temp °C (nominal 670 - 710)
  fuelFlow: number; // L/h (nominal 20 - 28)
  vibration: number; // mm/s RMS (nominal 1.8 - 2.4)
  coolantTemp: number; // °C (nominal 78 - 85)
  manifoldPressure: number; // inHg (nominal 32 - 38)
  ambientTemp: number; // °C
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
  
  // Residuals: (Actual - Expected)
  residualOilPressure: number;
  residualOilTemp: number;
  residualChtMax: number;
  residualEgtMax: number;
  residualVibration: number;
  residualFuelFlow: number;
}

export interface EngineSubsystemHealth {
  combustion: number; // 0-100%
  lubrication: number; // 0-100%
  cooling: number; // 0-100%
  fuelSystem: number; // 0-100%
  mechanical: number; // 0-100%
  electrical: number; // 0-100%
  overallHealthIndex: number; // 0-100%
}

export interface ShapAttributionFactor {
  parameter: string;
  contributionPercent: number;
  direction: 'increase' | 'decrease';
  description: string;
}

export interface FaultDiagnosis {
  severity: AlertSeverity;
  faultDetected: boolean;
  isSensorFaultOnly: boolean; // Novelty feature 3: Sensor fault vs real engine fault
  sensorFaultConfidence?: number;
  faultTitle: string;
  confidence: number; // %
  affectedComponents: string[];
  evidenceText: string[];
  recommendedAction: string;
  shapAttributions: ShapAttributionFactor[];
}

export interface RulPrediction {
  estimatedHours: number;
  marginHours: number; // ± hrs
  degradationRate: 'STABLE' | 'MODERATE' | 'ACCELERATING';
  criticalFailureEtaMinutes: number | null; // e.g. 46 min if critical
  maintenancePriority: 'ROUTINE' | 'ELEVATED' | 'HIGH' | 'IMMEDIATE_RTB';
}

export interface MissionReliability {
  missionElapsedHours: number;
  missionRemainingHours: number;
  missionTotalHours: number;
  missionCompletionProbability: number; // 0-100%
  missionReliabilityIndex: number; // MRI 0-100%
  safeMarginHours: number;
  risks: {
    system: 'Engine' | 'Fuel' | 'Thermal' | 'Mechanical';
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
  }[];
}

export interface CounterfactualOption {
  id: 'A' | 'B' | 'C' | 'D';
  title: string;
  description: string;
  adjustedRpm: number;
  adjustedAltitude: number;
  failureRiskPercent: number;
  missionRecoveryPercent: number;
  isRecommended: boolean;
  tacticalOutcome: string;
}

export interface EnginePassport {
  engineId: string;
  model: string;
  serialNumber: string;
  uavAirframe: string;
  totalFlightHours: number;
  totalMissions: number;
  cyclesCount: number;
  lastOverhaulHoursAgo: number;
  nextScheduledMaintenanceHours: number;
  lifeLimits: {
    component: string;
    consumedHours: number;
    maxHours: number;
    healthPercent: number;
  }[];
  maintenanceLogs: {
    date: string;
    type: string;
    details: string;
    technician: string;
  }[];
}

export interface UAVFleetItem {
  id: string;
  tailNumber: string;
  missionCode: string;
  healthPercent: number;
  mriPercent: number;
  status: 'MISSION_READY' | 'AIRBORNE_NOMINAL' | 'AIRBORNE_CAUTION' | 'RTB_IN_PROGRESS' | 'MAINTENANCE_HOLD';
  assignedZone: string;
  currentAltitude: number;
  flightDuration: string;
}

export interface MissionReplayEvent {
  timeOffsetSec: number;
  timeLabel: string;
  phase: string;
  eventTitle: string;
  summary: string;
  telemetrySnapshot: Partial<EngineTelemetry>;
  engineHealth: number;
  faultProb: number;
}

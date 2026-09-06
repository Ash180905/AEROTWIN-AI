import {
  EngineTelemetry,
  EnginePassport,
  UAVFleetItem,
  MissionReplayEvent
} from '../types';

export const INITIAL_TELEMETRY: EngineTelemetry = {
  timestamp: Date.now(),
  rpm: 4820,
  throttle: 78,
  altitude: 18500,
  oilPressure: 4.65,
  oilTemp: 86.4,
  cylinderTemps: [194, 198, 201, 196],
  egt: [688, 694, 702, 691],
  fuelFlow: 24.6,
  vibration: 2.12,
  coolantTemp: 81.2,
  manifoldPressure: 34.8,
  ambientTemp: -14.2,
};

export const SAMPLE_ENGINE_PASSPORT: EnginePassport = {
  engineId: 'AE-2047',
  model: 'Rotax 915 iS Aero Piston Turbocharged (141 HP)',
  serialNumber: 'RTX-MALE-8841-B',
  uavAirframe: 'Tapas BH-201 (DRDO MALE UAV #03)',
  totalFlightHours: 1487.4,
  totalMissions: 163,
  cyclesCount: 382,
  lastOverhaulHoursAgo: 187.4,
  nextScheduledMaintenanceHours: 12.6,
  lifeLimits: [
    { component: 'Crankshaft Main Bearings', consumedHours: 1487, maxHours: 2000, healthPercent: 74 },
    { component: 'Turbocharger Compressor Wheel', consumedHours: 980, maxHours: 1500, healthPercent: 82 },
    { component: 'High-Pressure Fuel Injectors', consumedHours: 620, maxHours: 1000, healthPercent: 88 },
    { component: 'Forged Aluminum Pistons (x4)', consumedHours: 1487, maxHours: 2000, healthPercent: 79 },
    { component: 'Dual Ignition Magneto / ECU', consumedHours: 720, maxHours: 1200, healthPercent: 91 },
    { component: 'Oil Scavenge & Pressure Pump', consumedHours: 1487, maxHours: 2000, healthPercent: 72 },
  ],
  maintenanceLogs: [
    {
      date: '2026-08-22',
      type: '100-Hour Inspection & Oil Spectrometry',
      details: 'Oil flushed, synthetic Aeroshell Sport Plus 4 replenished. Spectrometry: Fe 4ppm, Cu 2ppm (Normal).',
      technician: 'Subedar M. Rawat (IAF Depot 4)'
    },
    {
      date: '2026-07-14',
      type: 'Direct Injector #2 Ultrasonic Flush',
      details: 'Injector spray pattern verified on test bench at 3.5 bar rail pressure. Cleaned carbon deposits.',
      technician: 'Flt Lt K. Varma (DRDO Flight Trials)'
    },
    {
      date: '2026-05-30',
      type: 'Turbo Wastegate Actuator Calibration',
      details: 'Checked boost controller linkage travel and diaphragm seal under 40 inHg simulated pressure.',
      technician: 'Sgt D. Pillai (Aero Eng Unit)'
    },
    {
      date: '2026-03-12',
      type: 'Crankcase Endoscopy & Bearing Clearance',
      details: 'Main journal clearances measured at 0.042 mm (Spec: 0.030 - 0.055 mm). No fretting detected.',
      technician: 'Dr. S. Nair (Chief Propulsion Specialist)'
    }
  ]
};

export const SAMPLE_FLEET: UAVFleetItem[] = [
  {
    id: 'UAV-01',
    tailNumber: 'TAPAS-01',
    missionCode: 'OP-TRISHUL-84',
    healthPercent: 96,
    mriPercent: 98,
    status: 'AIRBORNE_NOMINAL',
    assignedZone: 'Northern High Altitude Sector',
    currentAltitude: 21000,
    flightDuration: '07h 42m / 14h'
  },
  {
    id: 'UAV-02',
    tailNumber: 'TAPAS-02',
    missionCode: 'OP-VAYU-12',
    healthPercent: 88,
    mriPercent: 91,
    status: 'AIRBORNE_NOMINAL',
    assignedZone: 'Western Desert Recon Corridor',
    currentAltitude: 18500,
    flightDuration: '04h 18m / 12h'
  },
  {
    id: 'UAV-03',
    tailNumber: 'TAPAS-03',
    missionCode: 'OP-SARAS-34',
    healthPercent: 68,
    mriPercent: 61,
    status: 'AIRBORNE_CAUTION',
    assignedZone: 'Maritime Surveillance Sector Alpha',
    currentAltitude: 16200,
    flightDuration: '05h 25m / 11h'
  },
  {
    id: 'UAV-04',
    tailNumber: 'TAPAS-04',
    missionCode: 'RESERVE-QRF',
    healthPercent: 94,
    mriPercent: 97,
    status: 'MISSION_READY',
    assignedZone: 'Air Base Hangar Bay 2 (Pre-flight Cleared)',
    currentAltitude: 0,
    flightDuration: 'Standby / Quick Reaction'
  },
  {
    id: 'UAV-05',
    tailNumber: 'TAPAS-05',
    missionCode: 'POST-FLIGHT-CHECK',
    healthPercent: 43,
    mriPercent: 32,
    status: 'MAINTENANCE_HOLD',
    assignedZone: 'DRDO Propulsion Test Cell 4',
    currentAltitude: 0,
    flightDuration: 'Ground Diagnostic Mode'
  }
];

export const MISSION_034_REPLAY: MissionReplayEvent[] = [
  {
    timeOffsetSec: 0,
    timeLabel: '00:00',
    phase: 'TAKEOFF & CLIMB',
    eventTitle: 'Full Throttle Takeoff & Climb Out',
    summary: 'Full 5,200 RPM, 38 inHg boost pressure. All cylinder head temps stabilize at 195°C. Oil pressure 4.9 bar.',
    engineHealth: 98,
    faultProb: 1.2,
    telemetrySnapshot: {
      rpm: 5200,
      throttle: 98,
      altitude: 1200,
      oilPressure: 4.88,
      oilTemp: 84.0,
      cylinderTemps: [192, 195, 197, 193],
      egt: [705, 710, 712, 706],
      fuelFlow: 28.4,
      vibration: 2.15,
      coolantTemp: 82.0
    }
  },
  {
    timeOffsetSec: 4680,
    timeLabel: '01:18',
    phase: 'CRUISE',
    eventTitle: 'Stable High-Altitude Loiter Established',
    summary: 'Leveled off at 18,500 ft. Throttle set to 78% MCP. Vibration 2.1 mm/s. Expected vs actual residuals within 0.3-sigma.',
    engineHealth: 96,
    faultProb: 2.0,
    telemetrySnapshot: {
      rpm: 4820,
      throttle: 78,
      altitude: 18500,
      oilPressure: 4.65,
      oilTemp: 86.2,
      cylinderTemps: [194, 198, 201, 195],
      egt: [688, 694, 702, 691],
      fuelFlow: 24.5,
      vibration: 2.18,
      coolantTemp: 81.5
    }
  },
  {
    timeOffsetSec: 11640,
    timeLabel: '03:14',
    phase: 'CRUISE',
    eventTitle: 'Incipient Vibration Anomaly Detected',
    summary: 'Physics residual detects subtle harmonic shift: vibration rises from 2.1 to 2.65 mm/s. Autoencoder loss exceeds 95th percentile threshold.',
    engineHealth: 88,
    faultProb: 18.5,
    telemetrySnapshot: {
      rpm: 4815,
      throttle: 78,
      altitude: 18500,
      oilPressure: 4.45,
      oilTemp: 89.1,
      cylinderTemps: [196, 200, 204, 197],
      egt: [690, 696, 705, 693],
      fuelFlow: 24.6,
      vibration: 2.68,
      coolantTemp: 82.8
    }
  },
  {
    timeOffsetSec: 14520,
    timeLabel: '04:02',
    phase: 'CRUISE',
    eventTitle: 'Oil Pressure Loss & Viscous Thermal Rise',
    summary: 'Oil pressure dips to 4.05 bar (Nominal: 4.6 bar). Oil temperature reaches 94.5°C due to bearing micro-shear friction. AI enters Advisory state.',
    engineHealth: 78,
    faultProb: 34.0,
    telemetrySnapshot: {
      rpm: 4810,
      throttle: 78,
      altitude: 18500,
      oilPressure: 4.05,
      oilTemp: 94.5,
      cylinderTemps: [198, 202, 207, 199],
      egt: [692, 697, 706, 694],
      fuelFlow: 24.8,
      vibration: 3.12,
      coolantTemp: 84.1
    }
  },
  {
    timeOffsetSec: 16680,
    timeLabel: '04:38',
    phase: 'CRUISE',
    eventTitle: 'AI Fault Diagnosis: Bearing Degradation (42%)',
    summary: 'Multivariate correlation confirms bearing hydrodynamic film clearance widening. SHAP attribution identifies Vibration (40%) and Oil Pressure (34%) as key drivers.',
    engineHealth: 71,
    faultProb: 42.0,
    telemetrySnapshot: {
      rpm: 4805,
      throttle: 78,
      altitude: 18500,
      oilPressure: 3.75,
      oilTemp: 98.2,
      cylinderTemps: [200, 205, 210, 201],
      egt: [694, 700, 709, 696],
      fuelFlow: 25.1,
      vibration: 3.55,
      coolantTemp: 85.5
    }
  },
  {
    timeOffsetSec: 19020,
    timeLabel: '05:17',
    phase: 'LOITER',
    eventTitle: 'Failure Probability Accelerates to 67%',
    summary: 'Estimated RUL collapses to 14.5 hours against a 6.2-hour planned loiter. Mission Reliability Index drops into Yellow Caution tier.',
    engineHealth: 64,
    faultProb: 67.0,
    telemetrySnapshot: {
      rpm: 4800,
      throttle: 78,
      altitude: 18500,
      oilPressure: 3.42,
      oilTemp: 102.8,
      cylinderTemps: [204, 209, 215, 205],
      egt: [698, 704, 714, 700],
      fuelFlow: 25.5,
      vibration: 4.10,
      coolantTemp: 87.2
    }
  },
  {
    timeOffsetSec: 19500,
    timeLabel: '05:25',
    phase: 'DECISION',
    eventTitle: 'Operator Alert & Counterfactual Recommendation',
    summary: 'System advises Option D (Immediate RTB) + Option C power de-rate (-8% RPM). Failure risk without intervention: 81%. Recovery chance via RTB: 96%.',
    engineHealth: 59,
    faultProb: 76.0,
    telemetrySnapshot: {
      rpm: 4420,
      throttle: 68,
      altitude: 17200,
      oilPressure: 3.35,
      oilTemp: 104.2,
      cylinderTemps: [202, 207, 212, 203],
      egt: [685, 691, 700, 687],
      fuelFlow: 22.8,
      vibration: 3.78,
      coolantTemp: 85.8
    }
  },
  {
    timeOffsetSec: 20880,
    timeLabel: '05:48',
    phase: 'RECOVERY',
    eventTitle: 'Tactical Return to Base & Touchdown',
    summary: 'Autopilot completed safe descent and recovery touchdown on Air Base runway. Piston engine preserved from catastrophic seizure. Asset 100% saved.',
    engineHealth: 62,
    faultProb: 24.0,
    telemetrySnapshot: {
      rpm: 2100,
      throttle: 25,
      altitude: 0,
      oilPressure: 3.10,
      oilTemp: 92.0,
      cylinderTemps: [165, 169, 172, 166],
      egt: [540, 545, 552, 542],
      fuelFlow: 8.5,
      vibration: 1.85,
      coolantTemp: 78.0
    }
  }
];

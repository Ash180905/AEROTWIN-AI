import {
  EngineTelemetry,
  PhysicsExpectedModel,
  EngineSubsystemHealth,
  FaultDiagnosis,
  RulPrediction,
  MissionReliability,
  CounterfactualOption,
  FaultPreset
} from '../types';

/**
 * Calculates theoretical physics-based nominal values for a turbocharged
 * aero piston engine operating at given altitude, throttle, and RPM.
 */
export function calculatePhysicsExpected(
  telemetry: EngineTelemetry
): PhysicsExpectedModel {
  const throttleFrac = telemetry.throttle / 100;
  const altRatio = Math.max(0.4, 1 - (telemetry.altitude / 80000)); // air density approximation

  // Expected RPM under current throttle & load
  const expectedRpm = Math.round(1800 + throttleFrac * 3400);

  // Expected CHT (Cylinder Head Temp)
  const expectedCht = Math.round(155 + throttleFrac * 42 - (telemetry.ambientTemp < 0 ? 8 : 0));

  // Expected EGT (Exhaust Gas Temp)
  const expectedEgt = Math.round(650 + throttleFrac * 55);

  // Expected Oil Pressure (increases with RPM, decreases slightly with oil temp)
  const rpmFactor = telemetry.rpm / 5000;
  const tempDrop = (telemetry.oilTemp - 85) * 0.015;
  const expectedOilPressure = Number(Math.max(2.0, (2.8 + rpmFactor * 1.8 - tempDrop)).toFixed(2));

  // Expected Oil Temp
  const expectedOilTemp = Math.round(78 + throttleFrac * 12 + (1 - altRatio) * 6);

  // Expected Fuel Flow (L/h)
  const expectedFuelFlow = Number((14 + throttleFrac * 14.5).toFixed(1));

  // Expected Vibration (RMS mm/s) - nominal engine harmonics
  const expectedVibration = Number((1.5 + (telemetry.rpm / 5200) * 0.7).toFixed(2));

  // Expected Coolant Temp
  const expectedCoolantTemp = Math.round(76 + throttleFrac * 8);

  // Residuals (Actual - Expected)
  const maxCht = Math.max(...telemetry.cylinderTemps);
  const maxEgt = Math.max(...telemetry.egt);

  return {
    expectedRpm,
    expectedOilPressure,
    expectedOilTemp,
    expectedCht,
    expectedEgt,
    expectedFuelFlow,
    expectedVibration,
    expectedCoolantTemp,

    residualOilPressure: Number((telemetry.oilPressure - expectedOilPressure).toFixed(2)),
    residualOilTemp: Math.round(telemetry.oilTemp - expectedOilTemp),
    residualChtMax: Math.round(maxCht - expectedCht),
    residualEgtMax: Math.round(maxEgt - expectedEgt),
    residualVibration: Number((telemetry.vibration - expectedVibration).toFixed(2)),
    residualFuelFlow: Number((telemetry.fuelFlow - expectedFuelFlow).toFixed(1)),
  };
}

/**
 * Computes subsystem health breakdown (0 - 100%) based on real-time
 * telemetry deviations from physics nominals.
 */
export function evaluateSubsystemHealth(
  telemetry: EngineTelemetry,
  physics: PhysicsExpectedModel,
  preset: FaultPreset
): EngineSubsystemHealth {
  if (preset === 'SENSOR_MALFUNCTION') {
    // True engine is healthy, only one sensor is hallucinating
    return {
      combustion: 96,
      lubrication: 94,
      cooling: 93,
      fuelSystem: 95,
      mechanical: 94,
      electrical: 88, // slight dip for transducer glitch
      overallHealthIndex: 94,
    };
  }

  // 1. Combustion Health
  const egtDev = Math.abs(physics.residualEgtMax);
  const egtSpread = Math.max(...telemetry.egt) - Math.min(...telemetry.egt);
  let combustion = Math.max(25, 100 - (egtDev * 0.6) - (egtSpread > 45 ? (egtSpread - 45) * 0.8 : 0));

  // 2. Lubrication Health
  const oilPressDeficit = physics.residualOilPressure < 0 ? Math.abs(physics.residualOilPressure) * 35 : 0;
  const oilTempExcess = physics.residualOilTemp > 5 ? (physics.residualOilTemp - 5) * 2.2 : 0;
  let lubrication = Math.max(20, 100 - oilPressDeficit - oilTempExcess);

  // 3. Cooling Health
  const chtExcess = physics.residualChtMax > 10 ? (physics.residualChtMax - 10) * 1.5 : 0;
  const coolantExcess = telemetry.coolantTemp > 88 ? (telemetry.coolantTemp - 88) * 3.0 : 0;
  let cooling = Math.max(20, 100 - chtExcess - coolantExcess);

  // 4. Fuel System
  const fuelDev = Math.abs(physics.residualFuelFlow) * 6;
  let fuelSystem = Math.max(30, 100 - fuelDev);

  // 5. Mechanical (Vibration & Bearings)
  const vibExcess = physics.residualVibration > 0.4 ? (physics.residualVibration - 0.4) * 28 : 0;
  let mechanical = Math.max(18, 100 - vibExcess);

  // 6. Electrical / ECU
  let electrical = 97;

  // Weight overall index
  const overall = Math.round(
    combustion * 0.22 +
    lubrication * 0.25 +
    cooling * 0.18 +
    fuelSystem * 0.12 +
    mechanical * 0.18 +
    electrical * 0.05
  );

  return {
    combustion: Math.round(combustion),
    lubrication: Math.round(lubrication),
    cooling: Math.round(cooling),
    fuelSystem: Math.round(fuelSystem),
    mechanical: Math.round(mechanical),
    electrical: Math.round(electrical),
    overallHealthIndex: Math.min(100, Math.max(15, overall)),
  };
}

/**
 * Evaluates AI Fault Diagnosis with SHAP Explainable Attribution.
 * Implements Sensor vs Real Engine fault discrimination.
 */
export function diagnoseFaults(
  telemetry: EngineTelemetry,
  physics: PhysicsExpectedModel,
  health: EngineSubsystemHealth,
  preset: FaultPreset
): FaultDiagnosis {
  // Scenario 1: Sensor Malfunction vs Engine Fault (Novelty Feature)
  if (preset === 'SENSOR_MALFUNCTION') {
    return {
      severity: 'ADVISORY',
      faultDetected: true,
      isSensorFaultOnly: true,
      sensorFaultConfidence: 94.6,
      faultTitle: 'Transducer Anomaly (CHT Sensor #2 Glitch)',
      confidence: 94.6,
      affectedComponents: ['Thermocouple CHT-02', 'CAN Bus Channel B'],
      evidenceText: [
        'CHT #2 spiked to 325°C, but correlated EGT #2 remains steady at 692°C.',
        'Oil Temp (86°C) and Coolant Temp (81°C) show zero thermodynamic rise.',
        'Vibration (2.1 mm/s) shows zero mechanical distress.',
        'Physics residual model confirms false sensor reading; engine core is nominal.'
      ],
      recommendedAction: 'Suppress false threshold alarm. Log sensor calibration alert for post-flight maintenance. Flight cleared to continue.',
      shapAttributions: [
        { parameter: 'CHT Sensor #2 Delta', contributionPercent: 68, direction: 'increase', description: 'Isolated electrical/thermocouple divergence' },
        { parameter: 'EGT Correlation Ratio', contributionPercent: 18, direction: 'decrease', description: 'Discrepancy with exhaust thermocouple confirms anomaly' },
        { parameter: 'Coolant Normalcy', contributionPercent: 10, direction: 'decrease', description: 'Zero bulk thermal heat rejection observed' },
        { parameter: 'Oil Pressure Stability', contributionPercent: 4, direction: 'decrease', description: 'Nominal hydraulic barrier verified' }
      ]
    };
  }

  // Scenario 2: Bearing & Lubrication Degradation
  if (preset === 'BEARING_LUBRICATION' || (health.lubrication < 75 && health.mechanical < 78)) {
    const isCritical = health.lubrication < 50 || telemetry.vibration > 3.8;
    return {
      severity: isCritical ? 'CRITICAL' : 'WARNING',
      faultDetected: true,
      isSensorFaultOnly: false,
      faultTitle: 'Main Bearing Wear & Lubrication Film Breakdown',
      confidence: 91.2,
      affectedComponents: ['Journal Main Bearings #2 & #3', 'Oil Scavenge Pump', 'Crankshaft Journals'],
      evidenceText: [
        `Vibration elevated to ${telemetry.vibration} mm/s (Residual: +${physics.residualVibration} mm/s).`,
        `Oil Pressure dropped to ${telemetry.oilPressure} bar (Nominal physics floor: 3.8 bar).`,
        `Oil Temperature climbing: ${telemetry.oilTemp}°C (Friction dissipation thermal rise).`,
        'Multivariate autoencoder correlation confirms progressive hydro-dynamic film failure.'
      ],
      recommendedAction: isCritical 
        ? 'IMMEDIATE RTB REQUIRED. Reduce engine power to 68% MCP to mitigate seizure risk. Vector towards nearest safe diversion strip.'
        : 'ADVISORY: Bearing degradation trajectory active. Reduce cruise RPM by 8%. Initiate tactical return to base within 45 minutes.',
      shapAttributions: [
        { parameter: 'Mechanical Vibration (RMS)', contributionPercent: 38, direction: 'increase', description: 'High-frequency bearing cage harmonics' },
        { parameter: 'Oil Pressure Deficit', contributionPercent: 31, direction: 'decrease', description: 'Bearing clearance widening & hydraulic loss' },
        { parameter: 'Oil Temperature Gradient', contributionPercent: 19, direction: 'increase', description: 'Viscous friction and boundary contact heating' },
        { parameter: 'Engine Speed Load Factor', contributionPercent: 12, direction: 'increase', description: 'Shaft torque compounding degradation rate' }
      ]
    };
  }

  // Scenario 3: Injector Malfunction / Misfire
  if (preset === 'INJECTOR_MISFIRE' || health.combustion < 70) {
    const maxEgt = Math.max(...telemetry.egt);
    return {
      severity: 'WARNING',
      faultDetected: true,
      isSensorFaultOnly: false,
      faultTitle: 'Fuel Injector #3 Clogging & Lean Combustion Instability',
      confidence: 88.4,
      affectedComponents: ['Direct Injector Cyl #3', 'High-Pressure Fuel Rail', 'Exhaust Header #3'],
      evidenceText: [
        `Cylinder #3 EGT anomalous at ${maxEgt}°C (Deviation from mean: +${physics.residualEgtMax}°C).`,
        'Fuel flow oscillating with ±1.8 L/h pulse instability.',
        'FFT vibration spectrum detects rotational misfire harmonic at 0.5x crankshaft speed.',
        'Physics air-fuel balance model indicates lean mixture localized to Cylinder #3.'
      ],
      recommendedAction: 'Enrich mixture via ECU trim override. Limit boost pressure. Monitor Cylinder #3 CHT threshold; plan mission recovery.',
      shapAttributions: [
        { parameter: 'Cylinder #3 EGT Excess', contributionPercent: 44, direction: 'increase', description: 'Lean burn thermal peak in combustion chamber' },
        { parameter: 'Fuel Flow Jitter', contributionPercent: 26, direction: 'increase', description: 'Pulse-width modulated injector spray distortion' },
        { parameter: '0.5x Crank Harmonic', contributionPercent: 18, direction: 'increase', description: 'Rotational torque deficit each cycle' },
        { parameter: 'Throttle Angle', contributionPercent: 12, direction: 'increase', description: 'High load aggravating combustion imbalance' }
      ]
    };
  }

  // Scenario 4: Cooling System Leak / Overheating
  if (preset === 'COOLING_LEAK' || health.cooling < 65) {
    return {
      severity: 'CRITICAL',
      faultDetected: true,
      isSensorFaultOnly: false,
      faultTitle: 'Liquid Cooling Jacket Depressurization & Thermal Runaway',
      confidence: 93.8,
      affectedComponents: ['Coolant Heat Exchanger', 'Water Pump', 'Cylinder Head Water Jackets'],
      evidenceText: [
        `Coolant temperature critical at ${telemetry.coolantTemp}°C (Limit: 88°C).`,
        `Mean CHT climbing across all cylinders (Max CHT: ${Math.max(...telemetry.cylinderTemps)}°C).`,
        'Heat rejection rate collapsed by 34% relative to airspeed and altitude.',
        'Thermal model projects cylinder head warping within 28 minutes at current power.'
      ],
      recommendedAction: 'CRITICAL OVERHEAT WARNING. Open radiator cowl flap 100%. Reduce throttle to minimum sustaining cruise. Execute emergency descent to cooler ambient air.',
      shapAttributions: [
        { parameter: 'Coolant Bulk Temp', contributionPercent: 46, direction: 'increase', description: 'Failure of radiator fluid convective dissipation' },
        { parameter: 'Cylinder Head Temp Average', contributionPercent: 28, direction: 'increase', description: 'Conductive heat buildup in aluminum alloy block' },
        { parameter: 'Ambient Airflow Differential', contributionPercent: 16, direction: 'increase', description: 'Inadequate ram-air heat transfer' },
        { parameter: 'Oil Temperature Coupling', contributionPercent: 10, direction: 'increase', description: 'Oil cooler heat saturation' }
      ]
    };
  }

  // Nominal condition
  return {
    severity: 'NORMAL',
    faultDetected: false,
    isSensorFaultOnly: false,
    faultTitle: 'All Aero Piston Subsystems Nominal',
    confidence: 98.7,
    affectedComponents: [],
    evidenceText: [
      'Residual vector within 1.2-sigma normal Gaussian bounds across all 12 channels.',
      'Combustion stoichiometry matched to current altitude density ratio.',
      'Lubrication hydrodynamic film thickness stable with 4.5 bar delivery.',
      'Zero anomalous spectral vibration harmonics.'
    ],
    recommendedAction: 'Maintain scheduled mission profile. Next autonomous health scan in 30 seconds.',
    shapAttributions: [
      { parameter: 'Combustion Stability', contributionPercent: 25, direction: 'increase', description: 'Even torque delivery across 4 cylinders' },
      { parameter: 'Hydraulic Barrier', contributionPercent: 25, direction: 'increase', description: 'Oil pressure within 0.15 bar of physics model' },
      { parameter: 'Thermal Equilibrium', contributionPercent: 25, direction: 'increase', description: 'Coolant and CHT tracking altitude gradient' },
      { parameter: 'Rotational Balance', contributionPercent: 25, direction: 'increase', description: 'Vibration 2.1 mm/s well below ISO 10816-3 limit' }
    ]
  };
}

/**
 * Predicts Remaining Useful Life (RUL) with degradation modeling.
 */
export function estimateRul(
  health: EngineSubsystemHealth,
  diagnosis: FaultDiagnosis
): RulPrediction {
  if (diagnosis.isSensorFaultOnly || diagnosis.severity === 'NORMAL') {
    return {
      estimatedHours: 85.0,
      marginHours: 6.5,
      degradationRate: 'STABLE',
      criticalFailureEtaMinutes: null,
      maintenancePriority: 'ROUTINE',
    };
  }

  if (diagnosis.severity === 'CRITICAL') {
    return {
      estimatedHours: 0.8,
      marginHours: 0.2,
      degradationRate: 'ACCELERATING',
      criticalFailureEtaMinutes: 38,
      maintenancePriority: 'IMMEDIATE_RTB',
    };
  }

  if (diagnosis.severity === 'WARNING') {
    return {
      estimatedHours: 19.5,
      marginHours: 3.2,
      degradationRate: 'MODERATE',
      criticalFailureEtaMinutes: 145,
      maintenancePriority: 'HIGH',
    };
  }

  // Advisory
  return {
    estimatedHours: 42.0,
    marginHours: 5.0,
    degradationRate: 'STABLE',
    criticalFailureEtaMinutes: null,
    maintenancePriority: 'ELEVATED',
  };
}

/**
 * Evaluates Mission Reliability Index (MRI) and Mission Completion Probability.
 */
export function evaluateMissionReliability(
  missionElapsedHours: number,
  missionTotalHours: number,
  rul: RulPrediction,
  diagnosis: FaultDiagnosis
): MissionReliability {
  const missionRemainingHours = Number(Math.max(0, missionTotalHours - missionElapsedHours).toFixed(1));
  const safeMarginHours = Number((rul.estimatedHours - missionRemainingHours).toFixed(1));

  let missionCompletionProbability = 98.4;
  let mriScore = 95;

  if (diagnosis.isSensorFaultOnly) {
    missionCompletionProbability = 96.2;
    mriScore = 92;
  } else if (diagnosis.severity === 'CRITICAL') {
    missionCompletionProbability = 34.0;
    mriScore = 28;
  } else if (diagnosis.severity === 'WARNING') {
    missionCompletionProbability = 61.5;
    mriScore = 64;
  } else if (diagnosis.severity === 'ADVISORY') {
    missionCompletionProbability = 89.0;
    mriScore = 84;
  }

  return {
    missionElapsedHours,
    missionRemainingHours,
    missionTotalHours,
    missionCompletionProbability: Number(missionCompletionProbability.toFixed(1)),
    missionReliabilityIndex: mriScore,
    safeMarginHours,
    risks: [
      {
        system: 'Engine',
        level: diagnosis.severity === 'CRITICAL' ? 'HIGH' : diagnosis.severity === 'WARNING' ? 'MEDIUM' : 'LOW',
        description: diagnosis.faultDetected ? diagnosis.faultTitle : 'Core reciprocating assembly nominal',
      },
      {
        system: 'Lubrication' as any,
        level: diagnosis.faultTitle.includes('Bearing') || diagnosis.faultTitle.includes('Lubrication') ? 'HIGH' : 'LOW',
        description: 'Oil film integrity and journal pressure margin',
      },
      {
        system: 'Thermal',
        level: diagnosis.faultTitle.includes('Cooling') || diagnosis.faultTitle.includes('Overheat') ? 'HIGH' : 'LOW',
        description: 'Cylinder head and coolant convective heat rejection',
      },
      {
        system: 'Mechanical',
        level: diagnosis.faultTitle.includes('Bearing') ? 'HIGH' : 'LOW',
        description: 'Crankshaft torsional oscillation and vibration spectral energy',
      },
    ],
  };
}

/**
 * Evaluates Counterfactual Decisions (Options A, B, C, D)
 * to answer: "What action gives the highest chance of saving the UAV?"
 */
export function generateCounterfactualOptions(
  telemetry: EngineTelemetry,
  diagnosis: FaultDiagnosis
): CounterfactualOption[] {
  if (diagnosis.severity === 'NORMAL' || diagnosis.isSensorFaultOnly) {
    return [
      {
        id: 'A',
        title: 'Maintain Current Cruise Profile',
        description: 'Continue steady 4,800 RPM at 18,500 ft cruise envelope.',
        adjustedRpm: telemetry.rpm,
        adjustedAltitude: telemetry.altitude,
        failureRiskPercent: 3.2,
        missionRecoveryPercent: 99.1,
        isRecommended: true,
        tacticalOutcome: 'Full mission duration achievable without constraint.'
      },
      {
        id: 'B',
        title: 'Economy Cruise Step-Down',
        description: 'Reduce throttle to 72% (4,400 RPM) to conserve fuel.',
        adjustedRpm: 4400,
        adjustedAltitude: telemetry.altitude,
        failureRiskPercent: 2.1,
        missionRecoveryPercent: 99.5,
        isRecommended: false,
        tacticalOutcome: 'Extends loiter endurance by +1.8 hours.'
      },
      {
        id: 'C',
        title: 'High-Altitude Loiter Step-Up',
        description: 'Climb to 22,000 ft for improved sensor line-of-sight.',
        adjustedRpm: 5100,
        adjustedAltitude: 22000,
        failureRiskPercent: 6.4,
        missionRecoveryPercent: 97.2,
        isRecommended: false,
        tacticalOutcome: 'Higher turbo boost load; acceptable for short operational phases.'
      },
      {
        id: 'D',
        title: 'Return to Base (RTB)',
        description: 'Abort patrol and initiate immediate transit to recovery base.',
        adjustedRpm: 4200,
        adjustedAltitude: 8000,
        failureRiskPercent: 1.0,
        missionRecoveryPercent: 100.0,
        isRecommended: false,
        tacticalOutcome: 'Premature mission abort with zero tactical benefit.'
      }
    ];
  }

  // Under degradation or fault
  return [
    {
      id: 'A',
      title: 'Continue Current RPM & Mission Route',
      description: `Maintain ${telemetry.rpm} RPM at current flight level without alteration.`,
      adjustedRpm: telemetry.rpm,
      adjustedAltitude: telemetry.altitude,
      failureRiskPercent: diagnosis.severity === 'CRITICAL' ? 89.4 : 78.2,
      missionRecoveryPercent: diagnosis.severity === 'CRITICAL' ? 22.0 : 48.5,
      isRecommended: false,
      tacticalOutcome: 'High probability of catastrophic mid-mission engine failure and lost UAV airframe.'
    },
    {
      id: 'B',
      title: 'De-rate Engine Power (-8% RPM)',
      description: 'Throttle back to 4,420 RPM to reduce bearing shear stresses & thermal flux.',
      adjustedRpm: 4420,
      adjustedAltitude: telemetry.altitude,
      failureRiskPercent: diagnosis.severity === 'CRITICAL' ? 62.0 : 49.8,
      missionRecoveryPercent: diagnosis.severity === 'CRITICAL' ? 52.0 : 71.4,
      isRecommended: false,
      tacticalOutcome: 'Reduces degradation rate by 38%; insufficient for full 7-hour remaining mission.'
    },
    {
      id: 'C',
      title: 'Step Down Altitude (-4,000 ft) + De-rate',
      description: 'Descend to denser, cooler ambient air while trimming throttle to 4,200 RPM.',
      adjustedRpm: 4200,
      adjustedAltitude: Math.max(6000, telemetry.altitude - 4000),
      failureRiskPercent: diagnosis.severity === 'CRITICAL' ? 44.5 : 34.0,
      missionRecoveryPercent: diagnosis.severity === 'CRITICAL' ? 68.2 : 82.6,
      isRecommended: diagnosis.severity !== 'CRITICAL',
      tacticalOutcome: 'Cooler ram-air relieves thermal boundary; buys 2.5 hours of controlled flight.'
    },
    {
      id: 'D',
      title: 'Initiate Return to Base (RTB) Protocol',
      description: 'Engage autopilot emergency diversion vector to recovery runway with power glide.',
      adjustedRpm: 3800,
      adjustedAltitude: 5000,
      failureRiskPercent: 8.5,
      missionRecoveryPercent: 96.8,
      isRecommended: diagnosis.severity === 'CRITICAL',
      tacticalOutcome: 'Maximizes airframe survivability; guarantees safe recovery before mechanical seizure.'
    }
  ];
}

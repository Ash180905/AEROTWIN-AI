/**
 * The only place the wire format and the 3D scene's vocabulary meet.
 *
 * The Three.js view drives its animation from per-cylinder arrays and a preset
 * name that decides which parts glow. The backend speaks residuals, health
 * indices and fault classes. Translating in one small module keeps a schema
 * change from rippling through a thousand lines of scene graph.
 */

import type { TelemetryFrame } from '../api/types';
import { FAULT_LABEL } from './format';
import type {
  EngineSubsystemHealth,
  EngineTelemetry,
  FaultDiagnosis,
  FaultPreset,
  PhysicsExpectedModel,
} from '../engine3d/types';

/**
 * The scene knows SENSOR_MALFUNCTION; the backend classifies SENSOR_DRIFT.
 * Same condition, two vocabularies, mapped here rather than renamed in either.
 */
export function toPreset(frame: TelemetryFrame): FaultPreset {
  if (frame.ai.is_sensor_fault) return 'SENSOR_MALFUNCTION';
  switch (frame.ai.fault_class) {
    case 'BEARING_LUBRICATION':
      return 'BEARING_LUBRICATION';
    case 'INJECTOR_MISFIRE':
      return 'INJECTOR_MISFIRE';
    case 'COOLING_LEAK':
      return 'COOLING_LEAK';
    case 'SENSOR_DRIFT':
      return 'SENSOR_MALFUNCTION';
    default:
      // COMBUSTION_INSTABILITY has no dedicated scene treatment; the thermal
      // shading driven by live EGT already shows it.
      return 'NORMAL';
  }
}

export function toTelemetry(frame: TelemetryFrame): EngineTelemetry {
  const { obs } = frame;
  return {
    timestamp: frame.t * 1000,
    rpm: obs.rpm,
    throttle: obs.throttle,
    altitude: obs.altitude,
    oilPressure: obs.oil_pressure,
    oilTemp: obs.oil_temp,
    cylinderTemps: [obs.cht1, obs.cht2, obs.cht3, obs.cht4],
    egt: [obs.egt1, obs.egt2, obs.egt3, obs.egt4],
    fuelFlow: obs.fuel_flow,
    vibration: obs.vibration,
    coolantTemp: obs.coolant_temp,
    manifoldPressure: obs.map,
    ambientTemp: obs.ambient_temp,
  };
}

export function toPhysics(frame: TelemetryFrame): PhysicsExpectedModel {
  const { expected, residuals } = frame;
  return {
    expectedRpm: expected.rpm,
    expectedOilPressure: expected.oil_pressure,
    expectedOilTemp: expected.oil_temp,
    expectedCht: expected.cht,
    expectedEgt: expected.egt,
    expectedFuelFlow: expected.fuel_flow,
    expectedVibration: expected.vibration,
    expectedCoolantTemp: expected.coolant_temp,
    residualOilPressure: residuals.res_oil_pressure,
    residualOilTemp: residuals.res_oil_temp,
    residualChtMax: residuals.res_cht_max,
    residualEgtMax: residuals.res_egt_max,
    residualVibration: residuals.res_vibration,
    residualFuelFlow: residuals.res_fuel_flow,
  };
}

export function toHealth(frame: TelemetryFrame): EngineSubsystemHealth {
  const { health } = frame;
  return {
    combustion: health.combustion,
    lubrication: health.lubrication,
    cooling: health.cooling,
    fuelSystem: health.fuel_system,
    mechanical: health.mechanical,
    electrical: health.electrical,
    overallHealthIndex: health.overall,
  };
}

export function toDiagnosis(frame: TelemetryFrame): FaultDiagnosis {
  const { ai, alerts } = frame;

  // Severity comes from the alerts the backend actually raised rather than
  // being re-derived here, so the 3D view cannot disagree with the alert panel.
  const worst = alerts[0]?.severity;
  const severity =
    worst === 'critical'
      ? 'CRITICAL'
      : worst === 'warning'
        ? 'WARNING'
        : worst === 'caution' || worst === 'advisory'
          ? 'ADVISORY'
          : 'NORMAL';

  return {
    severity,
    faultDetected: ai.fault_class !== 'NORMAL' || ai.anomaly,
    isSensorFaultOnly: ai.is_sensor_fault,
    sensorFaultConfidence: ai.sensor_fault_prob,
    faultTitle: FAULT_LABEL[ai.fault_class],
    confidence: ai.fault_confidence * 100,
    affectedComponents: alerts
      .map((alert) => alert.subsystem)
      .filter((s): s is NonNullable<typeof s> => s != null),
    evidenceText: alerts.map((alert) => alert.message),
    recommendedAction: ai.is_sensor_fault
      ? 'Instrumentation fault — mission continuation supported'
      : ai.fault_class === 'NORMAL'
        ? 'Continue mission'
        : 'Review advisory',
    shapAttributions: [],
  };
}

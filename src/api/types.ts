/**
 * The telemetry contract, mirroring the backend's `app/schemas.py`.
 *
 * The backend publishes an OpenAPI schema (`openapi.json`) that these types are
 * derived from, so there is one definition of every payload rather than two
 * that drift. Regenerate with:
 *
 *   npx openapi-typescript ../digitwin-be/openapi.json -o src/api/generated.ts
 *
 * These hand-written types stay because they are narrower and easier to read
 * than the generated ones; if the two disagree, the backend schema wins.
 */

export type FaultClass =
  | 'NORMAL'
  | 'BEARING_LUBRICATION'
  | 'INJECTOR_MISFIRE'
  | 'COOLING_LEAK'
  | 'SENSOR_DRIFT'
  | 'COMBUSTION_INSTABILITY';

export type Severity = 'info' | 'advisory' | 'caution' | 'warning' | 'critical';

export type Subsystem =
  | 'combustion'
  | 'lubrication'
  | 'cooling'
  | 'fuel_system'
  | 'mechanical'
  | 'electrical';

export type FlightPhase = 'ground' | 'climb' | 'cruise' | 'descent';

export type MissionScenario =
  | 'standard_isr'
  | 'high_altitude'
  | 'endurance'
  | 'hot_weather'
  | 'rapid_transitions';

export interface Observation {
  throttle: number;
  altitude: number;
  ambient_temp: number;
  rpm: number;
  map: number;
  oil_pressure: number;
  oil_temp: number;
  coolant_temp: number;
  fuel_flow: number;
  vibration: number;
  cht1: number;
  cht2: number;
  cht3: number;
  cht4: number;
  egt1: number;
  egt2: number;
  egt3: number;
  egt4: number;
  bus_voltage: number;
  bus_current: number;
}

export interface ExpectedState {
  rpm: number;
  oil_pressure: number;
  oil_temp: number;
  cht: number;
  egt: number;
  fuel_flow: number;
  vibration: number;
  coolant_temp: number;
  map: number;
}

export interface Residuals {
  res_rpm: number;
  res_oil_pressure: number;
  res_oil_temp: number;
  res_cht_max: number;
  res_egt_max: number;
  res_egt_spread: number;
  res_fuel_flow: number;
  res_vibration: number;
  res_coolant_temp: number;
}

export interface ConsistencyFeatures {
  cht_excess_over_median: number;
  egt_corroboration: number;
  coolant_corroboration: number;
  oil_corroboration: number;
  vib_corroboration: number;
  egt_cht_ratio: number;
  coolant_cht_ratio: number;
  oil_cht_ratio: number;
}

export interface HealthIndices {
  combustion: number;
  lubrication: number;
  cooling: number;
  fuel_system: number;
  mechanical: number;
  electrical: number;
  overall: number;
}

export interface AIAssessment {
  anomaly_score: number;
  anomaly_threshold: number;
  anomaly: boolean;
  fault_class: FaultClass;
  fault_confidence: number;
  fault_probabilities: Record<string, number>;
  is_sensor_fault: boolean;
  sensor_fault_prob: number;
  /** Null while no degradation is detected — RUL is right-censored on a healthy engine. */
  rul_hours: number | null;
  rul_p10: number | null;
  rul_p90: number | null;
  rul_censored: boolean;
  rul_horizon_hours: number;
  inference_ms: number;
  source: 'edge' | 'gcs';
  /** True until the 5-minute feature window fills; windowed models are unreliable before that. */
  warmup: boolean;
}

export interface Alert {
  severity: Severity;
  subsystem: Subsystem | null;
  code: string;
  message: string;
  since: number;
}

export interface TelemetryFrame {
  t: number;
  sim_time_s: number;
  flight_id: string;
  engine_id: string;
  phase: FlightPhase;
  obs: Observation;
  expected: ExpectedState;
  residuals: Residuals;
  consistency: ConsistencyFeatures;
  health: HealthIndices;
  ai: AIAssessment;
  alerts: Alert[];
}

export interface SimulationStatus {
  running: boolean;
  paused: boolean;
  flight_id: string;
  engine_id: string;
  scenario: MissionScenario;
  sim_time_s: number;
  duration_s: number;
  time_scale: number;
  active_fault: FaultClass;
  fault_severity: number;
  clients_connected: number;
  downlink_up: boolean;
}

export interface SimulationConfig {
  scenario: MissionScenario;
  /** Null means "use the scenario preset". Never send a default here. */
  duration_hours?: number | null;
  cruise_altitude_ft?: number | null;
  day_offset_c?: number | null;
  time_scale?: number | null;
  engine_id?: string;
}

export interface ScenarioInfo {
  scenario: MissionScenario;
  description: string;
  duration_hours: number;
  cruise_altitude_ft: number;
  day_offset_c: number;
}

export interface FaultInjection {
  fault_class: FaultClass;
  onset_sim_seconds?: number;
  severity_rate?: number;
  cylinder?: number | null;
}

export interface MaintenanceAdvisory {
  urgency: Severity;
  action: string;
  rationale: string;
  deadline_hours: number | null;
  subsystem: Subsystem | null;
}

export interface CounterfactualOption {
  action: string;
  description: string;
  projected_rul_hours: number;
  rul_delta_hours: number;
  mission_completion_prob: number;
  recommended: boolean;
}

export interface AdvisoryResponse {
  maintenance: MaintenanceAdvisory[];
  options: CounterfactualOption[];
  mission_completion_prob: number;
  remaining_mission_hours: number;
}

export interface FeatureAttribution {
  feature: string;
  value: number;
  contribution: number;
}

export interface Explanation {
  fault_class: FaultClass;
  confidence: number;
  base_value: number;
  attributions: FeatureAttribution[];
  /** Exact TreeSHAP, or the gain-weighted approximation. Never presented as the same thing. */
  source: 'tree_shap' | 'gain_weighted';
  narrative: string;
}

export interface SensorEvidenceItem {
  feature: string;
  value: number;
  contribution: number;
  direction: 'sensor' | 'engine';
}

export interface SensorEvidence {
  is_sensor_fault: boolean;
  sensor_fault_prob: number;
  verdict: string;
  decided_by: string;
  evidence: SensorEvidenceItem[];
  /** The discriminator's intercept: a standing prior that a deviation is mechanical. */
  baseline: number;
  baseline_meaning: string;
  total_logit: number;
  explanation: string;
}

export interface MissionSummary {
  flight_id: string;
  engine_id: string;
  scenario: MissionScenario;
  started_at: number;
  ended_at: number | null;
  duration_s: number;
  frames: number;
  peak_fault: FaultClass;
  min_health: number;
  alerts: number;
}

export interface ReplayResponse {
  flight_id: string;
  from_s: number;
  to_s: number;
  frames: TelemetryFrame[];
  truncated: boolean;
}

export interface MissionReport {
  summary: MissionSummary;
  health_trend: { sim_time_s: number[]; overall: number[]; rul_hours: number[] };
  fault_timeline: Alert[];
  final_rul_hours: number | null;
  advisories: MaintenanceAdvisory[];
  notes: string[];
}

export interface EnginePassport {
  engine_id: string;
  model: string;
  serial: string;
  total_hours: number;
  tbo_hours: number;
  hours_since_overhaul: number;
  cycles: number;
  installed_on: string;
  components: {
    name: string;
    life_limit_hours: number;
    hours_used: number;
    life_remaining_pct: number;
  }[];
  maintenance_log: {
    date: string;
    hours: number;
    action: string;
    finding: string;
    technician: string;
  }[];
}

export interface FleetEngineStatus {
  engine_id: string;
  airframe: string;
  status: string;
  health_overall: number;
  rul_hours: number | null;
  active_fault: FaultClass;
  hours_since_overhaul: number;
  ready: boolean;
}

export interface FleetStatus {
  engines: FleetEngineStatus[];
  ready_count: number;
  total_count: number;
}

export interface ModelCard {
  name: string;
  path: string;
  n_features: number | null;
  size_kb: number;
  loaded: boolean;
  tier: string;
  metrics: Record<string, number | null>;
}

export interface SystemHealth {
  status: string;
  version: string;
  inference_tier: string;
  models: ModelCard[];
  can_bus: string;
  uptime_s: number;
}

export interface Limitations {
  training_data: string;
  validation_is_internally_honest: string;
  what_is_unproven: string;
  external_validation_completed: Record<string, string>;
  external_validation_outstanding: Record<string, string>;
  how_it_would_be_closed: string[];
  known_model_issues: string[];
}

export interface CmapssReport {
  dataset: string;
  purpose: string;
  protocol: string;
  rmse_cycles: number;
  mae_cycles: number;
  phm08_score: number;
  interval_coverage_p10_p90: number;
  test_units: number;
  literature_rmse_fd001: Record<string, number>;
}

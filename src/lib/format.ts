/**
 * Units, labels and severity colours.
 *
 * Centralised because a cockpit that shows the same severity in two different
 * colours on two different panels trains operators to stop trusting the colour.
 */

import type { FaultClass, Severity, Subsystem } from '../api/types';

export const SEVERITY_ORDER: Severity[] = [
  'critical',
  'warning',
  'caution',
  'advisory',
  'info',
];

export const SEVERITY_STYLE: Record<Severity, { chip: string; text: string; dot: string }> = {
  critical: {
    chip: 'bg-rose-50 border-rose-300 text-rose-800',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  warning: {
    chip: 'bg-amber-50 border-amber-300 text-amber-800',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  caution: {
    chip: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
  },
  advisory: {
    chip: 'bg-sky-50 border-sky-300 text-sky-800',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
  },
  info: {
    chip: 'bg-slate-50 border-slate-300 text-slate-700',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
};

export const SUBSYSTEM_LABEL: Record<Subsystem, string> = {
  combustion: 'Combustion',
  lubrication: 'Lubrication',
  cooling: 'Cooling',
  fuel_system: 'Fuel system',
  mechanical: 'Mechanical',
  electrical: 'Electrical',
};

export const FAULT_LABEL: Record<FaultClass, string> = {
  NORMAL: 'Nominal',
  BEARING_LUBRICATION: 'Bearing lubrication loss',
  INJECTOR_MISFIRE: 'Injector misfire',
  COOLING_LEAK: 'Cooling system leak',
  SENSOR_DRIFT: 'Sensor drift',
  COMBUSTION_INSTABILITY: 'Combustion instability',
};

/** Health bands match the backend's alert trip points so the UI cannot disagree with it. */
export function healthColor(value: number): string {
  if (value < 30) return 'text-rose-600';
  if (value < 50) return 'text-amber-600';
  if (value < 70) return 'text-yellow-600';
  return 'text-emerald-600';
}

export function healthBar(value: number): string {
  if (value < 30) return 'bg-rose-500';
  if (value < 50) return 'bg-amber-500';
  if (value < 70) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

export function fmt(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

export function fmtSigned(value: number, digits = 1): string {
  const text = value.toFixed(digits);
  return value > 0 ? `+${text}` : text;
}

/** Sortie time as h:mm:ss — operators read elapsed time, not seconds. */
export function fmtDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtHours(hours: number | null | undefined): string {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} h`;
}

/**
 * Turn a backend feature name into something readable.
 * `res_cht_max_slope` -> "CHT max residual (trend)".
 */
const FEATURE_BASE: Record<string, string> = {
  res_rpm: 'RPM residual',
  res_oil_pressure: 'Oil pressure residual',
  res_oil_temp: 'Oil temperature residual',
  res_cht_max: 'CHT max residual',
  res_egt_max: 'EGT max residual',
  res_egt_spread: 'EGT spread residual',
  res_fuel_flow: 'Fuel flow residual',
  res_vibration: 'Vibration residual',
  res_coolant_temp: 'Coolant temperature residual',
  cht_excess_over_median: 'Hot head isolation',
  egt_corroboration: 'EGT corroboration',
  coolant_corroboration: 'Coolant corroboration',
  oil_corroboration: 'Oil corroboration',
  vib_corroboration: 'Vibration corroboration',
  egt_cht_ratio: 'EGT/CHT response ratio',
  coolant_cht_ratio: 'Coolant/CHT response ratio',
  oil_cht_ratio: 'Oil/CHT response ratio',
  health_combustion: 'Combustion health',
  health_lubrication: 'Lubrication health',
  health_cooling: 'Cooling health',
  health_fuel_system: 'Fuel system health',
  health_mechanical: 'Mechanical health',
  health_electrical: 'Electrical health',
  health_overall: 'Overall health',
};

const STAT_LABEL: Record<string, string> = {
  mean: 'level',
  std: 'variability',
  slope: 'trend',
};

export function featureLabel(name: string): string {
  const parts = name.split('_');
  const stat = parts[parts.length - 1];
  if (stat in STAT_LABEL) {
    const base = parts.slice(0, -1).join('_');
    return `${FEATURE_BASE[base] ?? base.replace(/_/g, ' ')} (${STAT_LABEL[stat]})`;
  }
  return FEATURE_BASE[name] ?? name.replace(/_/g, ' ');
}

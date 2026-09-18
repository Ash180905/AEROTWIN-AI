/**
 * The 3D twin, driven by live backend telemetry.
 *
 * The scene itself is unchanged — it was already a faithful kinematic model of
 * a turbocharged boxer four. What changed is where its numbers come from: the
 * pistons, propeller, turbo impeller, thermal shading and vibration jitter now
 * follow the frame on the socket instead of a browser-side mock.
 */

import { useMemo, useState } from 'react';

import { LiveEngine3DView } from '../engine3d/LiveEngine3DView';
import { toDiagnosis, toHealth, toPhysics, toPreset, toTelemetry } from '../lib/adapt3d';
import { useTwinStore } from '../store/twinStore';
import { Empty } from './ui';

const PART_LABELS: Record<string, string> = {
  piston: 'Piston assembly',
  crankshaft: 'Crankshaft',
  cylinder: 'Cylinder head',
  turbo: 'Turbocharger',
  propeller: 'Propeller',
  exhaust: 'Exhaust header',
};

export function Engine3DView() {
  const frame = useTwinStore((s) => s.frame);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const props = useMemo(() => {
    if (!frame) return null;
    return {
      telemetry: toTelemetry(frame),
      physics: toPhysics(frame),
      health: toHealth(frame),
      diagnosis: toDiagnosis(frame),
      activePreset: toPreset(frame),
    };
  }, [frame]);

  if (!props) {
    return <Empty>Waiting for telemetry. Start a mission to drive the 3D twin.</Empty>;
  }

  return (
    <div className="space-y-4">
      <LiveEngine3DView {...props} onSelectComponent={setSelectedPart} />

      {selectedPart && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Selected component
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {PART_LABELS[selectedPart] ?? selectedPart}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Animation for this part is driven by live telemetry: crank angle from RPM,
            thermal shading from measured CHT and EGT, and structural jitter from the
            vibration channel.
          </p>
        </div>
      )}
    </div>
  );
}

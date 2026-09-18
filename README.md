# AeroTwin — Operator Dashboard

**SIH 2026 · Problem Statement 26054 · DRDO**
Ground control station interface for the MALE UAV aero piston engine digital twin.

The backend — twin core, models and API — lives in
[`digitwin-be`](https://github.com/bharani-coder-27/digitwin-be).

---

## What this is

A dashboard for UAV operators, propulsion engineers and maintenance crews. It shows what
the engine is doing, what a healthy engine *would* be doing at the same operating point,
and what four trained models make of the difference.

**Nothing on this page is computed in the browser.** Every number — residuals, subsystem
health, fault classification, remaining useful life, counterfactual projections — arrives
over a WebSocket from the ground station, which derives it from physics residuals and ONNX
inference. The frame carries `ai.inference_ms` and `ai.source`, shown in the footer, so
you can see the assessment was computed and where.

This matters because the previous version of this app faked its intelligence in 491 lines
of TypeScript. That file is gone.

## Views

| Tab | What it shows |
|---|---|
| **Live cockpit** | Telemetry with physics expectation beside it, AI assessment, subsystem health, residual table, latching alerts |
| **3D twin** | Three.js kinematic model — pistons, crank, turbo impeller, propeller, thermal shading and vibration jitter all driven by live telemetry |
| **Trends** | Health trajectory, anomaly score against its limit, residual drift, RUL over the sortie |
| **Diagnosis & advisory** | Engine-vs-instrument evidence, counterfactual options, maintenance actions, feature attribution |
| **Mission replay** | Recorded sorties, timeline scrubber, post-flight health report |
| **Fleet** | Squadron readiness and the digital engine passport |
| **Evidence** | Loaded models with their metrics, the NASA C-MAPSS benchmark, and what the system has *not* demonstrated |

### The view worth demonstrating

**Diagnosis & advisory**, with a sensor drift injected. A thermocouple failing 145 °C high
trips any threshold system and aborts a sortie on a serviceable aircraft. This dashboard
shows the corroboration evidence — coolant, oil and vibration all flat while one head
reads hot — calls it instrumentation, keeps the alert at *advisory*, and recommends
continuing the mission. Recovery stays on the panel as a command decision, explicitly not
advised by the engine evidence.

## Running it

The backend must be running first — see its README. Then:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The dev server proxies `/api` to `http://127.0.0.1:8000`, so the browser stays on one
origin: no CORS preflight, and the WebSocket upgrade travels the same path as the REST
calls. Point `VITE_BACKEND_URL` elsewhere to drive a remote ground station.

```bash
npm run build       # typecheck + production build
npm run typecheck   # types only
```

## How it is wired

```
  WebSocket /api/ws/telemetry ──▶ TelemetrySocket ──▶ twinStore (zustand) ──▶ every panel
  REST /api/...               ──▶ api client      ──▶ panels that pull on demand
```

```
src/
  api/        contract types, REST client, reconnecting socket
  store/      live frame + bounded history ring buffer
  components/ the panels
  engine3d/   the Three.js scene, with its own prop vocabulary
  lib/        formatting, and the one adapter between wire format and 3D scene
```

Two decisions worth knowing:

**The store is bounded.** A 20-hour sortie at 1 Hz would otherwise grow without limit in a
tab meant to stay open for a whole mission. Charts render a few hundred points; the full
record lives in the backend's mission store, where replay reaches it.

**The 3D scene keeps its own types.** It speaks per-cylinder arrays and preset names; the
backend speaks residuals and fault classes. `lib/adapt3d.ts` is the only place the two
meet, so a schema change does not ripple through a thousand lines of scene graph.

## Contract

Types in `src/api/types.ts` mirror the backend's Pydantic schemas. To regenerate from the
published schema instead:

```bash
npx openapi-typescript ../digitwin-be/openapi.json -o src/api/generated.ts
```

If the two ever disagree, the backend schema wins.

## License

Developed for Smart India Hackathon 2026 (PS 26054). MIT.

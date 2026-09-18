# AeroTwin Dashboard — Operator Guide

Every tab, every control, every term, with worked examples from real captured frames.

Written for the team to learn the system and to answer questions about it under scrutiny.

---

## The tabs

| # | Tab | What it answers | Doc |
|---|---|---|---|
| 1 | **Live cockpit** | What is the engine doing right now, and what should it be doing? | [01-live-cockpit.md](01-live-cockpit.md) |
| 2 | **3D twin** | What does the fault look like physically? | [02-3d-twin.md](02-3d-twin.md) |
| 3 | **Trends** | How is it changing over the sortie? | [03-trends.md](03-trends.md) |
| 4 | **Diagnosis & advisory** | Engine or instrument, and what should we do? | [04-diagnosis-advisory.md](04-diagnosis-advisory.md) |
| 5 | **Mission replay** | What happened on that flight? | [05-mission-replay.md](05-mission-replay.md) |
| 6 | **Fleet** | Which aircraft can fly, and what is due? | [06-fleet.md](06-fleet.md) |
| 7 | **Evidence** | How do we know any of this works? | [07-evidence.md](07-evidence.md) |

System design, model algorithms and validation methodology:
[ARCHITECTURE.md](https://github.com/bharani-coder-27/digitwin-be/blob/main/docs/ARCHITECTURE.md)
in the backend repository.

---

## The one idea everything rests on

```
residual = actual_sensor − physics_expected
```

Every model consumes **residuals**, never raw sensor values.

A cylinder head temperature of 205 °C is nominal at 98 % throttle on a hot day and alarming
at 45 % throttle at FL210. A fixed redline cannot tell those apart. A residual can, because
the physics model knows what 205 °C *should* be at that exact operating point.

If you remember one sentence from these documents, make it that one.

---

## Vocabulary

| Term | Meaning |
|---|---|
| **CHT** | Cylinder Head Temperature — four probes, one per cylinder |
| **EGT** | Exhaust Gas Temperature — four probes |
| **EGT spread** | Hottest minus coldest exhaust. A healthy four-cylinder engine holds this within ~25 °C |
| **MAP** | Manifold Absolute Pressure, inHg — how much air the turbo is forcing in |
| **ISA** | International Standard Atmosphere — 15 °C at sea level, −1.98 °C per 1,000 ft |
| **Day offset** | Deviation from ISA. +22 °C is a hot desert day |
| **Critical altitude** | 15,000 ft — above it the wastegate is fully open and boost decays with air density |
| **Residual** | actual − physics-expected |
| **RUL** | Remaining Useful Life, in hours to the failure boundary |
| **Right-censored** | A training label that only says "at least this long" — why RUL is blank on a healthy engine |
| **p10 / p90** | Quantile bounds. 80 % of outcomes should fall between them |
| **TBO** | Time Between Overhauls — 1,200 h for this engine class |
| **Life-limited** | Replaced on a schedule regardless of condition, because the failure mode is fatigue |
| **Warmup** | The first 5 minutes, while the trailing feature window fills |
| **Edge tier** | Models small enough to run onboard — under 1 MB |
| **GCS** | Ground Control Station |

---

## The six fault modes

| Mode | Mechanism | Signature |
|---|---|---|
| `BEARING_LUBRICATION` | Journal clearance opens, oil film thins | Oil P ↓, vibration ↑, oil T ↑ |
| `INJECTOR_MISFIRE` | One cylinder runs lean | That cylinder's EGT ↑, fuel flow ↓ |
| `COOLING_LEAK` | Coolant lost, heat rejection collapses | Coolant ↑, **all four** CHT ↑ |
| `SENSOR_DRIFT` | Transducer bias — **engine healthy** | One channel moves, coupled channels flat |
| `COMBUSTION_INSTABILITY` | Cycle-to-cycle scatter | EGT spread grows, no dominant cylinder |
| `NORMAL` | — | — |

---

## The demo path

1. **Live cockpit** → `hot_weather` → **Start**. Point at a 212 °C cylinder head with no
   alarm, because 209 °C was expected.
2. Inject **Cooling**. Watch the classifier name it while overall health is still ~95 %.
3. **Trends** → the anomaly score is 27× over its limit while the health chart is still
   high. *That gap is the lead time.*
4. **3D twin** → thermal mode, Top camera. The whole block goes red together.
5. **Clear**, then inject **Sensor drift**. **Diagnosis** tab: one head hot, everything else
   flat, verdict instrumentation, advisory only, **continue the mission**. ← the money
   moment
6. **Cut downlink** → the twin keeps assessing; frames backfill on restore.
7. **Evidence** → C-MAPSS beating published deep-learning baselines, and a plain statement
   of what is still unproven.

---

## The three hardest questions, and the answers

**"Is this just a threshold system with extra steps?"**
No — and the proof is a case where a threshold system would have fired and this one
correctly does not. Live cockpit, hot weather, 212 °C CHT, no alarm, because the physics
model expected 209 °C at that throttle, altitude and outside air temperature.

**"What happens when a sensor fails?"**
Diagnosis tab. A thermocouple reading 145 °C high aborts a sortie on any threshold system.
This one checks whether the exhaust, coolant, oil and vibration agree, finds they do not,
calls it instrumentation, keeps the alert at advisory and recommends continuing. A false
abort costs a mission.

**"Your models are trained on simulated data — why should I believe them?"**
For the piston-specific claims, you shouldn't take them on faith, and the Evidence tab says
so. What is defensible is the method: benchmarked on NASA C-MAPSS, which we did not build,
at 12.37 RMSE against published results of 18.45, 16.14 and 12.61. The gap that remains is
NGAFID validation of the physics baseline, and we state it rather than hiding it.

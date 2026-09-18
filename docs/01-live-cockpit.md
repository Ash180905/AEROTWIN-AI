# Tab 1 — Live Cockpit

The default view. Everything an operator needs while the aircraft is flying: what the
engine is doing, what a healthy engine *would* be doing at the same operating point, and
what the models make of the difference.

Nothing on this screen is computed in the browser. Every number arrives over a WebSocket
from the ground station.

---

## Screen layout

```
┌──────────────────────────────────────────────────────────────┐
│  1. MISSION CONTROL BAR      scenario · transport · inject   │
├──────────────────────────────────────────────────────────────┤
│  2. ENGINE TELEMETRY         12 tiles: actual / exp / resid  │
├───────────────────────────────────────┬──────────────────────┤
│  3. AI ASSESSMENT                     │ 4. SUBSYSTEM HEALTH  │
│     classification · anomaly · RUL    │    6 indices         │
├───────────────────────────────────────┼──────────────────────┤
│  5. PHYSICS RESIDUALS                 │ 6. ACTIVE ALERTS     │
└───────────────────────────────────────┴──────────────────────┘
```

---

## 1. Mission control bar

### Scenario selector

Picks the flight profile. Each is a preset from problem statement section E — the
environmental and mission conditions the system is required to simulate.

| Scenario | Duration | Cruise altitude | Day offset | What it demonstrates |
|---|---|---|---|---|
| `standard_isr` | 8 h | 18,500 ft | ISA | Baseline sortie: climb, long loiter, descent |
| `high_altitude` | 8 h | 24,000 ft | ISA | Above the turbocharger's 15,000 ft critical altitude — boost decays, cooling airflow thins |
| `endurance` | 20 h | 17,000 ft | ISA | Degradation developing across a full-length mission |
| `hot_weather` | 8 h | 16,000 ft | **ISA +22 °C** | Desert operation; thermal margins collapse first |
| `rapid_transitions` | 6 h | 18,000 ft | ISA +8 °C | 12 large throttle excursions instead of 4 — the transient case where fixed thresholds produce the most false alarms |

**"Day offset"** means deviation from the International Standard Atmosphere. ISA says
15 °C at sea level, falling 1.98 °C per 1,000 ft. A +22 °C offset is a hot desert day at
every altitude.

> **Why this matters:** selecting `hot_weather` sends *only* the scenario name. The backend
> fills in the envelope from the preset. An earlier version sent default values for
> altitude and day offset alongside, which silently overrode the preset and flew a standard
> day while the label said hot weather.

### Transport controls

| Control | Effect |
|---|---|
| **Start** | Begins a new sortie. Any running mission is closed out and recorded first. |
| **Pause / Resume** | Freezes sortie time. The twin stops stepping; the socket stays open. |
| **Stop** | Ends the mission and writes it to history. The twin is released — fault injection and advisory calls will be rejected afterwards, because there is no engine to inject into. |

### Status readout (right side)

```
M-20260918-143237  |  1:23:45 / 8:00:00  |  60×
└─ flight ID          └─ sortie clock       └─ time scale
```

- **Flight ID** — `M-<date>-<time>`, assigned at start. This is the key that mission replay
  and post-flight reports use.
- **Sortie clock** — simulated time elapsed / total. *Not* wall-clock time.
- **Time scale** — simulated seconds per real second. At 60×, a 12-hour endurance mission
  plays through in 12 minutes.

> **Important:** time compression takes *more small steps*, never bigger ones. The models'
> trend features were fitted on 5-second sample spacing, so a 60-second jump would change
> what a "slope" means and feed every model a distribution it never saw. At 60× the backend
> runs 12 engine steps per published frame.

### Cut downlink

Simulates losing the radio link to the aircraft.

Frames stop reaching the dashboard, but the twin **keeps running and keeps assessing**.
Frames produced during the outage are buffered and backfilled when the link is restored, so
mission history has no hole in it. An amber banner appears across the top while the link
is down.

This is the demonstration that inference genuinely runs onboard rather than on the ground.
The onboard edge node carries 994 KB of models — the anomaly detector, the fault classifier
and the sensor discriminator — and needs no ground contact to use them.

### Fault injection

Five buttons, one per fault mode the system is required to detect (PS section C). Each
drives a real physical degradation mechanism in the engine model, not a label.

| Button | Fault mode | Physical mechanism | What you will see |
|---|---|---|---|
| **Bearing** | `BEARING_LUBRICATION` | Journal clearance opens, oil film thins, leakage rises, friction heats | Oil pressure ↓ up to 1.75 bar, vibration ↑ up to 3.3 mm/s, oil temp ↑ 24 °C |
| **Injector** | `INJECTOR_MISFIRE` | One cylinder's injector clogs and runs lean | That cylinder's EGT ↑ 135 °C, its CHT ↑ 22 °C, total fuel flow ↓ 1.9 L/h |
| **Cooling** | `COOLING_LEAK` | Coolant charge lost, heat rejection collapses | Coolant ↑ 46 °C, **all four** CHTs ↑ 40 °C, oil temp ↑ 14 °C |
| **Sensor drift** | `SENSOR_DRIFT` | A transducer develops a bias. **The engine is healthy.** | One channel moves up to 145–190 °C; every physically coupled channel stays flat |
| **Combustion** | `COMBUSTION_INSTABILITY` | Cycle-to-cycle combustion scatter | EGT spread grows with no single dominant cylinder, vibration ↑ 0.85 |

**Clear** removes the fault and resets severity to zero. The engine returns to healthy
behaviour immediately; the models take a few frames to follow, because their features
average over a trailing five minutes.

### Severity rate (slider, 0.5× – 8×)

How fast the degradation develops.

- **1.0×** reaches the failure boundary in roughly the remaining sortie.
- **4–8×** compresses a full progression into a short demonstration.
- **0.5×** shows a slow-developing fault where the early-warning behaviour is clearest.

Severity itself runs 0 → 1 and is slightly super-linear: `progress = (elapsed × rate)^1.25`.
Degradation accelerates once it starts, which is how real wear behaves.

The bar underneath shows `injected COOLING_LEAK · severity 47%` once a fault is armed.

---

## 2. Engine telemetry

Twelve tiles. Each shows the **actual** measured value large, with **expected** and
**residual** underneath.

The phase chip (top right) reads `climb`, `cruise`, `descent` or `ground`.

| Tile | Unit | Typical cruise | Sub-line meaning |
|---|---|---|---|
| **RPM** | rpm | 4,400–4,700 | expected RPM, then residual |
| **Throttle** | % | 78 | manifold pressure in inHg |
| **Altitude** | ft | per scenario | outside air temperature |
| **CHT max** | °C | 180–210 | hottest of four cylinder heads vs expected |
| **EGT max** | °C | 690–730 | hottest exhaust, plus **EGT spread** residual |
| **Oil pressure** | bar | 4.2–4.8 | expected, then residual |
| **Oil temp** | °C | 85–95 | residual vs expected |
| **Coolant** | °C | 80–90 | residual vs expected |
| **Fuel flow** | L/h | 24–29 | residual vs expected |
| **Vibration** | mm/s | 1.9–2.2 | broadband RMS, residual vs expected |
| **Bus** | V / A | 13.9 V, ~23 A | alternator and battery health |
| **Per-cylinder CHT** | °C | four numbers | individual heads — divergence is the misfire signature |

### Terms you need

- **CHT** — Cylinder Head Temperature. Four probes, one per cylinder.
- **EGT** — Exhaust Gas Temperature. Four probes.
- **EGT spread** — hottest minus coldest exhaust. A healthy four-cylinder engine holds this
  within about 25 °C. A single cylinder diverging is the classic misfire signature, which
  is why the spread has its own residual.
- **MAP** — Manifold Absolute Pressure, in inches of mercury. How much air the turbocharger
  is pushing into the engine. Sea-level maximum is 38.5 inHg.
- **Residual** — `actual − expected`. The central idea of the whole system.

### When a tile turns red

| Tile | Turns red when |
|---|---|
| CHT max | residual > +20 °C |
| EGT max | EGT spread residual > +40 °C |
| Oil pressure | residual < −0.5 bar |
| Coolant | residual > +15 °C |
| Vibration | residual > +1.0 mm/s |

These are display thresholds on the *residual*, not on the raw value — which is the point.

---

## 3. AI assessment

Header reads `GCS inference · 0.41 ms this frame`.

- **GCS** = computed on the ground station (full model set).
- **EDGE** = computed onboard (lightweight tier, no RUL).
- **inference_ms** is the real measured cost of that frame's inference. It is on screen so
  the assessment is visibly computed rather than asserted.

### Warming up

For the first five minutes of simulated sortie time, an amber chip and banner appear.

The trend features average over a trailing 5-minute window (60 samples at 5-second
spacing). Until that window fills, it is padded with the first sample, so windowed model
outputs exist but are not trustworthy. They are shown and labelled rather than hidden,
and no model-driven alerts are raised during warmup — greeting every startup with alarms is
how an alert panel loses its credibility.

### Classification (left box)

The six-class fault classifier's verdict, with confidence.

- Green `Nominal` = `NORMAL`
- Red = one of the five fault modes
- A blue box appears if the deviation is judged to be **instrumentation**

**Confidence** is the classifier's probability for the winning class. The model scores
98.7 % accuracy and 0.986 macro-F1 on held-out sorties.

### Anomaly detector (right box)

A separate model that asks a different question: *is anything unlike a healthy engine?*

- **Error** — reconstruction error from an autoencoder trained **only on healthy flights**.
- **Limit** — 1.467. This is the 99.5th percentile of the healthy error distribution, set
  from data, not from an engine redline. It gives a measured 0.55 % false-positive rate.
- The bar fills as error approaches the limit.

Why have both a classifier and an anomaly detector? The classifier can only name the five
modes in its label set. The autoencoder fires on fault modes nobody labelled. On a 12-hour
sortie an unnamed warning beats silence. Measured median lead time over a threshold system:
**5.6 hours**.

### Remaining useful life

Two possible displays.

**Healthy engine:**
> No degradation trend detected. RUL is right-censored beyond 100 h — a point estimate here
> would be invented precision.

This is deliberate. During training, healthy samples are right-censored at a 100-hour
horizon, so the regressor returns an arbitrary value inside the censored region — 34 hours
on a perfectly healthy engine in measured runs. Publishing that would teach operators to
ignore the field.

**Degrading engine:**
```
3.7 h
p10–p90  1.6 h – 1.7 h
```

Reported as an interval because a single number implies a precision the model does not
have. p10/p90 are separate quantile models: 10 % of outcomes should fall below p10, 10 %
above p90, so 80 % should land inside.

> **Known quirk:** the three models are fitted independently, so the median can occasionally
> sit outside the p10–p90 band (as above). Nothing constrains them to agree. Treat the
> interval as the model's uncertainty and the median as its best single guess; when they
> disagree this much, the models are telling you the estimate is unstable.

---

## 4. Subsystem health

Six indices, 0–100, computed deterministically from residuals. These map onto the engine
subsystems the problem statement names (section B).

| Subsystem | Driven by | Weight in overall |
|---|---|---|
| **Combustion** | EGT deviation, EGT spread | 22 % |
| **Lubrication** | Oil pressure deficit, oil over-temperature | 25 % |
| **Cooling** | CHT excess, coolant above 88 °C | 18 % |
| **Fuel system** | Fuel flow deviation | 12 % |
| **Mechanical** | Vibration excess | 18 % |
| **Electrical** | Bus voltage deviation from 13.9 V | 5 % |

Lubrication carries the heaviest weight because losing oil film is the fastest path to
losing the engine.

**Colour bands:** green ≥ 70, yellow 50–70, amber 30–50, red < 30.

---

## 5. Physics residuals

The same nine residual channels as a table, each with a deviation bar.

This panel is the answer to *"how is this different from a threshold system?"*

A cylinder head temperature of 205 °C is **nominal** at 98 % throttle on a hot day and
**alarming** at 45 % throttle at FL210. A fixed redline cannot tell those apart. A residual
can, because the physics model knows what 205 °C *should* be at this exact operating point.

The bar scales magnitude against 40 °C for temperatures and 2 units for everything else,
turning red past half scale.

### Where "expected" comes from

A thermodynamic model of a Rotax 915 iS class engine — 141 hp turbocharged four-cylinder
boxer, the class flown on TAPAS BH-201:

- **ISA atmosphere** — density ratio σ = (1 − 6.87535e-6·h)^4.2561
- **Turbocharged MAP** — the wastegate holds sea-level manifold pressure up to a 15,000 ft
  critical altitude, above which available boost decays with density
- **Thermal coupling** — CHT, EGT, coolant and oil scale with charge mass and are cooled by
  ram air, so cooling airflow falls with altitude
- **Oil pressure** — rises with pump speed, falls as viscosity drops with temperature

---

## 6. Active alerts

Alerts **latch**: a condition keeps its original start time until it recovers, rather than
flickering as a residual crosses its limit. Trip and clear thresholds differ so a borderline
value cannot oscillate.

| Code | Raised when | Severity |
|---|---|---|
| `HEALTH_<SUBSYSTEM>` | Index below 70 / 50 / 30 | caution / warning / critical |
| `FAULT` | Classifier names a fault mode | warning above 80 % confidence, else caution |
| `SENSOR_FAULT` | Deviation judged to be instrumentation | **advisory only** |
| `ANOMALY_UNCLASSIFIED` | Anomaly detector fires 3 frames running with no named fault | caution |
| `RUL` | Remaining life below 6 h / 2 h | warning / critical |

Health alerts clear at 75 / 55 / 35 — five points above where they tripped. That gap is the
hysteresis.

`ANOMALY_UNCLASSIFIED` needs **three consecutive** anomalous frames. The detector's measured
false-positive rate is 0.21–0.24 % of frames, arriving as isolated single-frame spikes. The
persistence requirement costs 15 seconds of latency against a 5.6-hour lead time, and buys
an alert that means something.

`SENSOR_FAULT` is deliberately **advisory**, never warning. Escalating it is how a threshold
system talks a crew into aborting a serviceable aircraft.

---

## Worked example A — healthy engine

Real frame, hot-weather scenario, 13 minutes into the sortie, climbing through 6,372 ft.

```
Throttle  94.5 %      Altitude 6,372 ft     OAT 24.4 °C
RPM       5,017       expected 5,013        residual +4
CHT       205.2 / 212.5 / 206.3 / 211.5     expected 209.1   residual +3.4
Coolant   89.3 °C     expected 89.1 °C      residual +0.2
Oil P     4.50 bar    expected 4.51 bar     residual −0.01
```

**Read it:** OAT is 24.4 °C at 6,372 ft. ISA would give about 2.4 °C there — this is the
+22 °C hot-weather offset. CHT of 212 °C sounds high, and on a cool day at low power it
would be. At 94.5 % throttle in a climb on a desert day, the physics model expects 209 °C.
The residual is +3.4 °C. **Nothing is wrong.**

```
Health    combustion 88.8 · lubrication 99.5 · cooling 96.1
          fuel 99.8 · mechanical 100 · electrical 99.8 · overall 96.7

AI        NORMAL, 99.6 % confidence
          anomaly 0.139 against 1.467 limit — no
          RUL: censored, no degradation trend
          0.35 ms

Alerts    none
```

One number worth noticing: `sensor_fault_prob` on this healthy frame is **0.999**. The
discriminator returns near-certainty that any deviation is instrumentation — because on a
healthy engine there is no deviation to explain and the question is meaningless. This is
why the verdict is gated on the classifier first.

## Worked example B — cooling leak developing

Same sortie, 35 minutes in, cooling leak injected at 4× severity.

```
CHT       205.9 / 215.4 / 211.7 / 208.9    expected 204.5   residual +10.9
Coolant   93.5 °C                           expected 85.8    residual +7.7
Oil temp  93.2 °C                           expected 90.5    residual +2.7
Vibration                                                    residual −0.04
```

**Read it:** all four cylinder heads are up together, coolant is up, oil temperature is
dragged up because the oil cooler is saturating, and vibration is unchanged. That pattern —
whole-block thermal rise with no mechanical signature — is a heat rejection problem, not a
bearing or combustion problem.

```
Health    cooling 82.1 (falling)  ·  overall 95.1

AI        COOLING_LEAK, 99.9 % confidence
          anomaly 39.1 against 1.467 limit — YES, 27× over
          sensor_fault_prob 0.207 → NOT instrumentation
          RUL 3.7 h (p10–p90 1.6–1.7 h)
          0.41 ms

Alerts    FAULT   warning   Cooling system degradation — heat rejection
                            falling across the block (100 %)
          RUL     warning   Remaining useful life 3.7 h
```

Note what has **not** happened yet: overall health is still 95.1 and cooling is 82.1, both
well above the 70 % caution trip. A threshold system watching health would still be silent.
The anomaly detector is already 27× over its limit and the classifier has named the mode.
**That gap is the lead time.**

---

## Questions a judge is likely to ask

**"Is this just a threshold system with extra steps?"**
No. Point at the residual panel. A threshold compares a reading to a fixed number; this
compares it to what the thermodynamic model says that reading should be at this throttle,
altitude and outside air temperature. Worked example A is the proof: 212 °C CHT, no alarm,
because 209 °C was expected.

**"How do you know the models work?"**
`/health` reports every loaded model with its measured metrics, computed on sorties held out
at flight level. The Evidence tab shows them, along with the NASA C-MAPSS benchmark and a
plain statement of what has *not* been demonstrated.

**"What if a sensor fails?"**
Inject sensor drift and go to the Diagnosis tab. That is the answer, and it is the strongest
thing this system does.

**"Why is RUL blank?"**
Because the engine is healthy and the training label is right-censored there. Showing a
number would be inventing precision.

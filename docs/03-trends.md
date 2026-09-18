# Tab 3 — Trends

Four charts covering the sortie so far. This is where degradation becomes visible as a
*trajectory* rather than a single reading — which is the difference between predicting a
failure and reporting one.

---

## Where the data comes from

The browser's own history buffer: every frame this dashboard has received on the socket
since the current flight started.

Two consequences worth understanding.

**A downlink outage leaves a real gap.** If you cut the downlink, no frames arrive, and the
lines show it. The gap is not interpolated away. A chart that hides a telemetry outage is
lying about the mission.

**History resets when a new sortie starts.** Frames from a previous flight would draw a
discontinuity straight through every chart, so the buffer clears on a new flight ID.

The buffer holds the most recent **900 frames**. A 20-hour sortie would otherwise grow
without limit in a tab meant to stay open for a whole mission. The complete record lives in
the backend's mission store, and the **Mission replay** tab reaches it.

The x-axis on every chart is **sortie time in hours** — simulated time, not wall clock.

---

## Chart 1 — Subsystem health trajectory

Five lines plus a reference line.

| Line | Colour | What it is |
|---|---|---|
| **Overall** | black, thick | The weighted index — the headline number |
| Cooling | blue | Heat rejection capacity |
| Lubrication | purple | Oil film condition |
| Combustion | orange | Burn quality |
| Mechanical | green | Bearings and rotating assembly |

The **amber dashed line at 70** is the caution trip point. A subsystem crossing below it
raises a `HEALTH_<SUBSYSTEM>` caution alert on the cockpit tab.

Y-axis is fixed 0–100 so the scale never rescales under you mid-mission — a chart that
re-zooms makes a fall look flat.

### How to read it

- **All lines flat and high** — healthy engine.
- **One line peeling away from the others** — a specific subsystem degrading. Which line
  peels tells you the fault family before the classifier names it.
- **Overall falling more slowly than the peeling line** — expected. Overall is a weighted
  average, so a single subsystem collapsing drags it down only by that subsystem's weight
  (cooling is 18 %, lubrication 25 %).

That last point is important for the demo: you will routinely see cooling at 82 while
overall is still 95. **Overall health is a poor early-warning indicator by construction.**
That is exactly why the anomaly detector exists.

---

## Chart 2 — Anomaly score against its limit

| Line | Meaning |
|---|---|
| Red solid | Reconstruction error from the autoencoder |
| Grey dashed | The alarm limit, 1.467 |

### What the number is

The autoencoder was trained **only on healthy sorties**. It compresses the 17-dimensional
residual vector to 3 dimensions and reconstructs it. When the engine looks like the healthy
flights it learned from, it reconstructs well and the error is small. When the engine looks
unfamiliar, reconstruction fails and the error climbs.

So the score answers *"how unlike a healthy engine is this?"* — not *"how far past a
redline?"*

### Why the limit is 1.467

It is the **99.5th percentile of the healthy validation error distribution**. Set from data,
not from engineering judgement about redlines. That gives a measured 0.55 % false-positive
rate.

### What a healthy trace looks like

Hovering around 0.1–0.4, well under the line, with occasional single-frame spikes. Those
spikes are the 0.2 % false-positive rate arriving — which is why the `ANOMALY_UNCLASSIFIED`
alert requires **three consecutive** anomalous frames before it fires.

### What a fault looks like

The score does not creep to the limit and sit there. It goes **far** past it. On a developing
cooling leak the score reaches 39 against a 1.467 limit — **27× over**. The scale is
logarithmic in effect, so once a fault develops the line leaves the top of the chart.

**This chart is the lead-time argument.** The score crosses its limit while subsystem health
is still in the nineties. Measured median lead time over a threshold system: **5.6 hours**.

---

## Chart 3 — Physics residuals

Four residual channels against a zero reference line.

| Line | Colour | Channel |
|---|---|---|
| CHT residual | orange | Hottest head minus expected |
| Coolant residual | blue | Coolant minus expected |
| Vibration residual | green | Vibration minus expected |
| Oil pressure residual | purple | Oil pressure minus expected |

The **grey line at zero** is where a perfectly healthy engine sits.

### How to read it

On a healthy engine all four hover around zero with sensor noise. They do **not** drift with
throttle or altitude — that is the whole point of the physics baseline. If you change
throttle by 20 % and a residual stays flat, the model is correctly accounting for the
operating point change.

Each fault mode has a distinct fingerprint here:

| Fault | Residual signature |
|---|---|
| Cooling leak | Coolant and CHT rise together; vibration and oil pressure stay flat |
| Bearing lubrication | Oil pressure goes **negative**, vibration rises; thermal channels move mildly |
| Injector misfire | CHT rises modestly; the big movement is EGT spread (shown on the cockpit tab) |
| Sensor drift | **One** residual moves; every other line stays flat |

That last row is the one to point at. A sensor fault produces a single moving line with no
companions. A real fault always brings friends, because the physics couples them.

---

## Chart 4 — Remaining useful life

Only drawn when there is degradation to extrapolate.

**Healthy engine** shows a message instead of a chart:

> The engine shows no degradation trend, so a point estimate of remaining life would be
> invented precision.

This is deliberate, not a missing feature. During training, healthy samples are
right-censored at a 100-hour horizon; the regressor returns an arbitrary value inside that
region — 34 hours on a perfectly healthy engine in measured runs. Charting that would teach
operators to ignore the panel.

**Degrading engine** shows RUL in hours, with a **red dashed line at 2 hours** — the
critical threshold that raises a `RUL` critical alert.

### How to read the shape

- **Falling steadily** — degradation progressing at a constant rate.
- **Falling then flattening** — the fault has stopped developing, or the model has hit the
  bottom of its useful range.
- **Jumping around** — the model is uncertain. RUL is regressed from a five-minute trailing
  window, so it reacts to trend changes with a lag and can be noisy early in a fault.

---

## Known limitation

The RUL chart plots the **median** estimate only, not the p10–p90 band. The interval is
shown numerically on the cockpit tab. Because the three quantile models are fitted
independently, the median can occasionally sit outside its own band — when that happens,
treat the estimate as unstable rather than precise.

---

## If the tab says "Collecting telemetry"

Trends need at least two frames. Start a mission and give it a few seconds.

---

## Questions a judge is likely to ask

**"How is this predictive rather than reactive?"**
Chart 2. The anomaly score crosses its limit while Chart 1 still shows health in the
nineties. A threshold system watching health indices would be silent at that moment.

**"How do I know the residuals aren't just tracking throttle?"**
Change the throttle mid-flight and watch Chart 3. The residuals stay near zero because the
physics baseline moves with the operating point. That is the difference between a residual
and a raw reading.

**"Why is the anomaly score so large — 39 against a limit of 1.4?"**
Reconstruction error is a squared quantity in a standardised space. Once the engine leaves
the healthy manifold the error grows fast. The magnitude is not calibrated as a probability;
only the crossing matters.

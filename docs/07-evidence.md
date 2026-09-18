# Tab 7 — Evidence

Which models are running, how well they scored, what was validated against outside data, and
what this system has **not** demonstrated.

All of it is served by the backend itself. A panel asking how this was validated gets the
same answer from the software as from the team — which is the point of putting it on screen
rather than in a slide deck.

---

## Panel 1 — Loaded models

### Summary tiles

| Tile | Meaning |
|---|---|
| **Models loaded** | How many are in memory right now |
| **Total payload** | Combined size of all model artifacts, ~8.9 MB |
| **Edge tier** | What an onboard computer carries, ~0.97 MB |
| **Version** | Backend service version |

The **edge tier** number is the one to point at. It is the answer to the problem statement's
*"lightweight onboard analytics"*: under 1 MB of model runs on the aircraft and keeps
detecting faults with no ground link at all.

### The model table

| Model | Tier | Size | What it does |
|---|---|---|---|
| `autoencoder` | edge | 7.7 KB | Detects anomalies, including modes nobody labelled |
| `fault_classifier` | edge | 986 KB | Names which of six fault modes |
| `sensor_discriminator` | edge | 0.9 KB | Engine fault versus instrumentation fault |
| `rul_regressor` | gcs | 259 KB | Median remaining useful life |
| `rul_p10` | gcs | 3.9 MB | Lower bound of the prediction interval |
| `rul_p90` | gcs | 3.8 MB | Upper bound |

**Tier** is the architecture argument made concrete:

- **edge** — small enough to run on a companion computer onboard the UAV
- **gcs** — stays on the ground station

Cut the downlink and the aircraft keeps the first three. It loses prognostics (RUL), not
detection. That split is why the 7.7 MB quantile pair lives on the ground.

### Headline metrics column

Each row shows the model's own measured numbers, read from the committed reports:

- **autoencoder** — ROC-AUC on developed faults, median lead time in hours, false-positive
  rate, parameter count
- **fault_classifier** — accuracy, macro-F1
- **rul_regressor** — MAE in the imminent regime, RMSE while degrading, interval coverage
- **sensor_discriminator** — ROC-AUC, accuracy

Full reports are available per model at `GET /models/{name}/metrics`.

### Key numbers worth memorising

| Model | Metric | Value |
|---|---|---|
| Autoencoder | ROC-AUC (developed faults) | **0.993** |
| Autoencoder | **Median lead time** | **5.6 hours** |
| Autoencoder | False-positive rate | 0.55 % |
| Autoencoder | Parameters | **644** |
| Classifier | Accuracy | **98.7 %** |
| Classifier | Macro-F1 | 0.986 |
| Discriminator | ROC-AUC | **0.9997** |
| RUL | MAE (imminent regime) | **0.88 h** |

**"Macro-F1"** averages F1 across all six classes equally, so a rare class that the model
handles badly cannot be hidden by a common class it handles well. It is the harder number
and the honest one to quote.

**"Median lead time"** is how far ahead of a threshold-based system the anomaly detector
fires, measured across the test sorties. It is the single most important number on this
page.

---

## Panel 2 — External benchmark: NASA C-MAPSS

**This is the strongest evidence in the project**, because it is the only result measured on
data this team did not construct.

### Why it exists

Every piston model here is trained and tested on our own physics simulator. Those metrics
are internally honest — splits are made at flight level, never at row level — but they
cannot establish that the *approach* is sound, because the approach and the data came from
the same place.

C-MAPSS is the standard public run-to-failure benchmark with a decade of published scores to
compare against.

### What transfers and what does not

C-MAPSS is a **turbofan**, not a piston engine. None of our physics applies and none of our
piston models transfer. What transfers is the **method**:

```
rolling window statistics (mean / std / slope over a trailing window)
    → log1p(RUL) target with a censoring horizon
    → gradient-boosted trees
    → quantile models for a prediction interval
```

If that method is competitive on a benchmark we did not build, the approach is defensible
independently of our simulator.

### The protocol

Standard C-MAPSS evaluation, followed exactly: train on the training units, predict at the
**last cycle** of each test unit, score against the supplied `RUL_FDxxx.txt`. Nothing about
the test set touches training. RUL capped at 125 cycles, as is conventional in the
literature.

### Results

| Subset | Test RMSE (cycles) | MAE | p10–p90 coverage | Test units |
|---|---|---|---|---|
| **FD001** | **12.37** | 9.42 | **0.800** | 100 |
| FD002 | 20.22 | — | 0.811 | 259 |
| FD003 | 12.44 | — | 0.720 | 100 |
| FD004 | 23.86 | — | 0.827 | 248 |

### Published results for comparison (FD001)

| Method | Test RMSE |
|---|---|
| CNN — Babu et al., 2016 | 18.45 |
| LSTM — Zheng et al., 2017 | 16.14 |
| Deep CNN — Li et al., 2018 | 12.61 |
| **AeroTwin method** | **12.37** |

FD002 and FD004 carry six operating conditions and are materially harder, which is why the
literature comparison is shown for FD001 only — comparing the harder subsets against FD001
figures would flatter or damn the method for the wrong reason.

### The coverage result matters as much as the RMSE

`p10–p90 coverage 0.800` against a nominal 0.80 means the prediction interval is correctly
calibrated: 80 % of true values fall inside it, exactly as claimed.

On our own simulator corpus, coverage is 0.75 — slightly optimistic. The C-MAPSS result
calibrating at nominal **locates that as a simulator artefact rather than a flaw in the
method**. That is a more useful finding than either number alone.

### Reproduce it

```bash
python -m ml.validate_cmapss --subset FD001
```

---

## Panel 3 — What this system has not demonstrated

Served from `GET /limitations`. This panel is deliberate, and it is a strength rather than a
confession.

### Training data

Models are trained and tested on a physics-based run-to-failure simulator. No public dataset
provides labelled degradation trajectories for a high-altitude aero piston engine — NGAFID
gives real piston sensor behaviour without fault labels or a UAV envelope; C-MAPSS gives
labelled run-to-failure data for a different machine.

### Why the internal metrics are honest

Splits are made at **flight level, never at row level**.

Consecutive telemetry samples within a sortie are enormously autocorrelated. A random row
split would put near-identical rows on both sides of the boundary, producing an accuracy
that looks excellent and collapses on real data. Every metric in `reports/` is computed on
sorties no model has seen.

This is the single most common methodological error in time-series ML projects, and avoiding
it is worth stating explicitly.

### What is unproven

**Transfer to a physical engine.** Metrics measured against simulated telemetry do not
establish accuracy against a real one.

### Outstanding — NGAFID

Validating the physics baseline against real piston-engine flight data is **not yet done**.
The archive obtained is a truncated download carrying only flight headers; the ~2.9 GB of
telemetry is missing.

Until that is closed, the physics baseline is validated only against the simulator that was
built from it. This is the largest gap in the evidence and it is stated plainly.

The script is written and runs the moment the data is supplied:

```bash
python -m ml.validate_ngafid
```

It would measure whether `expected_state()` carries a bias on real healthy flights. A
non-zero mean residual is a calibration offset to correct; a trend against operating point
would be a structural error in the model.

### Known model issues

1. **RUL p10–p90 coverage is 0.75 on our corpus** against a nominal 0.80, so the published
   interval is slightly optimistic and needs recalibration.
2. **RUL is reported only once degradation is detected.** On a healthy engine the training
   label is right-censored and a point estimate there would be invented precision.

### How the gap would be closed

1. Obtain the complete NGAFID export and run `validate_ngafid.py` to measure the physics
   baseline's bias on real healthy flights.
2. Calibrate against an engine test rig before any flight deployment.

---

## Why show this at all

A DRDO panel will ask how the models were validated. There are two possible answers.

One is to quote 98.7 % accuracy and hope nobody asks what it was measured on. That answer
survives about ten seconds of scrutiny from anyone who has trained a model on time-series
data.

The other is this panel: here are the numbers, here is exactly how they were measured, here
is one result on data we did not build, and here is the thing we have not proven and how we
would prove it.

A team that knows the limits of its own validation is more credible than one claiming
certainty it cannot support. This tab exists to make that argument on the software's behalf.

---

## Questions a judge is likely to ask

**"How do I know these numbers aren't cherry-picked?"**
`GET /models/{name}/metrics` returns the full report — every class, the confusion matrix,
per-mode recall, all of it. The dashboard shows headlines; the API shows everything.

**"Your models are trained on simulated data. Why should I believe them?"**
You shouldn't, for the piston-specific claims — and this panel says so. What you can believe
is the method, because it was benchmarked on C-MAPSS against published results without
touching our simulator.

**"What would it take to fly this?"**
The roadmap on this page: close the NGAFID gap to calibrate the physics baseline, then a
test-rig campaign against a real engine. The software architecture is already deployment
shaped — the same ONNX files run on a Jetson, and the CAN layer is one config change from
real hardware.

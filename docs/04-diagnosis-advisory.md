# Tab 4 — Diagnosis & Advisory

The decision-support tab. Four panels answering four different questions:

1. **Is this the engine, or is it the instrument?**
2. **What can the operator do right now?**
3. **What work does maintenance need to do?**
4. **Why did the model say that?**

Everything here is **pulled on request**, not pushed with every frame. A counterfactual runs
several forward simulations on the backend, and an operator asks for one at a decision point
— not sixty times a minute. Use the **Refresh** button to recompute.

If no mission is running you get *"No mission running. Start a sortie to request analysis."*

---

## Panel 1 — Engine fault or instrumentation fault?

**This is the most important panel in the application.** It is the claim the whole project
rests on.

### The problem it solves

A thermocouple that fails 145 °C high trips any threshold-based system and aborts the
sortie. The engine is perfectly serviceable. On a MALE UAV a false abort costs a mission and
can cost the recovery window too.

### The physics that solves it

Real heat release cannot hide. A genuine cylinder head overheat **must** also show up in
that cylinder's exhaust gas temperature, in bulk coolant, and in oil temperature. A faulty
transducer moves exactly one channel and leaves every physically coupled channel flat.

### What the panel shows

**Verdict box** — either:
- *Instrumentation fault — engine parameters corroborate healthy operation* (blue)
- *Physical engine fault — coupled channels corroborate the deviation* (grey)

with the instrumentation probability and a **Decided by** line naming which model made the
call.

> **Who actually decides:** the six-class classifier decides *whether* this is
> instrumentation, because it is the stronger signal — 98.7 % accuracy with an explicit
> `SENSOR_DRIFT` class. The corroboration discriminator supplies the evidence and retains a
> veto: if it disagrees with a `SENSOR_DRIFT` call, the engine-fault reading stands, which
> is the conservative direction.
>
> This gating exists because the discriminator alone fails in two measured ways. On a
> healthy engine it returns ≈1.0 (there is no deviation to explain, so the question is
> meaningless). And early in *any* fault, deviations are small so nothing corroborates
> anything yet — it mislabelled 6.0 % of correctly classified cooling-leak frames,
> concentrated at ~4 % severity, exactly the early-warning window.

**Starting point** — the discriminator's intercept, **−44.40**.

This is a standing prior that any deviation is mechanical rather than instrumentation, which
is the correct default for an engine monitor. A fault has to argue its way past it. It is
shown because it usually decides the outcome — listing only the feature terms produced a
panel where three features pointed "sensor" directly beneath a verdict of "physical engine
fault", which read as self-contradictory.

**Evidence table** — the four strongest corroboration terms, plus a **Total** row.

| Column | Meaning |
|---|---|
| Corroboration feature | Which cross-channel check |
| Value | The raw measured value |
| Contribution | Its signed push on the decision |
| Points to | `sensor` (positive) or `engine` (negative) |

Baseline + all terms = Total, and the Total sets the probability shown above. What you see
adds up to the verdict you are being asked to act on.

### The eight corroboration features

| Feature | Question it asks |
|---|---|
| `cht_excess_over_median` | How isolated is the hottest head from the other three? |
| `egt_corroboration` | Does that cylinder's exhaust agree it is hot? |
| `coolant_corroboration` | Did bulk coolant move? |
| `oil_corroboration` | Did oil temperature move? |
| `vib_corroboration` | Did vibration move? |
| `egt_cht_ratio` | Ratio near zero = head hot, exhaust not |
| `coolant_cht_ratio` | Ratio near zero = head hot, coolant not |
| `oil_cht_ratio` | Ratio near zero = head hot, oil not |

### The learned coefficients

The model is **deliberately linear**. The coefficients *are* the argument and can be read
directly:

```
vib_corroboration       −52.90   ← by far the strongest single piece of evidence
coolant_corroboration   −18.37
coolant_cht_ratio        −6.53
oil_cht_ratio            +3.11
oil_corroboration        −2.80
cht_excess_over_median   +1.49
egt_corroboration        −0.66
egt_cht_ratio            +0.36
```

Negative pushes toward *engine fault*. **Vibration agreeing with a temperature rise is the
single strongest evidence that a fault is mechanical rather than instrumentation** — which
makes physical sense: a thermocouple cannot shake the engine.

Measured performance: **ROC-AUC 0.9997**, 99.3 % accuracy.

### Worked example — real bearing fault

```
Verdict      Physical engine fault — coupled channels corroborate the deviation
Probability  0.0 % instrumentation
Decided by   Six-class classifier (BEARING_LUBRICATION) with discriminator agreement

Starting point                          −44.40
  coolant_corroboration    0.30          +7.83   → sensor
  vib_corroboration        0.71          +3.25   → sensor
  coolant_cht_ratio        0.11          +2.31   → sensor
  cht_excess_over_median   2.70          −0.55   → engine
Total                                   ≈ −31    → net: engine
```

**Read it:** three features lean toward "sensor", but they are nowhere near enough to
overcome a −44.4 prior. Net result is firmly engine fault. Without the baseline row this
table looked like it contradicted its own verdict.

---

## Panel 2 — In-flight options

Counterfactuals: what happens to remaining life if the operator changes something *now*.

### How these are computed

Each option is a **real forward simulation**. The backend clones the current twin — degraded
engine state and all — applies the changed operating point, flies it forward through a full
five-minute feature window with the same CAN quantisation as the live path, and asks the RUL
model what it now predicts.

These are not a lookup table of plausible-sounding deltas.

### The options

| Action | What it does physically |
|---|---|
| **MAINTAIN** | Current profile, enhanced monitoring. The baseline. |
| **DERATE_THROTTLE** | −15 % throttle. Reduces bearing load and combustion temperature. |
| **DESCEND** | −4,000 ft. Denser air improves cooling mass flow and intercooler margin. |
| **DERATE_AND_DESCEND** | −10 % throttle, −3,000 ft. Combined thermal and mechanical unloading. |
| **RETURN_TO_BASE** | Abort and recover while margin remains. |

### What each row shows

- **Projected RUL** after the change
- **Delta** against the MAINTAIN baseline (green = gains life, red = loses it)
- **Completion probability** for the rest of the sortie
- **Recommended** badge on exactly one option

### How the recommendation is chosen

Take the **least intrusive option that survives the sortie**, because every de-rate costs
mission value. If nothing survives it, recommend recovery — no amount of de-rating makes an
unflyable margin flyable.

Intrusiveness order: MAINTAIN < DESCEND < DERATE_THROTTLE < DERATE_AND_DESCEND.

### Mission completion probability

A logistic in the ratio of remaining life to remaining mission, centred where they are
equal:

- RUL = 2× remaining mission → ~95 %
- RUL = remaining mission → 50 %
- RUL = ⅕ of remaining mission → ~5 %

Deliberately smooth. A step function at "RUL equals remaining" would make the number flip
between 0 and 1 on sensor noise.

### When an instrumentation fault is detected

The options change entirely. RUL and everything projected from it are regressed on residual
features the faulty transducer contaminates, so they measure the instrument rather than the
engine. Left alone, this panel recommended **return to base at 9 % completion** while the
maintenance panel beside it said the engine needed no disassembly.

So on an instrumentation fault you get two options and no projections:

- **MAINTAIN** *(recommended)* — continue; coupled channels show no corroborating change
- **RETURN_TO_BASE** — available at the commander's discretion, explicitly **not** indicated
  by the engine evidence

Completion probability reads ~99 %.

### Known limitation

At high fault severity all four projections often return the **same** RUL with zero delta —
as in the worked example below. Once a bearing is badly degraded, throttling back genuinely
does not recover much life, and the RUL model saturates near its floor. It is arguably
physically correct, but it looks like the feature is inert. The options differentiate more
clearly at low and moderate severity, so inject at a lower severity rate when demonstrating
this panel.

### Worked example — bearing fault, 45 minutes in

```
Mission completion probability   10 %      (7.47 h of sortie remaining)

    MAINTAIN             1.96 h   +0.00   10 %
    DERATE_THROTTLE      1.96 h   +0.00   10 %
    DESCEND              1.96 h   +0.00   10 %
    DERATE_AND_DESCEND   1.96 h   +0.00   10 %
  ★ RETURN_TO_BASE       1.96 h   +0.00    0 %
```

**Read it:** 1.96 hours of life against 7.47 hours of mission. Nothing survives the sortie,
so recovery is recommended. The engine will not make it home on the planned profile
regardless of how the operator flies it.

---

## Panel 3 — Maintenance advisory

What the ground crew needs to do, with the physical reasoning.

**Deliberately a rules layer, not a learned model.** The inputs are few — fault class, RUL,
subsystem health, hours since overhaul — and the answer has to be auditable by an engineer
who will sign for the work. A learned model here would be unexplainable at exactly the point
where explanation is the deliverable.

### Urgency bands

| Urgency | When |
|---|---|
| **Critical** | RUL < 2 h |
| **Warning** | RUL < 10 h |
| **Caution** | Degradation present, ample life, or health < 60 % with no named mode |
| **Advisory** | Instrumentation fault |

### The mapping

| Fault | Action | Rationale shown |
|---|---|---|
| Bearing lubrication | Inspect main and big-end bearing shells; sample and analyse oil for metal | Falling oil pressure with rising vibration and oil temperature is the classical signature of hydrodynamic film loss as journal clearance opens |
| Injector misfire | Flow-test and clean the affected injector; inspect ignition lead and plug | A single cylinder running lean raises its own EGT while total fuel flow falls — a delivery fault on that cylinder rather than a mixture problem |
| Cooling leak | Pressure-test the cooling circuit; inspect hoses, radiator core and pump seal | Coolant and all four head temperatures rising together means heat rejection capacity is falling, not that one cylinder is hot |
| Sensor drift | Replace or recalibrate the affected transducer; **no engine disassembly indicated** | The reported channel moved without corroborating change in physically coupled channels. The engine is serviceable. |
| Combustion instability | Check ignition timing and plug condition; verify fuel quality and injector balance | Cycle-to-cycle EGT scatter without a single dominant cylinder points to ignition or fuel quality rather than one failed component |

A subsystem below 60 % health with **no** named fault mode also raises an inspection call —
degradation is present but has not yet developed a recognisable signature.

---

## Panel 4 — Why the model said that

Feature attribution over the fault classifier. A maintenance engineer will not pull a
cylinder because a model said so; the diagnosis has to come with its evidence.

### The source badge — read this first

| Badge | Meaning |
|---|---|
| **exact TreeSHAP** (green) | Exact Shapley values computed over the XGBoost trees |
| **gain-weighted estimate** (grey) | An approximation — global feature importance × how far this sample sits from the training mean |

The runtime image deliberately ships without `xgboost` and `shap`, which are training-time
tools. When they are absent the system falls back to the approximation **and says so**. An
approximation presented as an exact SHAP value would be worse than no attribution at all.

To get exact TreeSHAP, install the training extra on the backend: `pip install -e ".[ml]"`.

### What the bars mean

- **Red** — this feature raised the score for the predicted class
- **Blue** — this feature lowered it
- Bar length is contribution magnitude, ranked largest first

### The narrative line

A plain-language reading of the top three attributions, in the panel subtitle.

### Reading feature names

Names follow `<channel>_<statistic>`:

| Suffix | Meaning |
|---|---|
| `_mean` | Average over the trailing 5-minute window — the **level** |
| `_std` | Standard deviation over the window — the **variability** |
| `_slope` | Least-squares trend over the window — the **trend** |

The dashboard translates these: `res_cht_max_slope` renders as *"CHT max residual (trend)"*.

**The slope terms are what make the system predictive.** A residual that is still small but
climbing steadily is an incipient fault, and no threshold on the instantaneous value can see
it.

### Worked example — bearing fault

```
Source   gain-weighted estimate
Class    BEARING_LUBRICATION at 100 % confidence

"Bearing Lubrication at 100% confidence, driven by electrical bus health (level)
 raising the score, coolant temperature agreeing with head temperature (level)
 lowering the score, mechanical subsystem health (level) lowering the score."

  health_electrical_mean        99.11    +0.028
  coolant_corroboration_mean     0.01    −0.022
  health_mechanical_mean        92.22    −0.019
  res_oil_pressure_mean         −0.36    −0.014
  res_coolant_temp_mean          0.01    −0.013
```

**Read it:** `res_oil_pressure_mean` at −0.36 bar is the physically meaningful one — oil
pressure is running below what the physics model expects, which is the bearing signature.
Note that in gain-weighted mode the ranking reflects *global* importance times local
deviation, so it is a reasonable ranking of "what is unusual here that the model cares
about" — but it is not a per-prediction Shapley value, and the badge says so.

---

## Questions a judge is likely to ask

**"How do you avoid a false abort on a sensor failure?"**
This tab, Panel 1. Inject sensor drift, show the evidence table: one head hot, coolant/oil/
vibration all flat, verdict instrumentation, alert advisory, recommendation continue.

**"Your XAI is an approximation?"**
In this deployment, yes, and the badge says so. The exact path is one `pip install` away —
we chose not to ship 2 GB of training libraries into a ground-station image for a feature
that runs on request. The honest label was the point.

**"Why is the advisory recommending RTB when all options show the same life?"**
Because at that severity de-rating genuinely does not recover meaningful life, and 1.96
hours will not cover 7.47 hours of mission. Lower the severity rate and the options
differentiate.

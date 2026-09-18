# Tab 2 — 3D Twin

A live kinematic model of the engine. Every moving part follows the same telemetry frame the
cockpit gauges read, so what you see turning, glowing and shaking *is* the engine state — not
an animation playing alongside it.

This is the "virtual engine model synchronized with live engine data" the problem statement
asks for in section A.

---

## What the model represents

A **turbocharged four-cylinder boxer**, Rotax 915 iS class — 141 hp, the powerplant class
flown on TAPAS BH-201 airframes.

| Term | Meaning |
|---|---|
| **Boxer** | Cylinders lie flat in opposed pairs rather than in a line or a V. Two per side. |
| **Firing order 1-3-4-2** | The sequence cylinders fire in. Chosen to balance the crankshaft. |
| **Turbocharger** | An exhaust-driven compressor that forces extra air in. Without it, a piston engine loses power fast with altitude — which is why a MALE UAV needs one. |
| **Reduction gear** | The propeller turns slower than the crankshaft; gearing steps it down. |
| **Wastegate** | The valve that limits boost. It holds sea-level pressure up to the critical altitude, then runs out of authority. |

---

## What is driven by live data

| Element | Driven by | What to watch for |
|---|---|---|
| **Crankshaft + piston motion** | `rpm` | Speeds up on the climb, settles in cruise |
| **Propeller rotation** | `rpm` through reduction gearing; blurs to a disc at speed | Blur density tracks power |
| **Turbo impeller** | `rpm` and manifold pressure | Spins hardest at high boost, slows at altitude as the wastegate opens fully |
| **Cylinder head colour** | `cht1`–`cht4` individually | One head diverging from the other three is a misfire or a sensor fault |
| **Exhaust header glow** | `egt1`–`egt4` | Hot exhaust glows; scatter across four headers is combustion instability |
| **Structural jitter** | `vibration` | Whole-block shake grows with vibration RMS |
| **Fault highlighting** | classifier verdict + `is_sensor_fault` | Affected parts turn red; a suspected sensor turns **amber**, not red |

The last row matters. When the system decides a deviation is instrumentation rather than
mechanical, the affected cylinder is shaded **amber** instead of red. The colour itself
carries the "do not abort" message.

---

## Controls

### Camera presets (four buttons)

| Preset | View | Use it to see |
|---|---|---|
| **ISO** | Isometric cockpit angle | General situational view — the default |
| **Top** | Top-down over the boxer cylinders | All four heads at once; thermal divergence is obvious here |
| **Front** | Propeller and reduction gear | Propeller speed and the gear train |
| **Turbo** | Turbocharger and exhaust manifold | Impeller speed and exhaust header glow |

You can also **orbit freely** by dragging, at any time.

### Display toggles

**X-ray / cutaway** — makes the crankcase transparent so you can watch the pistons,
connecting rods and crankshaft throws moving inside. Use this to show that the motion is a
real reciprocating model, not a spinning texture.

**Thermal heatmap** — recolours the whole engine on a temperature gradient rather than by
material. Blue is cool, red is hot. This is the fastest way to show a cooling leak: the
entire block shifts red together, where a misfire lights up exactly one cylinder.

**Auto-rotate** — slow continuous turn. Useful when presenting hands-free.

**Fullscreen** — expands the canvas.

### Click to inspect

Click any part to select it. A panel appears below the canvas naming the component and
stating what drives its animation. Selectable parts include the bearings, the lubrication
path, the propeller, the turbocharger and each cylinder.

---

## Reading the three fault signatures visually

This is the fastest way to teach someone the difference between the modes.

### Cooling leak — everything hot together

Switch on **thermal mode**, use the **Top** camera.

All four cylinder heads shift red **simultaneously**, and stay matched to one another. The
exhaust headers follow. Nothing unusual happens to the vibration jitter.

> Whole-block thermal rise with no mechanical signature = heat rejection is failing.

### Injector misfire — one cylinder diverges

**Top** camera again.

**One** head runs hotter than the other three, and its exhaust header glows brighter. The
other three stay matched. Slight increase in jitter.

> One cylinder hot *and* its exhaust hot = that cylinder is burning wrong.

### Sensor drift — one cylinder diverges, but everything else stays flat

Visually similar to a misfire at first glance, which is exactly why it is dangerous.

**One** head shows an extreme reading — but its exhaust header does **not** brighten, the
coolant temperature does not move, and vibration is unchanged. The system shades it
**amber** rather than red.

> One cylinder hot and *nothing else agrees* = the thermometer is lying, not the cylinder.

### Bearing lubrication loss — mechanical, not thermal

Use **X-ray** mode.

The dominant visual is **structural jitter** growing as vibration RMS climbs toward
4.8 mm/s. Thermal change is mild and spread across the block. Oil pressure falling is
visible on the cockpit tab rather than in the scene.

> Shaking without a strong thermal signature = something mechanical is wearing.

---

## Performance notes

The 3D scene loads **on demand**. Three.js is the single largest dependency in the
dashboard, and only this tab needs it, so the cockpit an operator opens first does not pay
for a renderer it is not showing. Expect a brief "Loading the 3D engine…" the first time you
open this tab.

The scene keeps its own prop vocabulary — per-cylinder arrays and a preset name — rather
than consuming the wire format directly. `src/lib/adapt3d.ts` is the only place the two
meet, so a backend schema change cannot ripple through a thousand lines of scene graph code.

One consequence worth knowing: the scene's preset names differ from the backend's fault
classes (`SENSOR_MALFUNCTION` in the scene, `SENSOR_DRIFT` on the wire). Same condition,
two vocabularies, mapped in the adapter rather than renamed in either.

---

## If the tab is empty

> *Waiting for telemetry. Start a mission to drive the 3D twin.*

The scene renders from the live frame. Start a sortie on the **Live cockpit** tab first.

---

## Questions a judge is likely to ask

**"Is the 3D just decoration?"**
No. Turn on X-ray, inject a bearing fault and raise the severity — the jitter amplitude is
the `vibration` channel. Switch to thermal and inject a cooling leak — the colour is the CHT
channel. Every motion has a telemetry source, listed in the table above.

**"Could you show a misfire versus a sensor fault?"**
Yes, and it is the best demonstration on this tab. Inject each in turn with the Top camera
and thermal mode on. Both light up one cylinder; only the real misfire lights up its exhaust
as well. The system shades the sensor case amber and keeps the mission going.

**"Is this a CAD model?"**
It is a procedural kinematic model built in Three.js — geometry generated in code with
correct boxer layout, firing order and reduction gearing. It is not a CAD import, and it is
not claimed to be a dimensionally accurate replica of a specific engine.

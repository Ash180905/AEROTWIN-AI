# Tab 5 — Mission Replay

Post-flight analysis. Every recorded sortie, frame by frame, with a health report at the
end.

This is problem statement section E — *"replay of historical mission data"* and
*"supporting post-flight analysis"* — and section F's *"mission-wise health reports"*.

---

## Panel 1 — Recorded missions

A table of every sortie the ground station has stored.

| Column | Meaning |
|---|---|
| **Flight** | `M-<date>-<time>`, assigned when the mission started |
| **Scenario** | Which profile was flown |
| **Frames** | How many telemetry frames were recorded |
| **Min health** | The lowest overall health index reached during the sortie |
| **Peak fault** | The most serious fault mode classified at any point |

Newest first. Click **Open** to load one.

### Reading frame counts

Frames are recorded at the engine's **native 5-second step**, not at the rate the dashboard
received them. A 4-hour sortie is 2,880 frames; an 8-hour sortie is 5,760.

This matters: if the downlink was cut during the flight, the dashboard saw a gap but the
recording did **not**. The twin kept stepping and kept recording. Replay is complete even
where the live view was not.

### Example listing

```
M-20260918-155518   hot_weather    5760 frames   min health 71.9   COOLING_LEAK
M-20260918-153641   hot_weather    5760 frames   min health 69.7   COMBUSTION_INSTABILITY
M-20260918-151721   hot_weather    5760 frames   min health 93.2   NORMAL
M-20260918-151055   standard_isr   4608 frames   min health 56.1   BEARING_LUBRICATION
```

### Seeded missions

A fresh install ships with five pre-recorded sorties (`M-SEED-001` … `M-SEED-005`), one per
story the dashboard needs to tell — healthy baseline, cooling leak, bearing loss, the
sensor-drift case, and an injector fault under throttle transitions.

They exist so a freshly cloned demo does not show empty panels until someone has sat through
a full mission. Regenerate them on the backend with:

```bash
python -m scripts.seed_missions --reset
```

---

## Panel 2 — Timeline scrubber

Drag the slider to move through the sortie. Everything below updates to that moment.

The header shows `frame 412 of 600` and the sortie clock at that frame.

### What is shown at each position

| Tile | Meaning |
|---|---|
| **Overall health** | The weighted index at that instant, colour-coded |
| **Classification** | What the fault classifier said at that frame |
| **RUL** | Remaining life, or `censored` if no degradation was detected |
| **CHT max residual** | Hottest head minus physics expectation |

Below the tiles, the **alerts that were active at that frame**, with their severity badges.

### A replayed frame is the frame the operator saw

Frames are stored verbatim as JSON and returned exactly as they were sent live. There is no
reconstruction step that could quietly differ from what was on screen at the time. If the
classifier said `COOLING_LEAK` at 02:14:30 during the flight, it says `COOLING_LEAK` at
02:14:30 in replay.

That property is what makes this usable for incident investigation rather than just
visualisation.

### Frame limits

A replay request returns at most **1,000 frames** by default and **3,000** maximum. A
20-hour sortie is around 14,000 frames — no display can resolve that, and no single HTTP
response should carry it. When a range is clipped, the response says so.

To examine a specific window rather than the whole sortie, the underlying API takes a time
range:

```
GET /missions/{flight_id}/replay?from_s=3600&to_s=5400
```

---

## Panel 3 — Post-flight health report

What the maintenance team reads once the aircraft is back.

### Health trajectory chart

Overall health across the whole sortie, **downsampled to about 200 points**. Charting 14,000
points is pointless — the display cannot resolve them and the payload is large — so frames
are decimated to a fixed bucket count on the backend.

The amber dashed line at 70 is the caution trip point.

### Notes

Plain-language observations the system generates about the flight. Three can appear:

| Note | When |
|---|---|
| Instrumentation fault identified; no engine disassembly indicated | A sensor fault was diagnosed during the sortie |
| Windowed model outputs not reliable for this mission | The sortie ended before the 5-minute feature window filled |
| Subsystem health fell to N % during this sortie | Minimum health dropped below 70 |

The first one is the important one for the maintenance crew: it tells them **not** to strip
an engine because of a reading that was never real.

### Condition timeline

Each alert code with **when it first appeared**, in order.

A latched alert repeats in every frame it is active — a cooling leak might produce 16,000
alert instances across a sortie. The timeline reports *when each condition arose*, not how
many frames it survived. That is what an investigator wants.

Typical sequence for a developing cooling leak:

```
ANOMALY_UNCLASSIFIED   caution    Unclassified anomaly — reconstruction error 2.1 …
FAULT                  warning    Cooling system degradation — heat rejection falling …
HEALTH_COOLING         caution    Thermal cooling health 68 %
RUL                    warning    Remaining useful life 5.2 h
```

**Read the order.** The anomaly detector fires first — it flags "something is unlike a
healthy engine" before the classifier has enough windowed evidence to name the mode, and
well before subsystem health crosses its caution trip. That ordering *is* the lead time,
recorded and auditable.

### Maintenance actions

The same advisory logic as the live tab, evaluated against the sortie's final state — with
urgency badge, action and physical rationale.

---

## Deleting a mission

The API supports `DELETE /missions/{flight_id}`. A mission that is currently running cannot
be deleted (409).

---

## Where the data lives

SQLite, in `data/aerotwin.db` on the backend, in WAL mode so recording does not block replay
reads. Two tables: `missions` (one row per sortie, summary maintained incrementally) and
`frames` (one row per frame, full JSON payload plus indexed columns for filtering).

The access surface is deliberately narrow — append a frame, list missions, read a range — so
moving to TimescaleDB for fleet-scale history means reimplementing three methods rather than
unpicking the application.

---

## Questions a judge is likely to ask

**"Is the replay showing real recorded data or re-simulating?"**
Real recorded data. Frames are stored verbatim and returned byte-identical to what the
socket sent. Nothing is recomputed on replay.

**"What happens to history if the datalink drops?"**
Nothing — the recording is onboard-side of the link. Cut the downlink live, then open the
mission in replay: the frames the dashboard never received are all there.

**"Can you prove the system warned before the failure?"**
The condition timeline, and its ordering. The anomaly alert timestamp sits ahead of the
health alert timestamp, and both sit ahead of the RUL critical alert.

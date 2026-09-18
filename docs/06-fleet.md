# Tab 6 — Fleet

Squadron-level readiness and the lifecycle record for each engine. This is the problem
statement's *"fleet-level health monitoring"* and *"life cycle management"*.

---

## Panel 1 — Squadron readiness

One card per engine, plus a headline `3/4 ready` count. Refreshes every 5 seconds.

### What each card shows

| Element | Meaning |
|---|---|
| **Airframe** | Tail identifier, e.g. `TAPAS-02` |
| **Ready / Not ready** | The airworthiness call |
| **Engine ID · status** | `available`, `flying`, `maintenance`, `grounded` |
| **Health bar** | Overall health index |
| **Active fault** | Current classification |
| **RUL** | Remaining life, or `—` when no degradation is detected |
| **Hours since overhaul** | Time on the engine since its last major strip |

Click a card to load its passport below.

### The readiness rule

An engine is **ready** unless any of these is true:

| Condition | Threshold |
|---|---|
| Status is `maintenance` or `grounded` | — |
| Overall health | below 70 % |
| Hours since overhaul | at or past 1,200 h (TBO) |
| Remaining useful life | below 2 h |

**Deliberately simple and deliberately conservative.** This is the number a squadron plans
against, so it must be reproducible by hand from the figures on the card. An operations
officer should be able to check it without trusting the software.

### Terms

| Term | Meaning |
|---|---|
| **TBO** | Time Between Overhauls — the manufacturer's interval before a full strip and rebuild. 1,200 h for this engine class. |
| **Hours since overhaul** | Time flown since the last strip. Resets to zero at overhaul. |
| **Total hours** | Lifetime hours on the engine, across all overhauls. Never resets. |
| **Cycles** | Number of start-to-shutdown runs. Thermal cycling drives fatigue independently of running hours. |

### Example fleet

```
TAPAS-02  TAPAS-02-ENG-A   available     health 100.0   418.2 h since overhaul   READY
TAPAS-01  TAPAS-01-ENG-A   available     health  87.4   692.4 h since overhaul   READY
TAPAS-03  TAPAS-03-ENG-A   available     health  98.9   418.0 h since overhaul   READY
TAPAS-04  TAPAS-04-ENG-A   maintenance   health  72.1  1188.6 h since overhaul   NOT READY
```

TAPAS-04 fails on status (`maintenance`) and is 11.4 hours from its 1,200 h TBO. Note that
its health of 72.1 % would **not** on its own have grounded it — the 70 % floor is below
that. Two independent reasons, and the card shows both.

### The engine currently flying

When a mission is running, the flying engine's card updates live from the telemetry stream:
health, RUL and active fault all follow the socket, and its status reads `flying`.

The rest of the fleet is representative data. Genuine fleet-wide monitoring across a real
squadron needs a shared database and an identity model, which is on the deployment roadmap
rather than half-built here.

---

## Panel 2 — Digital engine passport

The lifecycle record. Click any fleet card to open it.

### Header block

| Field | Meaning |
|---|---|
| **Serial** | Engine serial number, e.g. `RTX915-2023-0261` |
| **Total hours** | Lifetime hours |
| **Since overhaul** | Hours on the current build, shown against the 1,200 h TBO |
| **Cycles** | Start–shutdown cycles, with the installation date |

Model line reads *Rotax 915 iS class — 141 hp turbocharged 4-cylinder boxer*.

### Life-limited components

Each component with its own service life, showing hours consumed and percentage remaining.

| Component | Life limit |
|---|---|
| Crankshaft assembly | 1,200 h |
| Connecting rod bearings | 600 h |
| Turbocharger cartridge | 900 h |
| Fuel injectors (set of 4) | 600 h |
| Coolant pump | 800 h |
| Alternator | 1,000 h |
| Ignition modules | 1,000 h |

**"Life-limited"** means the part is replaced on a schedule regardless of condition, because
its failure mode is fatigue rather than wear you can inspect for.

### How component life is counted — read this carefully

Hours are counted from **that component's own last replacement**, not from the engine
overhaul.

A component whose life limit is shorter than the overhaul interval gets replaced on its own
cycle, not left in the engine until the next strip. The passport therefore also reports how
many replacements have happened since overhaul.

**Worked example — TAPAS-04, 1,188.6 h since overhaul:**

```
Crankshaft assembly        1188.6 / 1200  =  1.0 %   (0 replacements)
Connecting rod bearings     588.6 /  600  =  1.9 %   (1 replacement)
Turbocharger cartridge      288.6 /  900  = 67.9 %   (1 replacement)
Fuel injectors (set of 4)   588.6 /  600  =  1.9 %   (1 replacement)
Coolant pump                388.6 /  800  = 51.4 %   (1 replacement)
Alternator                  188.6 / 1000  = 81.1 %   (1 replacement)
Ignition modules            188.6 / 1000  = 81.1 %   (1 replacement)
```

**Read it:** the bearings have been changed once and the second set has 588.6 of its 600
hours consumed — 11.4 hours left, the same margin as the engine has to TBO. The turbo
cartridge was changed at 900 h and has plenty of life. This is a coherent maintenance
picture: an engine about to go in for overhaul, with several items due at the same time.

> An earlier version measured every component from the engine overhaul, which reported the
> whole fleet at 0 % remaining life — connecting rod bearings showing 1,188.6 h against a
> 600 h limit. That is not a state an airworthy engine can be in, and an engineer on a
> judging panel would catch it instantly.

### Maintenance history

Chronological log, newest first. Each entry carries date, engine hours at the time, the
action performed, the finding, and the technician identifier.

```
2026-09-14   1188.6 h   Scheduled overhaul induction
                        Approaching 1200 h TBO                        OVH-0092
2026-08-22    402.0 h   100-hour inspection
                        Nil defect                                    AME-2214
2026-06-11    298.5 h   Injector flow test
                        Cylinder 3 injector cleaned, within limits    AME-1836
```

**"Nil defect"** is standard aviation maintenance phrasing for an inspection that found
nothing wrong. Technician IDs (`AME-` for Aircraft Maintenance Engineer, `OVH-` for the
overhaul shop) stand in for signed authorisations — a real system would carry a licence
number and a signature.

---

## Why this matters for the pitch

The passport is what connects predictive analytics to actual maintenance planning. RUL tells
you an engine has 4 hours of life at its current degradation rate. The passport tells you it
also has 11 hours to TBO and its bearings are due. Together those decide whether you inspect
now, fly one more sortie, or pull it forward into the overhaul that was coming anyway.

That is the difference between a monitoring system and a maintenance system.

---

## Questions a judge is likely to ask

**"Is the fleet data real or mocked?"**
The flying engine is live from the twin. The other three are representative seed data, and
we say so. Fleet-wide monitoring needs a shared database and identity model — it is on the
roadmap, not half-built.

**"How is readiness decided?"**
Four conditions, listed on this page, all checkable by hand from the numbers on the card.
Deliberately not a learned model — a squadron has to be able to verify it.

**"What happens when an engine reaches TBO?"**
Readiness goes false at 1,200 hours regardless of health. Condition monitoring does not
override a hard life limit; it tells you whether you will get there.

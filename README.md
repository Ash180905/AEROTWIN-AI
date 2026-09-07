# AeroTwin AI ✈️ ⚙️
### AI-Enabled Real-Time Digital Twin System for Health Monitoring, Fault Prediction, and Mission Reliability of MALE UAV Aero Piston Engines
**Smart India Hackathon (SIH 2024 / SIH26054) | Defense Research & Development Organisation (DRDO) / ADE Specification**

---

## 📌 Executive Summary

**AeroTwin AI** is a defense-grade, physics-informed digital twin cockpit and predictive health monitoring system engineered for Medium Altitude Long Endurance (MALE) Unmanned Aerial Vehicles (such as DRDO Rustom-II / TAPAS-BH-201). 

Built specifically around turbocharged four-stroke aero piston engines (Rotax 914 / 915 iS class), AeroTwin AI bridges physical thermodynamics with real-time deep learning to predict failures **hours before standard threshold alarms trigger**, discriminate sensor anomalies from physical mechanical breakdowns, and recommend tactical counterfactual flight adjustments to guarantee mission completion.

---

## 🚀 Key Innovations & Capabilities

### 1. Live Interactive 3D WebGL Digital Twin Simulation
- **Full 3D Kinematic Engine Simulation**: Modeled after turbocharged four-stroke boxer engines (Rotax 914/915 iS class) using Three.js and WebGL.
- **Dynamic Physics Animation**: Real-time reciprocating boxer pistons (firing order 1-3-4-2), rotating crankshaft throws, spinning 3-blade composite propeller (with high-speed disc blur), and high-RPM turbocharger compressor impeller.
- **Thermal Heatmap & Dynamic Shaders**: Real-time thermal glowing on exhaust headers and cylinder heads matching actual sensor CHT/EGT temperatures.
- **X-Ray / Cutaway Housing Mode**: One-click transparent housing toggle to inspect internal mechanical moving parts.
- **Physical Vibration Jitter**: Structural oscillation displacement applied dynamically to the engine block proportional to real-time vibration RMS (up to 4.8 mm/s).
- **Interactive Component Raycaster**: 360° orbit rotation, multi-angle camera presets (ISO, Boxer, Propeller, Turbocharger), and click-to-inspect 3D raycasting.

### 2. Physics-Informed Digital Twin (Real-Time Physics vs AI)
- Coupled thermodynamic baseline calculating expected RPM, cylinder head temperatures (CHT 1–4), exhaust gas temperatures (EGT 1–4), oil pressure, and vibration profiles across varying altitudes and ambient conditions.
- Continuous multivariate residual generation: $\text{Residual} = \text{Actual Sensor} - \text{Physics Expected}$.

### 2. Subsystem Health Scoring & Alert Notification Overlay
- Real-time degradation evaluation across 6 critical subsystems:
  - **Combustion Chamber**
  - **Lubrication & Oil Film**
  - **Thermal Cooling**
  - **Fuel Injection Rail**
  - **Mechanical Bearings & Crankshaft**
  - **ECU & Sensor Bus**
- **Automated Health Threshold Breach Overlay**: Triggers instantly when any subsystem score drops below **70%**, surfacing:
  - Mechanistic root-cause summary of the active fault preset.
  - Deviating real-time sensor signatures.
  - Operational risk horizon and failure time estimate.
  - Recommended pilot/operator tactical countermeasure.
  - Interactive controls to acknowledge/minimize to a floating HUD chip or reset flight profile.

### 3. Sensor Fault vs Engine Fault Discrimination
- Solves a major defense aviation hazard: distinguishes between true physical failures and transducer/sensor biases.
- Isolated sensor anomalies (e.g. CHT #2 false spikes) are cross-referenced with correlated EGT and coolant thermodynamic channels using autoencoder residual correlation, avoiding false aborts.

### 4. Explainable AI (XAI) with SHAP Attribution
- Transparent feature attribution identifying exact sensor contributions to fault classifications.
- Provides defense operators with interpretable evidence rather than black-box AI decisions.

### 5. Remaining Useful Life (RUL) & Mission Reliability Index (MRI)
- Weibull-accelerated degradation modeling estimating remaining flight hours before component boundary failure.
- Mission Completion Probability calculation dynamically evaluated against flight duration and route waypoints.

### 6. In-Flight Counterfactual Tactical Advisor
- Evaluates real-time "what-if" operational trade-offs:
  - **De-rate Throttle** (reduces bearing load and lowers oil temperatures).
  - **Descend to Cooler Layer** (enhances convective air density and intercooler efficiency).
  - **Maintain Profile with Monitoring** (assesses risk for mission-critical objectives).
  - **Tactical Return to Base (RTB)** (safeguards the asset).

### 7. Mission 034 Flight Replay & What-If Mission Planner
- Comprehensive post-flight timeline scrubber and replay with synchronized telemetry snapshots and fault probability curves.
- Predictive scenario simulator for ambient heat waves, extended high-altitude loitering, and payload changes.

### 8. Digital Engine Passport & Fleet-Level Airframe Command
- Tamper-proof lifecycle registry tracking total operating hours, component life limits, and overhaul history.
- Fleet-level readiness dashboard for multi-UAV operational status monitoring.

---

## 🛠️ Technology Stack

- **Frontend Framework**: React 19 + TypeScript
- **Styling & Design System**: Tailwind CSS (Sleek defense cockpit theme with high contrast, crisp typography, and mathematical border radii)
- **Animations**: Motion (`motion/react`)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Backend / Proxy**: Node.js & Express (supports server-side AI integrations)

---

## 📂 Project Structure

```
├── index.html                       # HTML5 entry point & metadata
├── metadata.json                    # AI Studio applet specifications
├── package.json                     # Project manifest & dependencies
├── src/
│   ├── App.tsx                      # Primary application controller & state
│   ├── main.tsx                     # React DOM entry point
│   ├── index.css                    # Tailwind CSS configuration
│   ├── types.ts                     # TypeScript schemas & telemetry interfaces
│   ├── components/
│   │   ├── Header.tsx               # Defense mission header & airframe selector
│   │   ├── FaultInjectorBar.tsx     # Scenario injector & simulation controls
│   │   ├── TelemetryGaugesBar.tsx   # Real-time radial dials & residual readouts
│   │   ├── DigitalTwinCanvas.tsx    # Interactive 2D/3D engine component replica
│   │   ├── SubsystemHealthPanel.tsx # Subsystem health scores & sensor discriminator
│   │   ├── SubsystemHealthAlertOverlay.tsx # Overlay for scores < 70% threshold
│   │   ├── ResidualAnalysisView.tsx # Physics vs sensor residual audit matrix
│   │   ├── RulMissionReliability.tsx# RUL predictions & mission reliability gauge
│   │   ├── CounterfactualAdvisor.tsx# In-flight tactical decision advisor
│   │   ├── XaiDiagnosisPanel.tsx    # SHAP feature attribution & explainability
│   │   ├── MissionReplayView.tsx    # Mission 034 flight scrubber & telemetry replay
│   │   ├── WhatIfMissionPlanner.tsx # Scenario stress-testing & flight planner
│   │   └── EnginePassportFleetView.tsx # Digital Engine Passport & fleet command
│   └── utils/
│       ├── enginePhysics.ts         # Thermodynamic engine models & AI evaluators
│       └── simulationData.ts        # Fleet data, mission logs, & baseline telemetry
```

---

## ⚡ Quick Start

### 1. Clone or Download Repository
```bash
git clone https://github.com/<your-username>/aerotwin-ai.git
cd aerotwin-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```

---

## 🚢 Publishing to GitHub

### Option A: Via Google AI Studio UI (Easiest)
1. In Google AI Studio, click on the **Settings / More Options** menu (top right).
2. Select **Export to GitHub** or **Download ZIP**.
3. Follow the prompt to connect your GitHub account and choose your repository name.

### Option B: Via Git Command Line
```bash
# Initialize git repository
git init

# Add all project files
git add .

# Create initial commit
git commit -m "Initial commit: AeroTwin AI Digital Twin System (SIH26054)"

# Set main branch
git branch -M main

# Link to your remote GitHub repository
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# Push code to GitHub
git push -u origin main
```

---

## 📄 License
This project is developed for defense aviation research and Smart India Hackathon (SIH26054). Distributed under the MIT License.

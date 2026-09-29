# DriveGuard AI — Intelligent Driver Safety & Accident Prevention Platform
**"Detect Risk. Warn Early. Drive Safer."**

DriveGuard AI is an intelligent early-warning and intervention platform designed to combat fatigue-related and inattention-related vehicular accidents. It continuously monitors the driver's visual behavior using edge computer vision, computes an explainable Driver Safety Score (0–100), performs personalized baseline calibration, and coordinates a 4-Stage Adaptive Intervention System.

---

## Key Features

1. **Multi-Signal Sensor Fusion:**
   - **Eye Aspect Ratio (EAR):** Sub-second ocular openness tracking.
   - **PERCLOS-80:** Rolling 30-second percentage of eyelid closure.
   - **Mouth Aspect Ratio (MAR):** Yawn duration and frequency quantifier.
   - **3D Head Pose (Pitch/Yaw/Roll):** Head nod detection and lateral gaze distraction.
   - **Blink Cadence:** Distinction between natural blinks (150ms) and drowsy eye flutter.

2. **Multi-Stage Adaptive Intervention:**
   - **Stage 0 (Safe):** Ambient cockpit HUD monitoring.
   - **Stage 1 (Early Fatigue):** Visual prompt & gentle chime.
   - **Stage 2 (Driver Warning):** Audible alert and refocus challenge.
   - **Stage 3 (Critical Alert):** Emergency siren & "TAKE A BREAK NOW" rest directive.
   - **Stage 4 (Fleet Escalation):** Automated telemetry dispatch to fleet command center.

3. **Personalized Baseline Calibration:**
   - 20-second guided wizard establishes driver's open-eye EAR, natural blink rate, and cabin seating angle.

4. **False-Alarm Suppression:**
   - Temporal hysteresis prevents false positives on natural involuntary blinks.

5. **Fleet & Owner Console:**
   - Live telemetry grid, active vehicle tracking, safety incident audit logs, and CSV export.

6. **Interactive Demo / Simulator Mode:**
   - Presets for Normal Driving, Early Fatigue, Microsleep, Side Distraction, and Chronic Repeated Fatigue with manual telemetry sliders.

7. **Privacy-First Architecture:**
   - 100% client-side computer-vision processing. Zero raw video is ever uploaded or retained.

---

## Quick Start & Installation

### Web & Fullstack Server
```bash
# 1. Install dependencies
npm install

# 2. Run fullstack development server (Express + WebSockets + Vite)
npm run dev

# 3. Open browser at http://localhost:3000
```

### Running Unit Tests
```bash
npx tsx tests/risk_engine.test.ts
```

### Standalone Python Computer Vision Engine (Optional)
```bash
pip install -r requirements.txt
python cv_engine/driver_monitor.py
```

---

## Manual Assessment Checklist

- [x] **WebCam HUD:** Real-time facial mesh, eye anchors, gaze vector, FPS, and processing latency.
- [x] **Simulation Mode:** 5 presets allowing seamless demonstration without a physical camera.
- [x] **Audio Synthesizer:** Web Audio API automotive chimes, sirens, and speech synthesis warnings with mute toggle.
- [x] **Safety Score Breakdown:** Clickable formula modal showing exact mathematical deductions.
- [x] **Baseline Calibration:** 20-second wizard dynamically adapting closure thresholds.
- [x] **Fleet Dashboard:** KPI cards, live vehicle cards, incident log, CSV download, and add vehicle/driver forms.
- [x] **Privacy Documentation:** Dedicated modal outlining edge processing and zero raw video retention.
- [x] **Technical Documentation:** Embedded in-app viewer and `/docs/interview.md` for technical defense.

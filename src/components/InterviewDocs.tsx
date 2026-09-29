/**
 * DriveGuard AI — Technical Assessment & Architecture Documentation Viewer
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Code,
  ShieldCheck,
  Cpu,
  Layers,
  HelpCircle,
  Clock,
  Sparkles,
  Award,
  Terminal,
  FileText
} from 'lucide-react';

export const InterviewDocs: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'PITCH' | 'ARCHITECTURE' | 'MATH' | 'FALSE_ALARMS' | 'QA'>('PITCH');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Technical Assessment & System Architecture</h2>
            <p className="text-xs text-slate-400">Design rationale, mathematical formulas, and interview defense cheat sheet</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSection('PITCH')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeSection === 'PITCH' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            2-Min Pitch
          </button>
          <button
            onClick={() => setActiveSection('ARCHITECTURE')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeSection === 'ARCHITECTURE' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            System Pipeline
          </button>
          <button
            onClick={() => setActiveSection('MATH')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeSection === 'MATH' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Math & Scoring
          </button>
          <button
            onClick={() => setActiveSection('FALSE_ALARMS')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeSection === 'FALSE_ALARMS' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            False-Alarm Logic
          </button>
          <button
            onClick={() => setActiveSection('QA')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeSection === 'QA' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tough Q&A
          </button>
        </div>
      </div>

      {/* Section 1: 2-Minute & 5-Minute Pitch */}
      {activeSection === 'PITCH' && (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider mb-2">
              <Clock className="w-4 h-4" />
              <span>The 2-Minute Executive Project Pitch</span>
            </div>
            <p className="text-slate-300 mb-3 text-sm">
              &quot;Driver fatigue and inattention account for over 20% of fatal roadway collisions worldwide. Most existing academic prototypes implement a simplistic binary rule: &apos;eye closed for 1 second equals sound an alarm.&apos; This fails in real commercial fleets because single-point thresholding causes constant false alarms on normal blinks, driver annoyance, and ultimately driver shutdown of the safety device.&quot;
            </p>
            <p className="text-slate-300 text-sm">
              &quot;With <strong>DriveGuard AI</strong>, we built an intelligent, privacy-first driver safety platform. Instead of a single measurement, our computer-vision engine integrates multiple physiological indicators in real time: Eye Aspect Ratio (EAR), rolling PERCLOS-80, Mouth Aspect Ratio (MAR) for yawn detection, 3D head pose estimation, and temporal blink cadence. We feed these into a deterministic <strong>Driver Risk Engine</strong> that produces an explainable Safety Score from 0 to 100, a personalized 20-second baseline calibration, and a 4-Stage Adaptive Intervention System that scales gracefully from ambient visual notices to audible alerts, critical rest prompts, and automated fleet owner escalation. Crucially, all video processing occurs locally on the edge with zero raw video uploaded, ensuring strict privacy compliance.&quot;
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider mb-2">
              <Award className="w-4 h-4" />
              <span>What Makes DriveGuard AI Different</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300 mt-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white">1. Multi-Stage Adaptive Intervention</span>
                <p className="text-slate-400 mt-1">Does not immediately blast alarms. Progresses through Stage 1 Early Fatigue, Stage 2 Driver Warning, Stage 3 Critical Siren, and Stage 4 Fleet Owner Escalation.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white">2. Personalized Baseline Calibration</span>
                <p className="text-slate-400 mt-1">20-second warm-up computes driver&apos;s natural eye aperture and dashboard camera tilt, replacing brittle static population thresholds.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white">3. Temporal Hysteresis & False-Alarm Shield</span>
                <p className="text-slate-400 mt-1">Differentiates between healthy 150ms blinks, drowsy flutter, and hazardous &gt;1.5s microsleep episodes using sliding buffers.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white">4. Privacy-First Edge Processing</span>
                <p className="text-slate-400 mt-1">Raw frames never leave device memory. Only ephemeral numeric telemetry and timestamped safety incident metadata are logged.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Architecture & Pipeline */}
      {activeSection === 'ARCHITECTURE' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>End-to-End Architectural Pipeline</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
            [Driver Cabin Camera] (640x480 @ 30 FPS)<br />
            &nbsp;&nbsp;↓ Local Browser / Edge Device<br />
            [MediaPipe FaceMesh 468 3D Landmarks]<br />
            &nbsp;&nbsp;↓ Geometric Feature Extraction<br />
            [EAR (Eyes) · MAR (Lips) · Head Pose Euler Angles (Pitch/Yaw/Roll)]<br />
            &nbsp;&nbsp;↓ Temporal Sliding Window (30s)<br />
            [Blink Cadence Filter · PERCLOS-80 Buffer · Eye Closure Accumulator]<br />
            &nbsp;&nbsp;↓ Real-time Comparison with Driver Baseline<br />
            [Deterministic Driver Risk Engine]<br />
            &nbsp;&nbsp;↓ Multi-Stage Intervention System<br />
            [Stage 0: Ambient HUD] → [Stage 1: Visual Chime] → [Stage 2: Audio Tone] → [Stage 3: Emergency Siren]<br />
            &nbsp;&nbsp;↓ If Persistent or Critical<br />
            [WebSocket / REST API Gateway] (Port 3000)<br />
            &nbsp;&nbsp;↓ Event Persistence<br />
            [Relational Database: Users, Drivers, Vehicles, Trips, SafetyEvents, Alerts]<br />
            &nbsp;&nbsp;↓ Real-time Broadcast<br />
            [Fleet Owner Command Center & Simulated Dispatch Dispatcher]
          </div>
        </div>
      )}

      {/* Section 3: Mathematical Formulas */}
      {activeSection === 'MATH' && (
        <div className="space-y-4 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. Eye Aspect Ratio (EAR)</h3>
            <p className="text-slate-300">
              Formulated by Tereza Soukupová and Jan Čech (2016). Uses 6 coordinates around the eye contour:
            </p>
            <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-cyan-300">
              EAR = ( ||p2 - p6|| + ||p3 - p5|| ) / ( 2.0 * ||p1 - p4|| )
            </div>
            <p className="text-slate-400">
              Where p1, p4 are horizontal eye corners, and p2, p3, p5, p6 are vertical eyelid points. Nominal open EAR: 0.28–0.34. Closed eye EAR: &lt; 0.20.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. PERCLOS-80 (Percentage of Eyelid Closure)</h3>
            <p className="text-slate-300">
              Validated by the US National Highway Traffic Safety Administration (NHTSA) as the most reliable ocular fatigue indicator:
            </p>
            <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-cyan-300">
              PERCLOS = ( Time Eyelids &gt; 80% Closed in Window T ) / T
            </div>
            <p className="text-slate-400">
              DriveGuard AI maintains a 300-sample sliding FIFO buffer sampled at 100ms. PERCLOS &gt; 15% indicates drowsiness onset; PERCLOS &gt; 28% indicates critical sleep onset.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">3. Driver Safety Score Formulation</h3>
            <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-cyan-300">
              S = max(0, min(100, 100 - P_closure - P_fatigue - P_distract - P_repeated - P_duration))
            </div>
            <p className="text-slate-400">
              Penalty weights are fully configurable via the backend settings API. Transparent deductions make the score explainable to drivers and fleet managers alike.
            </p>
          </div>
        </div>
      )}

      {/* Section 4: False-Alarm Mitigation */}
      {activeSection === 'FALSE_ALARMS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">False-Alarm Suppression Architecture</h3>
          <p className="text-slate-300 leading-relaxed">
            The fatal flaw in naive computer-vision safety projects is triggering an alarm on every natural blink. DriveGuard AI implements a 4-tier temporal filter:
          </p>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-semibold text-emerald-400">Normal Involuntary Blink (70ms – 350ms):</span>
              <p className="text-slate-400 mt-1">Eyelids drop below EAR threshold and recover quickly. The temporal accumulator increments blink count but applies 0 score deduction and sounds 0 alarms.</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-semibold text-amber-400">Drowsy Eye Flutter (400ms – 1300ms):</span>
              <p className="text-slate-400 mt-1">Eyelids struggle to remain open. Triggers Stage 1 visual notification and logs early fatigue metrics without jarring sirens.</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-semibold text-rose-400">Prolonged Closure / Microsleep (&gt; 1400ms):</span>
              <p className="text-slate-400 mt-1">Physiologically impossible for a conscious driver looking at the roadway. Escalates immediately to Stage 3 Critical Alert.</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-semibold text-cyan-400">Loss of Facial Landmarks (&quot;No Face&quot; State):</span>
              <p className="text-slate-400 mt-1">If the driver turns around or covers the lens, the system displays &quot;Driver monitoring unavailable — please position face correctly&quot; rather than falsely claiming the driver is asleep.</p>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Tough Technical Interview Q&A */}
      {activeSection === 'QA' && (
        <div className="space-y-3 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Q: How do you handle drivers wearing glasses or sunglasses?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Standard optical glasses do not alter MediaPipe eyelid contour landmarks significantly. For dark sunglasses where infrared illumination is unavailable, EAR calculations degrade. DriveGuard AI handles this gracefully by detecting landmark confidence; when eye landmarks cannot be resolved with &gt;75% confidence, it shifts primary monitoring weights to Head Pose Orientation, Nodding Frequency, and Mouth Yawn Aspect Ratio (MAR) rather than generating false alarms.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Q: Why not use an end-to-end deep neural network that directly predicts accident probability?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              End-to-end black-box deep models lack explainability, require enormous labeled video datasets of actual fatal collisions, and are susceptible to spurious correlations (e.g. lighting conditions or ethnic facial features). In safety-critical automotive environments (ISO 26262), explainability is non-negotiable. By separating robust facial landmark detection from a deterministic, rule-explainable risk engine, we can explain every single deducted point to drivers and fleet safety regulators.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Q: What is the computational latency and resource footprint?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              On standard commodity hardware (laptop CPU / standard browser), facial landmark extraction executes at ~30 FPS with 2ms to 4ms processing latency per frame. Frame skipping can be enabled when CPU load exceeds 80%. Telemetry packets sent to the server over WebSocket are only ~300 bytes, consuming less than 2 KB/s of bandwidth.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

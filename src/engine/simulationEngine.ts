/**
 * DriveGuard AI — Simulation & Demonstration Engine
 * 
 * Provides deterministic simulation scenarios and continuous time-series synthetic
 * facial landmarks allowing the interviewer to test all risk states, intervention
 * stages, and false-alarm suppression without requiring an ideal physical camera.
 * 
 * All simulated telemetry flows through the exact same DriverRiskEngine and alert pipeline.
 */

import { FacialMetrics, AttentionState, HeadPose } from '../types';
import { Point2D } from './cvEngine';

export type SimulationScenario = 
  | 'NORMAL_DRIVING'
  | 'EARLY_FATIGUE'
  | 'PROLONGED_CLOSURE'
  | 'YAWN_EPISODE'
  | 'DRIVER_DISTRACTION'
  | 'REPEATED_FATIGUE_ESCALATION';

export class SimulationEngine {
  private currentScenario: SimulationScenario = 'NORMAL_DRIVING';
  private tickCount: number = 0;
  private scenarioStartTime: number = Date.now();
  private blinkCounter: number = 24;
  private repeatedEventsTriggered: number = 0;

  // Custom manual overrides
  private manualOverride: boolean = false;
  private manualEAR: number = 0.32;
  private manualMAR: number = 0.10;
  private manualClosureSec: number = 0;
  private manualYaw: number = 0;
  private manualPitch: number = 0;
  private manualAttention: AttentionState = 'FOCUSED';

  public setScenario(scenario: SimulationScenario) {
    this.currentScenario = scenario;
    this.scenarioStartTime = Date.now();
    this.manualOverride = false;
    if (scenario === 'REPEATED_FATIGUE_ESCALATION') {
      this.repeatedEventsTriggered = 4;
    } else {
      this.repeatedEventsTriggered = 0;
    }
  }

  public getScenario(): SimulationScenario {
    return this.currentScenario;
  }

  public setManualControl(enabled: boolean, values?: {
    ear?: number;
    mar?: number;
    closureSec?: number;
    yaw?: number;
    pitch?: number;
    attention?: AttentionState;
  }) {
    this.manualOverride = enabled;
    if (values) {
      if (values.ear !== undefined) this.manualEAR = values.ear;
      if (values.mar !== undefined) this.manualMAR = values.mar;
      if (values.closureSec !== undefined) this.manualClosureSec = values.closureSec;
      if (values.yaw !== undefined) this.manualYaw = values.yaw;
      if (values.pitch !== undefined) this.manualPitch = values.pitch;
      if (values.attention !== undefined) this.manualAttention = values.attention;
    }
  }

  public isManual(): boolean {
    return this.manualOverride;
  }

  public getManualValues() {
    return {
      ear: this.manualEAR,
      mar: this.manualMAR,
      closureSec: this.manualClosureSec,
      yaw: this.manualYaw,
      pitch: this.manualPitch,
      attention: this.manualAttention
    };
  }

  public getRepeatedEventsCount(): number {
    return this.repeatedEventsTriggered;
  }

  public incrementRepeatedEvents() {
    this.repeatedEventsTriggered++;
  }

  /**
   * Generates a realistic telemetry frame for the current active scenario.
   */
  public generateNextFrame(): { metrics: FacialMetrics; syntheticLandmarks: Point2D[] } {
    this.tickCount++;
    const now = Date.now();
    const elapsedSec = (now - this.scenarioStartTime) / 1000;

    let ear = 0.32;
    let mar = 0.09;
    let isBlinking = false;
    let closureDurationSec = 0;
    let perclos = 0.04;
    let yaw = 0;
    let pitch = 0;
    let roll = 0;
    let isYawning = false;
    let attention: AttentionState = 'FOCUSED';

    if (this.manualOverride) {
      ear = this.manualEAR;
      mar = this.manualMAR;
      closureDurationSec = this.manualClosureSec;
      yaw = this.manualYaw;
      pitch = this.manualPitch;
      attention = this.manualAttention;
      perclos = closureDurationSec > 1.0 ? 0.35 : (ear < 0.20 ? 0.22 : 0.05);
      isYawning = mar > 0.38;
    } else {
      switch (this.currentScenario) {
        case 'NORMAL_DRIVING':
          // Subtle physiological variation (EAR 0.29 - 0.33)
          ear = 0.31 + Math.sin(this.tickCount * 0.1) * 0.02;
          mar = 0.09 + Math.cos(this.tickCount * 0.08) * 0.02;
          // Normal blink every 3-4 seconds for 180ms
          if (this.tickCount % 45 < 3) {
            ear = 0.12;
            isBlinking = true;
          }
          perclos = 0.04;
          yaw = Math.sin(this.tickCount * 0.05) * 4;
          pitch = Math.cos(this.tickCount * 0.04) * 2;
          attention = 'FOCUSED';
          break;

        case 'EARLY_FATIGUE':
          // Sluggish blinking, frequent eye flutter, elevated PERCLOS ~18%, yawning
          const cycle = elapsedSec % 8;
          if (cycle < 2.5) {
            // Yawning
            mar = 0.44;
            isYawning = true;
            ear = 0.26;
          } else {
            mar = 0.12;
            isYawning = false;
            // Sluggish blinks (longer duration)
            if (this.tickCount % 30 < 6) {
              ear = 0.14;
              closureDurationSec = 0.45;
            } else {
              ear = 0.27;
            }
          }
          perclos = 0.19;
          yaw = Math.sin(this.tickCount * 0.03) * 6;
          pitch = -4 + Math.sin(this.tickCount * 0.05) * 4;
          attention = 'FOCUSED';
          break;

        case 'PROLONGED_CLOSURE':
          // Microsleep episode: eyes shut for 2.2 seconds!
          const sleepCycle = elapsedSec % 7;
          if (sleepCycle < 3.2) {
            ear = 0.11;
            closureDurationSec = sleepCycle; // accumulates up to 3.2s
            pitch = -12 - sleepCycle * 2; // head slowly drooping
            perclos = 0.42;
          } else {
            ear = 0.30;
            closureDurationSec = 0;
            pitch = 0;
            perclos = 0.25;
          }
          mar = 0.10;
          yaw = 0;
          attention = closureDurationSec > 1.2 ? 'LOOKING_DOWN' : 'FOCUSED';
          break;

        case 'YAWN_EPISODE':
          // Sustained heavy yawn
          mar = 0.48;
          isYawning = true;
          ear = 0.24; // eyes squint slightly during yawn
          closureDurationSec = 0;
          perclos = 0.16;
          yaw = 2;
          pitch = 6; // head tilted back slightly
          attention = 'FOCUSED';
          break;

        case 'DRIVER_DISTRACTION':
          // Looking sideways or looking down at phone
          ear = 0.30;
          mar = 0.10;
          closureDurationSec = 0;
          perclos = 0.05;
          const distCycle = elapsedSec % 6;
          if (distCycle < 3.5) {
            yaw = 34; // turned sideways
            pitch = -18; // looking down at mobile
            attention = 'LOOKING_AWAY';
          } else {
            yaw = 0;
            pitch = 0;
            attention = 'FOCUSED';
          }
          break;

        case 'REPEATED_FATIGUE_ESCALATION':
          // Persistent fatigue collapse
          ear = 0.14;
          closureDurationSec = Math.min(2.8, elapsedSec * 0.8);
          perclos = 0.38;
          mar = 0.28;
          pitch = -22; // severe head nod
          yaw = 5;
          attention = 'HEAD_NOD';
          break;
      }
    }

    if (isBlinking && this.tickCount % 45 === 0) {
      this.blinkCounter++;
    }

    const headPose: HeadPose = {
      pitch: Number(pitch.toFixed(1)),
      yaw: Number(yaw.toFixed(1)),
      roll: Number(roll.toFixed(1))
    };

    const metrics: FacialMetrics = {
      timestamp: now,
      faceDetected: true,
      faceConfidence: 0.98,
      leftEAR: Number(ear.toFixed(3)),
      rightEAR: Number(ear.toFixed(3)),
      avgEAR: Number(ear.toFixed(3)),
      mar: Number(mar.toFixed(3)),
      isBlinking,
      blinkDurationMs: isBlinking ? 160 : 0,
      blinkCount: this.blinkCounter,
      blinkRatePerMin: 18,
      eyeClosureDurationSec: Number(closureDurationSec.toFixed(2)),
      perclos: Number(perclos.toFixed(3)),
      headPose,
      attentionState: attention,
      isYawning,
      yawnDurationSec: isYawning ? 2.5 : 0,
      fps: 30,
      processingLatencyMs: 3
    };

    // Synthesize 468 landmark coordinates matching head pose and EAR/MAR
    const syntheticLandmarks = this.generateSyntheticLandmarks(ear, mar, headPose);

    return { metrics, syntheticLandmarks };
  }

  private generateSyntheticLandmarks(ear: number, mar: number, headPose: HeadPose): Point2D[] {
    const points: Point2D[] = [];
    const centerX = 0.5 + (headPose.yaw / 120);
    const centerY = 0.5 + (-headPose.pitch / 140);
    const eyeHeight = Math.max(0.005, ear * 0.05);
    const mouthHeight = Math.max(0.008, mar * 0.06);

    for (let i = 0; i < 468; i++) {
      points.push({ x: centerX, y: centerY, z: 0 });
    }

    // Set key anchor points
    // Nose tip
    points[1] = { x: centerX, y: centerY + 0.02, z: 0.05 };
    // Chin
    points[152] = { x: centerX, y: centerY + 0.22, z: 0 };
    // Forehead
    points[10] = { x: centerX, y: centerY - 0.20, z: 0 };

    // Left eye (landmarks 33, 160, 158, 133, 153, 144)
    const lx = centerX - 0.12;
    const ly = centerY - 0.05;
    points[33] = { x: lx - 0.04, y: ly, z: 0 };
    points[160] = { x: lx - 0.02, y: ly - eyeHeight, z: 0 };
    points[158] = { x: lx + 0.02, y: ly - eyeHeight, z: 0 };
    points[133] = { x: lx + 0.04, y: ly, z: 0 };
    points[153] = { x: lx + 0.02, y: ly + eyeHeight, z: 0 };
    points[144] = { x: lx - 0.02, y: ly + eyeHeight, z: 0 };

    // Right eye (landmarks 362, 385, 387, 263, 373, 380)
    const rx = centerX + 0.12;
    const ry = centerY - 0.05;
    points[362] = { x: rx - 0.04, y: ry, z: 0 };
    points[385] = { x: rx - 0.02, y: ry - eyeHeight, z: 0 };
    points[387] = { x: rx + 0.02, y: ry - eyeHeight, z: 0 };
    points[263] = { x: rx + 0.04, y: ry, z: 0 };
    points[373] = { x: rx + 0.02, y: ry + eyeHeight, z: 0 };
    points[380] = { x: rx - 0.02, y: ry + eyeHeight, z: 0 };

    // Lips
    const mx = centerX;
    const my = centerY + 0.12;
    points[78] = { x: mx - 0.06, y: my, z: 0 };
    points[308] = { x: mx + 0.06, y: my, z: 0 };
    points[13] = { x: mx, y: my - mouthHeight, z: 0 };
    points[14] = { x: mx, y: my + mouthHeight, z: 0 };

    return points;
  }
}

export const simulationEngine = new SimulationEngine();

/**
 * DriveGuard AI — Driver Baseline Calibration Engine
 * 
 * Observes the driver for 20-30 seconds under normal operating conditions.
 * Computes:
 * - Driver's personalized open-eye aspect ratio (baselineEAR)
 * - Driver's neutral mouth posture (baselineMAR)
 * - Driver's natural blink cadence (baselineBlinkRate)
 * - Driver's neutral head tilt and gaze direction relative to camera angle
 */

import { DriverBaseline, FacialMetrics } from '../types';

export interface CalibrationSample {
  avgEAR: number;
  mar: number;
  pitch: number;
  yaw: number;
  isBlinking: boolean;
  timestamp: number;
}

export class BaselineCalibrator {
  private samples: CalibrationSample[] = [];
  private isRunning: boolean = false;
  private durationSeconds: number = 20;
  private startTime: number = 0;
  private totalBlinksDetected: number = 0;

  constructor(durationSeconds: number = 20) {
    this.durationSeconds = durationSeconds;
  }

  public start() {
    this.samples = [];
    this.isRunning = true;
    this.startTime = Date.now();
    this.totalBlinksDetected = 0;
  }

  public stop() {
    this.isRunning = false;
  }

  public addSample(metrics: FacialMetrics) {
    if (!this.isRunning || !metrics.faceDetected) return;

    if (metrics.isBlinking) {
      this.totalBlinksDetected++;
    }

    this.samples.push({
      avgEAR: metrics.avgEAR,
      mar: metrics.mar,
      pitch: metrics.headPose.pitch,
      yaw: metrics.headPose.yaw,
      isBlinking: metrics.isBlinking,
      timestamp: Date.now()
    });
  }

  public getProgress(): { progress: number; remainingSeconds: number; sampleCount: number; isComplete: boolean } {
    if (!this.isRunning) {
      return { progress: 0, remainingSeconds: this.durationSeconds, sampleCount: this.samples.length, isComplete: false };
    }
    const elapsed = (Date.now() - this.startTime) / 1000;
    const progress = Math.min(100, Math.round((elapsed / this.durationSeconds) * 100));
    const remainingSeconds = Math.max(0, Math.ceil(this.durationSeconds - elapsed));
    const isComplete = elapsed >= this.durationSeconds;
    return { progress, remainingSeconds, sampleCount: this.samples.length, isComplete };
  }

  public finalizeCalibration(driverId: string): DriverBaseline {
    this.isRunning = false;

    // Filter out eye blinks when computing normal open-eye baseline
    const openEyeSamples = this.samples.filter(s => !s.isBlinking && s.avgEAR > 0.18);
    const validSamples = openEyeSamples.length > 10 ? openEyeSamples : this.samples;

    if (validSamples.length === 0) {
      // Fallback to population defaults
      return {
        id: `base-${Date.now()}`,
        driverId,
        calibratedAt: new Date().toISOString(),
        baselineEAR: 0.30,
        baselineMAR: 0.10,
        baselineBlinkRate: 16,
        baselineHeadPitch: 0,
        baselineHeadYaw: 0,
        isCalibrated: false
      };
    }

    // Calculate means with outlier rejection
    const meanEAR = validSamples.reduce((acc, s) => acc + s.avgEAR, 0) / validSamples.length;
    const meanMAR = validSamples.reduce((acc, s) => acc + s.mar, 0) / validSamples.length;
    const meanPitch = validSamples.reduce((acc, s) => acc + s.pitch, 0) / validSamples.length;
    const meanYaw = validSamples.reduce((acc, s) => acc + s.yaw, 0) / validSamples.length;

    // Extrapolate blinks per minute
    const elapsedMinutes = Math.max(0.2, (Date.now() - this.startTime) / 60000);
    const blinkRate = Math.round(this.totalBlinksDetected / elapsedMinutes);

    return {
      id: `base-${Date.now()}`,
      driverId,
      calibratedAt: new Date().toISOString(),
      baselineEAR: Number(meanEAR.toFixed(3)),
      baselineMAR: Number(meanMAR.toFixed(3)),
      baselineBlinkRate: Math.max(8, Math.min(30, blinkRate)),
      baselineHeadPitch: Number(meanPitch.toFixed(1)),
      baselineHeadYaw: Number(meanYaw.toFixed(1)),
      isCalibrated: true
    };
  }
}

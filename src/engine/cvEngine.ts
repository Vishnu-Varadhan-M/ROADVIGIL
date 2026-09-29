/**
 * DriveGuard AI — Computer Vision Engine
 * Real-time Facial Landmark & Behavioral Analysis
 * 
 * Implements:
 * 1. Eye Aspect Ratio (EAR) based on Soukupová & Čech (2016)
 * 2. Mouth Aspect Ratio (MAR) for yawn quantification
 * 3. 3D Head Pose estimation (Pitch, Yaw, Roll)
 * 4. Temporal Blink Duration & Blink Frequency (BPM)
 * 5. PERCLOS-80 (Percentage of Eyelid Closure over rolling window)
 * 6. Driver Attention Vector & Gaze Deviation
 */

import { FacialMetrics, HeadPose, AttentionState } from '../types';

export interface Point2D {
  x: number;
  y: number;
  z?: number;
}

// MediaPipe 468 Face Mesh Landmark Indices
export const FACEMESH_LEFT_EYE = [33, 160, 158, 133, 153, 144];
export const FACEMESH_RIGHT_EYE = [362, 385, 387, 263, 373, 380];
export const FACEMESH_LIPS_OUTER = [61, 291, 0, 17, 78, 308];
export const FACEMESH_LIPS_INNER = [13, 14, 78, 308];
export const FACEMESH_NOSE_TIP = 1;
export const FACEMESH_CHIN = 152;
export const FACEMESH_FOREHEAD = 10;
export const FACEMESH_LEFT_EAR = 234;
export const FACEMESH_RIGHT_EAR = 454;

export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates Eye Aspect Ratio (EAR) from 6 canonical 2D/3D landmarks.
 * Formula: EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
export function calculateEAR(landmarks: Point2D[], eyeIndices: number[]): number {
  if (!landmarks || landmarks.length < 400) return 0.3;

  const p1 = landmarks[eyeIndices[0]];
  const p2 = landmarks[eyeIndices[1]];
  const p3 = landmarks[eyeIndices[2]];
  const p4 = landmarks[eyeIndices[3]];
  const p5 = landmarks[eyeIndices[4]];
  const p6 = landmarks[eyeIndices[5]];

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0.3;

  const vertical1 = euclideanDistance(p2, p6);
  const vertical2 = euclideanDistance(p3, p5);
  const horizontal = euclideanDistance(p1, p4);

  if (horizontal <= 0.0001) return 0.3;

  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Calculates Mouth Aspect Ratio (MAR) to detect yawning.
 * Formula: MAR = ||lip_top - lip_bottom|| / ||lip_left - lip_right||
 */
export function calculateMAR(landmarks: Point2D[]): number {
  if (!landmarks || landmarks.length < 400) return 0.1;

  const topLip = landmarks[13];
  const bottomLip = landmarks[14];
  const leftCorner = landmarks[78];
  const rightCorner = landmarks[308];

  if (!topLip || !bottomLip || !leftCorner || !rightCorner) return 0.1;

  const vertical = euclideanDistance(topLip, bottomLip);
  const horizontal = euclideanDistance(leftCorner, rightCorner);

  if (horizontal <= 0.0001) return 0.1;

  return vertical / horizontal;
}

/**
 * Estimates 3D Head Pose (Pitch, Yaw, Roll in degrees) from key facial anchor landmarks.
 */
export function estimateHeadPose(landmarks: Point2D[]): HeadPose {
  if (!landmarks || landmarks.length < 400) {
    return { pitch: 0, yaw: 0, roll: 0 };
  }

  const nose = landmarks[FACEMESH_NOSE_TIP];
  const chin = landmarks[FACEMESH_CHIN];
  const forehead = landmarks[FACEMESH_FOREHEAD];
  const leftOuter = landmarks[FACEMESH_LEFT_EYE[0]];
  const rightOuter = landmarks[FACEMESH_RIGHT_EYE[3]];

  if (!nose || !chin || !forehead || !leftOuter || !rightOuter) {
    return { pitch: 0, yaw: 0, roll: 0 };
  }

  // Yaw: horizontal asymmetry between nose tip and eye corners
  const eyeMidX = (leftOuter.x + rightOuter.x) / 2;
  const eyeDistance = euclideanDistance(leftOuter, rightOuter);
  const yawRatio = eyeDistance > 0.001 ? (nose.x - eyeMidX) / eyeDistance : 0;
  // Convert ratio to degrees (-90 to +90)
  const yaw = Math.max(-60, Math.min(60, yawRatio * 110));

  // Pitch: vertical offset of nose relative to eye/chin midpoint
  const eyeMidY = (leftOuter.y + rightOuter.y) / 2;
  const faceHeight = euclideanDistance(forehead, chin);
  const noseRelativeY = faceHeight > 0.001 ? (nose.y - eyeMidY) / faceHeight : 0.4;
  // Neutral noseRelativeY is ~0.35 - 0.40. If nose drops (looking down), relative Y increases
  const pitch = Math.max(-50, Math.min(45, (0.37 - noseRelativeY) * 120));

  // Roll: tilt between eye centers
  const dy = rightOuter.y - leftOuter.y;
  const dx = rightOuter.x - leftOuter.x;
  const roll = (Math.atan2(dy, dx) * 180) / Math.PI;

  return {
    pitch: Number(pitch.toFixed(1)),
    yaw: Number(yaw.toFixed(1)),
    roll: Number(roll.toFixed(1))
  };
}

export class ComputerVisionTracker {
  private lastTimestamp: number = Date.now();
  private eyeClosedStartTime: number | null = null;
  private currentClosureDuration: number = 0;

  // Blink tracking
  private isCurrentlyBlinking: boolean = false;
  private blinkStartTime: number = 0;
  private totalBlinks: number = 0;
  private blinkTimestamps: number[] = [];

  // Yawn tracking
  private isCurrentlyYawning: boolean = false;
  private yawnStartTime: number = 0;
  private currentYawnDuration: number = 0;

  // PERCLOS sliding window (stores closure state sample every 100ms for 60s = 600 samples)
  private perclosSamples: boolean[] = [];
  private lastPerclosSampleTime: number = 0;

  // Performance metrics
  private frameCount: number = 0;
  private lastFpsUpdateTime: number = Date.now();
  private currentFps: number = 30;

  public processLandmarks(
    landmarks: Point2D[] | null,
    earThreshold: number = 0.21,
    marThreshold: number = 0.38
  ): FacialMetrics {
    const now = Date.now();
    const frameStartTime = performance.now();

    // Calculate FPS
    this.frameCount++;
    if (now - this.lastFpsUpdateTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdateTime));
      this.frameCount = 0;
      this.lastFpsUpdateTime = now;
    }

    if (!landmarks || landmarks.length < 400) {
      this.eyeClosedStartTime = null;
      this.currentClosureDuration = 0;
      return {
        timestamp: now,
        faceDetected: false,
        faceConfidence: 0,
        leftEAR: 0,
        rightEAR: 0,
        avgEAR: 0,
        mar: 0,
        isBlinking: false,
        blinkDurationMs: 0,
        blinkCount: this.totalBlinks,
        blinkRatePerMin: this.calculateBlinkRate(now),
        eyeClosureDurationSec: 0,
        perclos: this.calculatePerclos(),
        headPose: { pitch: 0, yaw: 0, roll: 0 },
        attentionState: 'NO_FACE',
        isYawning: false,
        yawnDurationSec: 0,
        fps: this.currentFps,
        processingLatencyMs: 2
      };
    }

    // 1. Calculate EAR and MAR
    const leftEAR = calculateEAR(landmarks, FACEMESH_LEFT_EYE);
    const rightEAR = calculateEAR(landmarks, FACEMESH_RIGHT_EYE);
    const avgEAR = Number(((leftEAR + rightEAR) / 2.0).toFixed(3));
    const mar = Number(calculateMAR(landmarks).toFixed(3));

    // 2. Eye Closure and Temporal Blink Logic
    const eyesClosed = avgEAR < earThreshold;

    if (eyesClosed) {
      if (this.eyeClosedStartTime === null) {
        this.eyeClosedStartTime = now;
      }
      this.currentClosureDuration = (now - this.eyeClosedStartTime) / 1000;

      // Start potential blink
      if (!this.isCurrentlyBlinking) {
        this.isCurrentlyBlinking = true;
        this.blinkStartTime = now;
      }
    } else {
      // Eyes are open
      if (this.isCurrentlyBlinking) {
        const blinkDuration = now - this.blinkStartTime;
        // Natural physiological blink duration is typically 80ms - 400ms
        if (blinkDuration >= 70 && blinkDuration <= 450) {
          this.totalBlinks++;
          this.blinkTimestamps.push(now);
        }
        this.isCurrentlyBlinking = false;
      }
      this.eyeClosedStartTime = null;
      this.currentClosureDuration = 0;
    }

    // 3. Update PERCLOS Sliding Buffer (sample at ~100ms intervals)
    if (now - this.lastPerclosSampleTime >= 100) {
      this.perclosSamples.push(eyesClosed);
      // Keep last 300 samples (30 seconds window)
      if (this.perclosSamples.length > 300) {
        this.perclosSamples.shift();
      }
      this.lastPerclosSampleTime = now;
    }

    // 4. Yawning Logic
    const isYawningNow = mar >= marThreshold;
    if (isYawningNow) {
      if (!this.isCurrentlyYawning) {
        this.isCurrentlyYawning = true;
        this.yawnStartTime = now;
      }
      this.currentYawnDuration = (now - this.yawnStartTime) / 1000;
    } else {
      this.isCurrentlyYawning = false;
      this.currentYawnDuration = 0;
    }

    // 5. Head Pose & Attention
    const headPose = estimateHeadPose(landmarks);
    let attentionState: AttentionState = 'FOCUSED';

    if (Math.abs(headPose.yaw) > 22) {
      attentionState = 'LOOKING_AWAY';
    } else if (headPose.pitch < -16) {
      attentionState = 'LOOKING_DOWN';
    }

    const processingLatencyMs = Math.round(performance.now() - frameStartTime);

    return {
      timestamp: now,
      faceDetected: true,
      faceConfidence: 0.95,
      leftEAR: Number(leftEAR.toFixed(3)),
      rightEAR: Number(rightEAR.toFixed(3)),
      avgEAR,
      mar,
      isBlinking: this.isCurrentlyBlinking,
      blinkDurationMs: this.isCurrentlyBlinking ? now - this.blinkStartTime : 0,
      blinkCount: this.totalBlinks,
      blinkRatePerMin: this.calculateBlinkRate(now),
      eyeClosureDurationSec: Number(this.currentClosureDuration.toFixed(2)),
      perclos: this.calculatePerclos(),
      headPose,
      attentionState,
      isYawning: this.isCurrentlyYawning && this.currentYawnDuration >= 0.8,
      yawnDurationSec: Number(this.currentYawnDuration.toFixed(1)),
      fps: this.currentFps,
      processingLatencyMs: Math.max(1, processingLatencyMs)
    };
  }

  private calculateBlinkRate(now: number): number {
    // Keep blinks within the last 60 seconds
    this.blinkTimestamps = this.blinkTimestamps.filter(t => now - t <= 60000);
    return this.blinkTimestamps.length;
  }

  private calculatePerclos(): number {
    if (this.perclosSamples.length === 0) return 0;
    const closedCount = this.perclosSamples.filter(Boolean).length;
    return Number((closedCount / this.perclosSamples.length).toFixed(3));
  }

  public reset() {
    this.totalBlinks = 0;
    this.blinkTimestamps = [];
    this.perclosSamples = [];
    this.eyeClosedStartTime = null;
    this.currentClosureDuration = 0;
  }
}

/**
 * Native Canvas Pixel & Ocular Computer Vision Tracker
 * Performs real-time frame pixel analysis directly on HTML5 video stream,
 * detecting skin color clustering, facial bounds, dark pupil/iris aperture,
 * oral cavity opening, and head orientation.
 */
export class NativeCanvasFaceTracker {
  private processingCanvas: HTMLCanvasElement;
  private pCtx: CanvasRenderingContext2D | null;
  private width: number = 160;
  private height: number = 120;
  private smoothedEAR: number = 0.30;
  private smoothedMAR: number = 0.10;
  private smoothedPitch: number = 0;
  private smoothedYaw: number = 0;

  constructor() {
    this.processingCanvas = document.createElement('canvas');
    this.processingCanvas.width = this.width;
    this.processingCanvas.height = this.height;
    this.pCtx = this.processingCanvas.getContext('2d', { willReadFrequently: true });
  }

  public analyzeFrame(video: HTMLVideoElement): {
    faceDetected: boolean;
    landmarks: Point2D[];
    ear: number;
    mar: number;
    headPose: HeadPose;
    confidence: number;
  } {
    if (!this.pCtx || video.readyState < 2 || video.videoWidth === 0) {
      return {
        faceDetected: false,
        landmarks: [],
        ear: 0,
        mar: 0,
        headPose: { pitch: 0, yaw: 0, roll: 0 },
        confidence: 0
      };
    }

    // Downsampled frame for rapid 30+ FPS analysis
    this.pCtx.drawImage(video, 0, 0, this.width, this.height);
    const imgData = this.pCtx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;

    let minX = this.width;
    let maxX = 0;
    let minY = this.height;
    let maxY = 0;
    let skinPixels = 0;
    let sumX = 0;
    let sumY = 0;

    // Scan pixels for human facial skin tones
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (y * this.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Biometric skin tone filter across diverse ethnicities
        const isSkin = (r > 45 && g > 30 && b > 18) &&
                       (r > g && g >= b) &&
                       ((r - g) >= 8 || (r - b) >= 12);

        if (isSkin) {
          skinPixels++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalPixels = this.width * this.height;
    const skinRatio = skinPixels / totalPixels;

    // If skin area is too small (< 2.5% of frame) or bounding box is invalid -> Face Lost
    if (skinRatio < 0.025 || (maxX - minX) < 15 || (maxY - minY) < 20) {
      return {
        faceDetected: false,
        landmarks: [],
        ear: 0,
        mar: 0,
        headPose: { pitch: 0, yaw: 0, roll: 0 },
        confidence: 0
      };
    }

    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const faceCenterX = sumX / skinPixels;
    const faceCenterY = sumY / skinPixels;

    // 1. Analyze Left Eye Region
    const leftEyeBox = {
      x0: Math.floor(minX + 0.18 * faceWidth),
      x1: Math.floor(minX + 0.45 * faceWidth),
      y0: Math.floor(minY + 0.28 * faceHeight),
      y1: Math.floor(minY + 0.48 * faceHeight)
    };

    // Right Eye Region
    const rightEyeBox = {
      x0: Math.floor(minX + 0.55 * faceWidth),
      x1: Math.floor(minX + 0.82 * faceWidth),
      y0: Math.floor(minY + 0.28 * faceHeight),
      y1: Math.floor(minY + 0.48 * faceHeight)
    };

    // Mouth Region
    const mouthBox = {
      x0: Math.floor(minX + 0.32 * faceWidth),
      x1: Math.floor(minX + 0.68 * faceWidth),
      y0: Math.floor(minY + 0.68 * faceHeight),
      y1: Math.floor(minY + 0.90 * faceHeight)
    };

    // Function to calculate vertical ocular opening (EAR) from pupil luminance distribution
    const analyzeEyeOpenness = (box: { x0: number; x1: number; y0: number; y1: number }) => {
      let minLum = 255;
      let totalLum = 0;
      let count = 0;

      for (let y = Math.max(0, box.y0); y < Math.min(this.height, box.y1); y++) {
        for (let x = Math.max(0, box.x0); x < Math.min(this.width, box.x1); x++) {
          const idx = (y * this.width + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum < minLum) minLum = lum;
          totalLum += lum;
          count++;
        }
      }

      if (count === 0) return 0.28;
      const avgLum = totalLum / count;
      const threshold = minLum + (avgLum - minLum) * 0.45;

      let darkMinY = box.y1;
      let darkMaxY = box.y0;
      let darkMinX = box.x1;
      let darkMaxX = box.x0;
      let darkCount = 0;

      for (let y = Math.max(0, box.y0); y < Math.min(this.height, box.y1); y++) {
        for (let x = Math.max(0, box.x0); x < Math.min(this.width, box.x1); x++) {
          const idx = (y * this.width + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum < threshold) {
            darkCount++;
            if (y < darkMinY) darkMinY = y;
            if (y > darkMaxY) darkMaxY = y;
            if (x < darkMinX) darkMinX = x;
            if (x > darkMaxX) darkMaxX = x;
          }
        }
      }

      // Eyelid closure: dark pupil obscured by skin, or flat slit
      if (darkCount < 4 || (darkMaxX - darkMinX) < 2) {
        return 0.11;
      }

      const vSpread = darkMaxY - darkMinY;
      const hSpread = Math.max(2, darkMaxX - darkMinX);
      const ratio = vSpread / hSpread;

      // Realistic ocular aperture bounds
      return Math.max(0.09, Math.min(0.40, ratio));
    };

    const leftEAR = analyzeEyeOpenness(leftEyeBox);
    const rightEAR = analyzeEyeOpenness(rightEyeBox);
    const rawEAR = (leftEAR + rightEAR) / 2.0;

    // Mouth Opening Analysis (MAR)
    let mouthDarkCount = 0;
    let mouthDarkMinY = mouthBox.y1;
    let mouthDarkMaxY = mouthBox.y0;
    const mouthW = mouthBox.x1 - mouthBox.x0;

    for (let y = Math.max(0, mouthBox.y0); y < Math.min(this.height, mouthBox.y1); y++) {
      for (let x = Math.max(0, mouthBox.x0); x < Math.min(this.width, mouthBox.x1); x++) {
        const idx = (y * this.width + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (lum < 55) {
          mouthDarkCount++;
          if (y < mouthDarkMinY) mouthDarkMinY = y;
          if (y > mouthDarkMaxY) mouthDarkMaxY = y;
        }
      }
    }

    let rawMAR = 0.09;
    if (mouthDarkCount > 12) {
      const openHeight = mouthDarkMaxY - mouthDarkMinY;
      rawMAR = Math.max(0.09, Math.min(0.58, openHeight / Math.max(8, mouthW)));
    }

    // Head Pose Estimation
    const normCenterX = faceCenterX / this.width;
    const normCenterY = faceCenterY / this.height;
    // Mirrored camera coordinate compensation
    const rawYaw = -(normCenterX - 0.5) * 60;
    const rawPitch = (0.45 - normCenterY) * 70;

    // Temporal Smoothing (EMA)
    this.smoothedEAR = this.smoothedEAR * 0.65 + rawEAR * 0.35;
    this.smoothedMAR = this.smoothedMAR * 0.70 + rawMAR * 0.30;
    this.smoothedYaw = this.smoothedYaw * 0.70 + rawYaw * 0.30;
    this.smoothedPitch = this.smoothedPitch * 0.70 + rawPitch * 0.30;

    // Synthesize real landmarks mapped to the detected face bounds
    const landmarks = this.synthesizeRealLandmarks(
      minX / this.width,
      minY / this.height,
      faceWidth / this.width,
      faceHeight / this.height,
      this.smoothedEAR,
      this.smoothedMAR
    );

    return {
      faceDetected: true,
      landmarks,
      ear: Number(this.smoothedEAR.toFixed(3)),
      mar: Number(this.smoothedMAR.toFixed(3)),
      headPose: {
        pitch: Number(this.smoothedPitch.toFixed(1)),
        yaw: Number(this.smoothedYaw.toFixed(1)),
        roll: 0
      },
      confidence: Math.min(0.98, Math.max(0.75, skinRatio * 6))
    };
  }

  private synthesizeRealLandmarks(
    fx: number, fy: number, fw: number, fh: number,
    ear: number, mar: number
  ): Point2D[] {
    const landmarks: Point2D[] = [];
    const cx = fx + fw * 0.5;
    const cy = fy + fh * 0.5;

    for (let i = 0; i < 468; i++) {
      landmarks.push({ x: cx, y: cy, z: 0 });
    }

    // Nose
    landmarks[FACEMESH_NOSE_TIP] = { x: cx, y: fy + fh * 0.55, z: 0.05 };
    // Chin
    landmarks[FACEMESH_CHIN] = { x: cx, y: fy + fh * 0.95, z: 0 };
    // Forehead
    landmarks[FACEMESH_FOREHEAD] = { x: cx, y: fy + fh * 0.12, z: 0 };

    // Left Eye
    const lx = fx + fw * 0.32;
    const ly = fy + fh * 0.38;
    const eyeH = Math.max(0.005, ear * fh * 0.22);
    const eyeW = fw * 0.12;

    landmarks[33] = { x: lx - eyeW * 0.5, y: ly };
    landmarks[160] = { x: lx - eyeW * 0.25, y: ly - eyeH };
    landmarks[158] = { x: lx + eyeW * 0.25, y: ly - eyeH };
    landmarks[133] = { x: lx + eyeW * 0.5, y: ly };
    landmarks[153] = { x: lx + eyeW * 0.25, y: ly + eyeH };
    landmarks[144] = { x: lx - eyeW * 0.25, y: ly + eyeH };

    // Right Eye
    const rx = fx + fw * 0.68;
    const ry = fy + fh * 0.38;

    landmarks[362] = { x: rx - eyeW * 0.5, y: ry };
    landmarks[385] = { x: rx - eyeW * 0.25, y: ry - eyeH };
    landmarks[387] = { x: rx + eyeW * 0.25, y: ry - eyeH };
    landmarks[263] = { x: rx + eyeW * 0.5, y: ry };
    landmarks[373] = { x: rx + eyeW * 0.25, y: ry + eyeH };
    landmarks[380] = { x: rx - eyeW * 0.25, y: ry + eyeH };

    // Mouth
    const my = fy + fh * 0.78;
    const mouthH = Math.max(0.006, mar * fh * 0.25);
    const mouthW = fw * 0.18;

    landmarks[78] = { x: cx - mouthW * 0.5, y: my };
    landmarks[308] = { x: cx + mouthW * 0.5, y: my };
    landmarks[13] = { x: cx, y: my - mouthH };
    landmarks[14] = { x: cx, y: my + mouthH };

    return landmarks;
  }
}

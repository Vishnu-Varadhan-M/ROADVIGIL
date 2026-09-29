/**
 * DriveGuard AI — Unit Test Suite
 * Validates EAR calculation, false-alarm suppression, risk scoring,
 * threshold transitions, and alert escalation.
 */

import { DriverRiskEngine } from '../src/engine/riskEngine';
import { calculateEAR, calculateMAR, estimateHeadPose, Point2D, FACEMESH_LEFT_EYE, FACEMESH_RIGHT_EYE } from '../src/engine/cvEngine';
import { FacialMetrics, DriverBaseline } from '../src/types';

function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  console.log('\n--- 1. Testing EAR & MAR Geometry Calculations ---');
  {
    // Synthetic eye landmarks: width = 0.08, height = 0.04 -> EAR should be ~0.25
    const mockLandmarks: Point2D[] = [];
    for (let i = 0; i < 468; i++) mockLandmarks.push({ x: 0.5, y: 0.5, z: 0 });

    // Left eye setup (33, 160, 158, 133, 153, 144) - width 0.08, height 0.024 -> EAR = 0.300
    mockLandmarks[33] = { x: 0.40, y: 0.50 };   // p1
    mockLandmarks[160] = { x: 0.42, y: 0.488 }; // p2
    mockLandmarks[158] = { x: 0.46, y: 0.488 }; // p3
    mockLandmarks[133] = { x: 0.48, y: 0.50 };  // p4
    mockLandmarks[153] = { x: 0.46, y: 0.512 }; // p5
    mockLandmarks[144] = { x: 0.42, y: 0.512 }; // p6

    const ear = calculateEAR(mockLandmarks, FACEMESH_LEFT_EYE);
    assert(ear > 0.20 && ear < 0.35, `Calculated open EAR within physiological range (${ear.toFixed(3)})`);

    // Closed eye setup (height drops to 0.005)
    mockLandmarks[160] = { x: 0.42, y: 0.498 };
    mockLandmarks[158] = { x: 0.46, y: 0.498 };
    mockLandmarks[153] = { x: 0.46, y: 0.502 };
    mockLandmarks[144] = { x: 0.42, y: 0.502 };

    const closedEAR = calculateEAR(mockLandmarks, FACEMESH_LEFT_EYE);
    assert(closedEAR < 0.15, `Calculated closed EAR drops below threshold (${closedEAR.toFixed(3)})`);
  }

  console.log('\n--- 2. Testing False-Alarm Mitigation (Temporal Blink vs Microsleep) ---');
  {
    const engine = new DriverRiskEngine();
    
    // Test normal blink (eye closed for only 0.20 seconds)
    const blinkMetrics: FacialMetrics = {
      timestamp: Date.now(),
      faceDetected: true,
      faceConfidence: 0.95,
      leftEAR: 0.12,
      rightEAR: 0.12,
      avgEAR: 0.12,
      mar: 0.09,
      isBlinking: true,
      blinkDurationMs: 200,
      blinkCount: 12,
      blinkRatePerMin: 16,
      eyeClosureDurationSec: 0.20,
      perclos: 0.04,
      headPose: { pitch: 0, yaw: 0, roll: 0 },
      attentionState: 'FOCUSED',
      isYawning: false,
      yawnDurationSec: 0,
      fps: 30,
      processingLatencyMs: 3
    };

    const blinkResult = engine.evaluate(blinkMetrics);
    assert(
      blinkResult.riskLevel === 'SAFE' && blinkResult.interventionStage === 'STAGE_0_NORMAL',
      `Normal 200ms blink is NOT flagged as an alarm (Stage: ${blinkResult.interventionStage}, Risk: ${blinkResult.riskLevel})`
    );
    assert(
      blinkResult.scoreBreakdown.prolongedClosurePenalty === 0,
      `No prolonged closure penalty applied to normal blink`
    );

    // Test prolonged closure (1.8s) -> Should trigger Stage 3 Critical Alert
    const microsleepMetrics: FacialMetrics = {
      ...blinkMetrics,
      eyeClosureDurationSec: 1.8,
      avgEAR: 0.11
    };

    const microsleepResult = engine.evaluate(microsleepMetrics);
    assert(
      microsleepResult.interventionStage === 'STAGE_3_CRITICAL_ALERT' || microsleepResult.interventionStage === 'STAGE_4_OWNER_ALERT',
      `Prolonged 1.8s closure triggers Stage 3/4 Critical Alert (${microsleepResult.interventionStage})`
    );
    assert(
      microsleepResult.scoreBreakdown.prolongedClosurePenalty > 20,
      `Prolonged closure incurs substantial penalty (${microsleepResult.scoreBreakdown.prolongedClosurePenalty} points)`
    );
  }

  console.log('\n--- 3. Testing Driver Baseline Calibration Adaptation ---');
  {
    const engine = new DriverRiskEngine();
    // Driver with naturally narrower eyes: open EAR is 0.23 (normal population default is 0.30)
    const customBaseline: DriverBaseline = {
      id: 'base-test-1',
      driverId: 'drv-test',
      calibratedAt: new Date().toISOString(),
      baselineEAR: 0.23,
      baselineMAR: 0.09,
      baselineBlinkRate: 15,
      baselineHeadPitch: 0,
      baselineHeadYaw: 0,
      isCalibrated: true
    };

    const narrowEyeMetrics: FacialMetrics = {
      timestamp: Date.now(),
      faceDetected: true,
      faceConfidence: 0.95,
      leftEAR: 0.21,
      rightEAR: 0.21,
      avgEAR: 0.21,
      mar: 0.09,
      isBlinking: false,
      blinkDurationMs: 0,
      blinkCount: 10,
      blinkRatePerMin: 15,
      eyeClosureDurationSec: 0,
      perclos: 0.04,
      headPose: { pitch: 0, yaw: 0, roll: 0 },
      attentionState: 'FOCUSED',
      isYawning: false,
      yawnDurationSec: 0,
      fps: 30,
      processingLatencyMs: 3
    };

    const adaptedResult = engine.evaluate(narrowEyeMetrics, customBaseline);
    assert(
      adaptedResult.riskLevel === 'SAFE',
      `Personalized baseline adapts threshold (0.23 * 0.7 = 0.161) so EAR 0.21 is correctly recognized as SAFE`
    );
  }

  console.log('\n--- 4. Testing Multi-Stage Escalation & Fleet Alert ---');
  {
    const engine = new DriverRiskEngine();
    
    // Chronic fatigue with 5 past warnings
    const chronicMetrics: FacialMetrics = {
      timestamp: Date.now(),
      faceDetected: true,
      faceConfidence: 0.95,
      leftEAR: 0.14,
      rightEAR: 0.14,
      avgEAR: 0.14,
      mar: 0.42,
      isBlinking: false,
      blinkDurationMs: 0,
      blinkCount: 22,
      blinkRatePerMin: 28,
      eyeClosureDurationSec: 2.4,
      perclos: 0.32,
      headPose: { pitch: -20, yaw: 5, roll: 0 },
      attentionState: 'HEAD_NOD',
      isYawning: true,
      yawnDurationSec: 3.0,
      fps: 30,
      processingLatencyMs: 3
    };

    const escalationResult = engine.evaluate(chronicMetrics, undefined, 140, 5);
    assert(
      escalationResult.interventionStage === 'STAGE_4_OWNER_ALERT' || escalationResult.escalateToFleet,
      `Chronic multi-factor collapse escalates to Stage 4 Fleet Owner Alert (${escalationResult.interventionStage})`
    );
    assert(
      escalationResult.safetyScore < 30,
      `Safety score heavily penalized down to ${escalationResult.safetyScore}/100`
    );
  }

  console.log('\n--- 5. Testing Static Picture Validation Logic ---');
  {
    const engine = new DriverRiskEngine();

    // 5A: Validated Alert Driver Photo (Nominal open eyes, centered gaze)
    const alertPhotoMetrics: FacialMetrics = {
      timestamp: Date.now(),
      faceDetected: true,
      faceConfidence: 0.98,
      leftEAR: 0.318,
      rightEAR: 0.318,
      avgEAR: 0.318,
      mar: 0.088,
      isBlinking: false,
      blinkDurationMs: 0,
      blinkCount: 16,
      blinkRatePerMin: 16,
      eyeClosureDurationSec: 0,
      perclos: 0.04,
      headPose: { pitch: 0, yaw: 0, roll: 0 },
      attentionState: 'FOCUSED',
      isYawning: false,
      yawnDurationSec: 0,
      fps: 30,
      processingLatencyMs: 2
    };

    const alertResult = engine.evaluate(alertPhotoMetrics);
    assert(
      alertResult.riskLevel === 'SAFE' && alertResult.safetyScore >= 95,
      `Static alert photo validated as SAFE with score ${alertResult.safetyScore}/100`
    );

    // 5B: Validated Microsleep / Closed Eyes Photo
    const microsleepPhotoMetrics: FacialMetrics = {
      ...alertPhotoMetrics,
      leftEAR: 0.108,
      rightEAR: 0.108,
      avgEAR: 0.108,
      eyeClosureDurationSec: 1.8,
      perclos: 0.35
    };

    const sleepResult = engine.evaluate(microsleepPhotoMetrics);
    assert(
      sleepResult.riskLevel === 'HIGH' || sleepResult.riskLevel === 'CRITICAL',
      `Static closed-eyes photo validated as ${sleepResult.riskLevel} with score ${sleepResult.safetyScore}/100`
    );

    // 5C: Validated No-Face Photo
    const noFaceMetrics: FacialMetrics = {
      ...alertPhotoMetrics,
      faceDetected: false,
      faceConfidence: 0
    };

    const noFaceResult = engine.evaluate(noFaceMetrics);
    assert(
      noFaceResult.primaryCause.includes('Driver monitoring unavailable'),
      `Static unoccupied/no-face photo correctly yields: "${noFaceResult.primaryCause}"`
    );
  }

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.\n`);
  return failed === 0;
}

runTests();

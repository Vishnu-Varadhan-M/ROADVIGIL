/**
 * DriveGuard AI — Driver Risk Engine & Adaptive Intervention System
 * 
 * Mathematical Formulation:
 * - Safety Score S in [0, 100]
 * - S = 100 - (P_closure + P_fatigue + P_distraction + P_repeated + P_duration)
 * 
 * Multi-Stage Adaptive Intervention Architecture:
 * - STAGE 0 (NORMAL): SAFE state, S in [88, 100], ambient HUD monitor
 * - STAGE 1 (EARLY FATIGUE): S in [70, 87], visual banner, mild chime
 * - STAGE 2 (DRIVER WARNING): S in [50, 69], audible tone, prompt driver to refocus
 * - STAGE 3 (CRITICAL ALERT): S in [25, 49], emergency acoustic alarm, "TAKE A BREAK NOW", logged to SafetyEvents
 * - STAGE 4 (OWNER/FLEET ALERT): S < 25 or continuous Stage 3, automated fleet dispatch notification
 * 
 * Temporal Smoothing:
 * - Distinguishes between normal voluntary/involuntary blinks (100-300ms)
 * - Drowsy eye flutter (350-800ms)
 * - Prolonged eye closure / Microsleep (>1500ms)
 * - PERCLOS-80 (proportion of time eyelid covers 80% of pupil in rolling window)
 */

import {
  FacialMetrics,
  RiskEngineResult,
  RiskEngineWeights,
  DriverBaseline,
  RiskLevel,
  InterventionStage
} from '../types';

export const DEFAULT_WEIGHTS: RiskEngineWeights = {
  earClosureThreshold: 0.21,
  prolongedClosureTimeSec: 1.4,
  microsleepTimeSec: 2.0,
  perclosDrowsyThreshold: 0.15,
  perclosCriticalThreshold: 0.28,
  yawnMARThreshold: 0.38,
  headYawDistractionDeg: 24,
  headPitchNoddingDeg: -16,
  penaltyClosureWeight: 35,
  penaltyPerclosWeight: 25,
  penaltyDistractionWeight: 20,
  penaltyRepeatedWeight: 5,
  penaltyDurationWeight: 10,
};

export class DriverRiskEngine {
  private weights: RiskEngineWeights;
  private consecutiveCriticalFrames: number = 0;
  private stage3ActiveTimeSec: number = 0;
  private lastEvaluationTime: number = Date.now();

  constructor(customWeights: Partial<RiskEngineWeights> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...customWeights };
  }

  public updateWeights(newWeights: Partial<RiskEngineWeights>) {
    this.weights = { ...this.weights, ...newWeights };
  }

  public getWeights(): RiskEngineWeights {
    return { ...this.weights };
  }

  /**
   * Evaluates current facial metrics against baseline and configuration,
   * returning deterministic risk state, safety score, and intervention stage.
   */
  public evaluate(
    metrics: FacialMetrics,
    baseline?: DriverBaseline,
    continuousDrivingMinutes: number = 0,
    repeatedFatigueEventsCount: number = 0
  ): RiskEngineResult {
    const now = Date.now();
    const dt = Math.max(0.016, (now - this.lastEvaluationTime) / 1000);
    this.lastEvaluationTime = now;

    // 1. Dynamic Threshold Adaptation via Personalized Baseline
    const effectiveEARThreshold = baseline && baseline.isCalibrated
      ? Math.max(0.16, baseline.baselineEAR * 0.70)
      : this.weights.earClosureThreshold;

    const effectiveMARThreshold = baseline && baseline.isCalibrated
      ? Math.max(0.32, baseline.baselineMAR * 2.8)
      : this.weights.yawnMARThreshold;

    // 2. Handle Case: Face Not Confidently Detected
    if (!metrics.faceDetected) {
      return {
        riskLevel: 'MODERATE',
        safetyScore: 65,
        interventionStage: 'STAGE_1_EARLY_FATIGUE',
        primaryCause: 'Driver monitoring unavailable — please position your face in the camera view',
        detailedExplanation: 'Facial landmarks lost. System cannot evaluate eyes or head pose. Verify camera alignment and lighting.',
        scoreBreakdown: {
          baseScore: 100,
          fatiguePenalty: 0,
          distractionPenalty: 35,
          prolongedClosurePenalty: 0,
          repeatedEventPenalty: 0,
          continuousDurationPenalty: 0
        },
        recommendation: 'Ensure your face is upright and illuminated. Do not obscure camera sensor.',
        escalateToFleet: false
      };
    }

    // 3. Compute Penalties
    let prolongedClosurePenalty = 0;
    let fatiguePenalty = 0;
    let distractionPenalty = 0;
    let repeatedPenalty = 0;
    let durationPenalty = 0;

    const closureDuration = metrics.eyeClosureDurationSec;
    const isEyesClosed = metrics.avgEAR < effectiveEARThreshold;

    // Penalty A: Prolonged Eye Closure & Microsleep
    if (closureDuration >= this.weights.microsleepTimeSec) {
      // Microsleep detected: sustained closure > 2.0s
      prolongedClosurePenalty = this.weights.penaltyClosureWeight; // 35
    } else if (closureDuration >= this.weights.prolongedClosureTimeSec) {
      // Prolonged closure: 1.4s - 2.0s
      const ratio = (closureDuration - this.weights.prolongedClosureTimeSec) /
                    (this.weights.microsleepTimeSec - this.weights.prolongedClosureTimeSec);
      prolongedClosurePenalty = 20 + ratio * 15;
    } else if (closureDuration >= 0.7) {
      // Drowsy flutter: 0.7s - 1.4s
      prolongedClosurePenalty = 10;
    }

    // Penalty B: PERCLOS & Yawning (Cumulative Fatigue)
    if (metrics.perclos >= this.weights.perclosCriticalThreshold) {
      fatiguePenalty += this.weights.penaltyPerclosWeight; // 25
    } else if (metrics.perclos >= this.weights.perclosDrowsyThreshold) {
      const perclosNorm = (metrics.perclos - this.weights.perclosDrowsyThreshold) /
                          (this.weights.perclosCriticalThreshold - this.weights.perclosDrowsyThreshold);
      fatiguePenalty += 12 + perclosNorm * 13;
    }

    if (metrics.isYawning || metrics.mar >= effectiveMARThreshold) {
      fatiguePenalty += 8;
    }

    // Blink rate anomalies (normal is ~12-24 bpm; severe fatigue is either rapid flutter >35 or sluggish drop <7)
    if (metrics.blinkRatePerMin > 32 || (metrics.blinkRatePerMin < 7 && metrics.blinkCount > 5)) {
      fatiguePenalty += 5;
    }

    // Cap fatigue penalty to avoid over-weighting
    fatiguePenalty = Math.min(30, fatiguePenalty);

    // Penalty C: Head Pose & Attention Deviation (Distraction)
    const yawAbs = Math.abs(metrics.headPose.yaw);
    const pitch = metrics.headPose.pitch;

    if (yawAbs > this.weights.headYawDistractionDeg) {
      // Turned sideways (looking out side window or at passenger/phone)
      distractionPenalty = this.weights.penaltyDistractionWeight; // 20
    } else if (pitch < this.weights.headPitchNoddingDeg) {
      // Head nodding down (asleep or checking smartphone in lap)
      distractionPenalty = this.weights.penaltyDistractionWeight; // 20
    } else if (metrics.attentionState === 'LOOKING_AWAY' || metrics.attentionState === 'LOOKING_DOWN') {
      distractionPenalty = 15;
    }

    // Penalty D: Repeated Fatigue Events (Accumulated safety history)
    repeatedPenalty = Math.min(25, repeatedFatigueEventsCount * this.weights.penaltyRepeatedWeight);

    // Penalty E: Continuous Driving Duration without Rest
    if (continuousDrivingMinutes > 180) {
      // > 3 hours
      durationPenalty = 15;
    } else if (continuousDrivingMinutes > 120) {
      // > 2 hours
      durationPenalty = this.weights.penaltyDurationWeight; // 10
    } else if (continuousDrivingMinutes > 90) {
      durationPenalty = 5;
    }

    // 4. Calculate Final Safety Score S in [0, 100]
    const totalDeductions = prolongedClosurePenalty + fatiguePenalty + distractionPenalty + repeatedPenalty + durationPenalty;
    const safetyScore = Math.max(0, Math.min(100, Math.round(100 - totalDeductions)));

    // 5. Determine Primary Cause & Detailed Explanation
    let primaryCause = 'Normal driving conditions. Eyes open, attention centered.';
    let detailedExplanation = 'Driver facial metrics are within nominal ranges.';
    let recommendation = 'Maintain safe following distance and remain attentive.';

    if (closureDuration >= this.weights.microsleepTimeSec) {
      primaryCause = `Microsleep detected (${closureDuration.toFixed(1)}s continuous closure)`;
      detailedExplanation = `Eye aspect ratio (${metrics.avgEAR.toFixed(2)}) remained below threshold (${effectiveEARThreshold.toFixed(2)}) for ${closureDuration.toFixed(1)} seconds.`;
      recommendation = 'PULL OVER SAFELY. Prolonged eye closure indicates severe risk of imminent collision.';
    } else if (closureDuration >= this.weights.prolongedClosureTimeSec) {
      primaryCause = `Prolonged eye closure detected (${closureDuration.toFixed(1)}s)`;
      detailedExplanation = `Eyelid closure sustained beyond safe physiological blink threshold.`;
      recommendation = 'Focus eyes on the road and increase alert vigilance.';
    } else if (pitch < this.weights.headPitchNoddingDeg) {
      primaryCause = `Head nodding posture detected (${pitch.toFixed(0)}° downward pitch)`;
      detailedExplanation = `Driver head orientation dipped downward, indicating drowsiness or sleep onset.`;
      recommendation = 'Elevate posture and check driver consciousness.';
    } else if (yawAbs > this.weights.headYawDistractionDeg) {
      primaryCause = `Visual distraction: Gaze off-road (${yawAbs.toFixed(0)}° yaw deviation)`;
      detailedExplanation = `Head turned away from the primary forward roadway trajectory.`;
      recommendation = 'Return attention to the forward path and traffic conditions.';
    } else if (metrics.perclos >= this.weights.perclosDrowsyThreshold) {
      primaryCause = `Elevated PERCLOS fatigue metric (${(metrics.perclos * 100).toFixed(0)}% eye closure)`;
      detailedExplanation = `Cumulative eyelid closure exceeds ${(this.weights.perclosDrowsyThreshold * 100).toFixed(0)}% over recent temporal window.`;
      recommendation = 'Schedule a rest break at the next safe exit or service plaza.';
    } else if (metrics.isYawning) {
      primaryCause = `Frequent yawning detected (MAR ${metrics.mar.toFixed(2)})`;
      detailedExplanation = `Mouth aspect ratio elevated beyond resting baseline, indicating respiratory compensation for fatigue.`;
      recommendation = 'Open vehicle ventilation window, lower cabin temperature, or take a caffeine rest break.';
    } else if (repeatedFatigueEventsCount >= 3) {
      primaryCause = `Chronic fatigue: ${repeatedFatigueEventsCount} warnings logged during this trip`;
      detailedExplanation = `Multiple fatigue incidents detected within current drive session. Safety score degraded by cumulative penalty.`;
      recommendation = 'Mandatory driver rotation or 20-minute rest pause required.';
    }

    // 6. Map to Risk Level & Multi-Stage Intervention System
    let riskLevel: RiskLevel = 'SAFE';
    let interventionStage: InterventionStage = 'STAGE_0_NORMAL';

    if (safetyScore >= 88 && prolongedClosurePenalty === 0 && distractionPenalty === 0) {
      riskLevel = 'SAFE';
      interventionStage = 'STAGE_0_NORMAL';
      this.consecutiveCriticalFrames = 0;
      this.stage3ActiveTimeSec = 0;
    } else if (safetyScore >= 70 && closureDuration < this.weights.prolongedClosureTimeSec) {
      riskLevel = 'LOW';
      interventionStage = 'STAGE_1_EARLY_FATIGUE';
      this.consecutiveCriticalFrames = 0;
      this.stage3ActiveTimeSec = 0;
    } else if (safetyScore >= 50 && closureDuration < this.weights.prolongedClosureTimeSec) {
      riskLevel = 'MODERATE';
      interventionStage = 'STAGE_2_DRIVER_WARNING';
      this.consecutiveCriticalFrames = 0;
      this.stage3ActiveTimeSec = 0;
    } else if (safetyScore >= 25 || (closureDuration >= this.weights.prolongedClosureTimeSec && this.stage3ActiveTimeSec < 5)) {
      riskLevel = 'HIGH';
      interventionStage = 'STAGE_3_CRITICAL_ALERT';
      this.stage3ActiveTimeSec += dt;
      this.consecutiveCriticalFrames++;
    } else {
      // Critical emergency: persistent high risk or repeated fatigue collapse
      riskLevel = 'CRITICAL';
      interventionStage = 'STAGE_4_OWNER_ALERT';
      this.stage3ActiveTimeSec += dt;
    }

    // Emergency escalation rule:
    // If Stage 3 continues unabated for > 5 seconds, automatically escalate to Stage 4 (Fleet alert)
    const escalateToFleet = interventionStage === 'STAGE_4_OWNER_ALERT' || 
      (interventionStage === 'STAGE_3_CRITICAL_ALERT' && this.stage3ActiveTimeSec >= 5) ||
      (repeatedFatigueEventsCount >= 4 && safetyScore < 45);

    if (escalateToFleet) {
      interventionStage = 'STAGE_4_OWNER_ALERT';
      riskLevel = 'CRITICAL';
    }

    return {
      riskLevel,
      safetyScore,
      interventionStage,
      primaryCause,
      detailedExplanation,
      scoreBreakdown: {
        baseScore: 100,
        fatiguePenalty: Math.round(fatiguePenalty),
        distractionPenalty: Math.round(distractionPenalty),
        prolongedClosurePenalty: Math.round(prolongedClosurePenalty),
        repeatedEventPenalty: Math.round(repeatedPenalty),
        continuousDurationPenalty: Math.round(durationPenalty)
      },
      recommendation,
      escalateToFleet
    };
  }

  public resetTemporalState() {
    this.consecutiveCriticalFrames = 0;
    this.stage3ActiveTimeSec = 0;
    this.lastEvaluationTime = Date.now();
  }
}

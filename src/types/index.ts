/**
 * DriveGuard AI — Core Type Definitions
 * Intelligent Driver Safety & Accident Prevention Platform
 */

export type RiskLevel = 'SAFE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type InterventionStage = 
  | 'STAGE_0_NORMAL'
  | 'STAGE_1_EARLY_FATIGUE'
  | 'STAGE_2_DRIVER_WARNING'
  | 'STAGE_3_CRITICAL_ALERT'
  | 'STAGE_4_OWNER_ALERT';

export type AttentionState = 
  | 'FOCUSED'
  | 'LOOKING_AWAY'
  | 'LOOKING_DOWN'
  | 'HEAD_NOD'
  | 'NO_FACE';

export type EventType = 
  | 'NORMAL'
  | 'BLINK'
  | 'DROWSINESS_DETECTED'
  | 'MICROSLEEP'
  | 'PROLONGED_CLOSURE'
  | 'YAWN_FATIGUE'
  | 'DISTRACTION'
  | 'HEAD_NODDING'
  | 'REPEATED_FATIGUE'
  | 'FACE_LOST';

export type EventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type UserRole = 'DRIVER' | 'FLEET_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  email: string;
  licenseNumber: string;
  experienceYears: number;
  assignedVehicleId?: string;
  baseline?: DriverBaseline;
  safetyScoreAverage: number;
  totalTrips: number;
  status: 'ON_DUTY' | 'OFF_DUTY' | 'REST_BREAK';
}

export interface Vehicle {
  id: string;
  vin: string;
  plateNumber: string;
  makeModel: string;
  year: number;
  status: 'ACTIVE' | 'IDLE' | 'MAINTENANCE';
  assignedDriverId?: string;
  currentTripId?: string;
}

export interface DriverBaseline {
  id: string;
  driverId: string;
  calibratedAt: string;
  baselineEAR: number;        // Typically ~0.28 - 0.35
  baselineMAR: number;        // Typically ~0.08 - 0.15
  baselineBlinkRate: number;  // Blinks per minute (e.g. 15-20)
  baselineHeadPitch: number;  // Neutral pitch degrees (e.g. 0-5°)
  baselineHeadYaw: number;    // Neutral yaw degrees (e.g. 0-3°)
  isCalibrated: boolean;
}

export interface HeadPose {
  pitch: number; // Down (-) / Up (+) in degrees
  yaw: number;   // Left (-) / Right (+) in degrees
  roll: number;  // Tilt in degrees
}

export interface FacialMetrics {
  timestamp: number;
  faceDetected: boolean;
  faceConfidence: number;
  leftEAR: number;
  rightEAR: number;
  avgEAR: number;
  mar: number; // Mouth Aspect Ratio
  isBlinking: boolean;
  blinkDurationMs: number;
  blinkCount: number;
  blinkRatePerMin: number;
  eyeClosureDurationSec: number;
  perclos: number; // Percentage of eye closure over 60s window (0.0 to 1.0)
  headPose: HeadPose;
  attentionState: AttentionState;
  isYawning: boolean;
  yawnDurationSec: number;
  fps: number;
  processingLatencyMs: number;
}

export interface RiskEngineResult {
  riskLevel: RiskLevel;
  safetyScore: number; // 0 - 100
  interventionStage: InterventionStage;
  primaryCause: string;
  detailedExplanation: string;
  scoreBreakdown: {
    baseScore: number;
    fatiguePenalty: number;
    distractionPenalty: number;
    prolongedClosurePenalty: number;
    repeatedEventPenalty: number;
    continuousDurationPenalty: number;
  };
  recommendation: string;
  escalateToFleet: boolean;
}

export interface SafetyEvent {
  id: string;
  tripId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  timestamp: string;
  eventType: EventType;
  severity: EventSeverity;
  interventionStage: InterventionStage;
  riskLevel: RiskLevel;
  safetyScoreAtEvent: number;
  description: string;
  metricsSnapshot: {
    ear: number;
    eyeClosureDurationSec: number;
    perclos: number;
    mar: number;
    headPitch: number;
    headYaw: number;
  };
  acknowledged: boolean;
  fleetAlertDispatched: boolean;
}

export interface TripSession {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  startTime: string;
  endTime?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  durationSeconds: number;
  currentSafetyScore: number;
  averageSafetyScore: number;
  minSafetyScore: number;
  currentRiskLevel: RiskLevel;
  warningCount: number;
  criticalCount: number;
  totalFatigueEvents: number;
  lastEventDescription?: string;
  isSimulated?: boolean;
}

export interface RiskEngineWeights {
  earClosureThreshold: number;       // default 0.20
  prolongedClosureTimeSec: number;   // default 1.5s
  microsleepTimeSec: number;         // default 2.0s
  perclosDrowsyThreshold: number;    // default 0.15 (15%)
  perclosCriticalThreshold: number;  // default 0.28 (28%)
  yawnMARThreshold: number;          // default 0.40
  headYawDistractionDeg: number;     // default 25 degrees
  headPitchNoddingDeg: number;       // default -18 degrees
  penaltyClosureWeight: number;      // default 35
  penaltyPerclosWeight: number;      // default 25
  penaltyDistractionWeight: number;  // default 20
  penaltyRepeatedWeight: number;     // default 5 per event (max 25)
  penaltyDurationWeight: number;     // default 10 for >2 hours
}

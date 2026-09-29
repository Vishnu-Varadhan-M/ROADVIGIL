/**
 * DriveGuard AI — Driver Cockpit & Real-Time Monitoring HUD
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Target,
  Sliders,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  Eye,
  Activity,
  Compass,
  Clock,
  Sparkles,
  Info,
  Coffee,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import {
  FacialMetrics,
  RiskEngineResult,
  DriverBaseline,
  TripSession,
  InterventionStage
} from '../types';
import {
  DriverRiskEngine
} from '../engine/riskEngine';
import {
  ComputerVisionTracker,
  NativeCanvasFaceTracker,
  Point2D,
  FACEMESH_LEFT_EYE,
  FACEMESH_RIGHT_EYE
} from '../engine/cvEngine';
import { simulationEngine } from '../engine/simulationEngine';
import { soundService } from '../services/soundService';
import { ScoreFormulaModal } from './ScoreFormulaModal';
import { CalibrationModal } from './CalibrationModal';
import { SettingsModal } from './SettingsModal';

interface Props {
  driverId: string;
  driverName: string;
  vehiclePlate: string;
  baseline?: DriverBaseline;
  activeTrip: TripSession;
  onTripUpdated: (trip: TripSession) => void;
  onTriggerEvent: (event: any) => void;
  isSimulatedMode: boolean;
  onToggleSimulatedMode: (simulated: boolean) => void;
  onNavigateToPhotoLab?: () => void;
}

export const DriverCockpit: React.FC<Props> = ({
  driverId,
  driverName,
  vehiclePlate,
  baseline,
  activeTrip,
  onTripUpdated,
  onTriggerEvent,
  isSimulatedMode,
  onToggleSimulatedMode,
  onNavigateToPhotoLab
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<'FULL' | 'EYES' | 'CLEAN'>('EYES');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Engines
  const riskEngineRef = useRef(new DriverRiskEngine());
  const cvTrackerRef = useRef(new ComputerVisionTracker());
  const nativeTrackerRef = useRef(new NativeCanvasFaceTracker());
  const mediaPipeLandmarksRef = useRef<Point2D[] | null>(null);

  // Initialize MediaPipe FaceMesh when available
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const GlobalFaceMesh = (window as unknown as { FaceMesh?: any }).FaceMesh;
    if (GlobalFaceMesh) {
      try {
        const faceMesh = new GlobalFaceMesh({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
        });
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        faceMesh.onResults((results: any) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            mediaPipeLandmarksRef.current = results.multiFaceLandmarks[0];
          } else {
            mediaPipeLandmarksRef.current = null;
          }
        });

        let active = true;
        const sendFrame = async () => {
          if (!active) return;
          if (videoRef.current && videoRef.current.readyState >= 2 && !videoRef.current.paused && cameraActive) {
            try {
              await faceMesh.send({ image: videoRef.current });
            } catch {
              // Frame dropped, proceed to next
            }
          }
          if (active) setTimeout(sendFrame, 60); // ~16 FPS MediaPipe pipeline
        };
        sendFrame();

        return () => {
          active = false;
        };
      } catch (err) {
        console.warn('MediaPipe FaceMesh init fallback to NativeCanvasFaceTracker:', err);
      }
    }
  }, [cameraActive]);

  // Real-time state
  const [metrics, setMetrics] = useState<FacialMetrics>({
    timestamp: Date.now(),
    faceDetected: true,
    faceConfidence: 0.95,
    leftEAR: 0.31,
    rightEAR: 0.31,
    avgEAR: 0.31,
    mar: 0.09,
    isBlinking: false,
    blinkDurationMs: 0,
    blinkCount: 18,
    blinkRatePerMin: 16,
    eyeClosureDurationSec: 0,
    perclos: 0.04,
    headPose: { pitch: 1, yaw: 0, roll: 0 },
    attentionState: 'FOCUSED',
    isYawning: false,
    yawnDurationSec: 0,
    fps: 30,
    processingLatencyMs: 3
  });

  const [riskResult, setRiskResult] = useState<RiskEngineResult>(() =>
    riskEngineRef.current.evaluate(metrics, baseline, 35, 0)
  );

  // Modals
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tripElapsedSec, setTripElapsedSec] = useState(activeTrip.durationSeconds || 0);

  // Safety intervention acknowledgement state
  const [acknowledgedStage, setAcknowledgedStage] = useState<InterventionStage>('STAGE_0_NORMAL');

  // Trip timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTripElapsedSec(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize or stop real webcam
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      if (isSimulatedMode) {
        setCameraActive(false);
        return;
      }

      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
        }
      } catch (err: any) {
        console.warn('Camera access unavailable or denied:', err);
        setCameraError('Webcam unavailable or permission denied. Automatically switching to simulation mode.');
        onToggleSimulatedMode(true);
      }
    }

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isSimulatedMode, onToggleSimulatedMode]);

  // Main processing loop
  useEffect(() => {
    let active = true;
    let lastEvalTime = Date.now();

    const processFrame = () => {
      if (!active) return;

      let currentFrameMetrics: FacialMetrics;
      let landmarksToDraw: Point2D[] = [];

      if (isSimulatedMode || !cameraActive) {
        // Run via Simulation Engine
        const sim = simulationEngine.generateNextFrame();
        currentFrameMetrics = sim.metrics;
        landmarksToDraw = sim.syntheticLandmarks;
      } else if (videoRef.current && videoRef.current.readyState >= 2) {
        // Run with live camera frames
        const video = videoRef.current;

        // Check if MediaPipe FaceMesh has produced real 3D landmarks
        const mpLandmarks = mediaPipeLandmarksRef.current;
        if (mpLandmarks && mpLandmarks.length >= 400) {
          landmarksToDraw = mpLandmarks;
          currentFrameMetrics = cvTrackerRef.current.processLandmarks(
            mpLandmarks,
            baseline?.baselineEAR ? baseline.baselineEAR * 0.70 : 0.21,
            baseline?.baselineMAR ? baseline.baselineMAR * 2.8 : 0.38
          );
        } else {
          // Real-time Native Canvas Pixel & Ocular Computer Vision Tracker
          const nativeResult = nativeTrackerRef.current.analyzeFrame(video);
          if (!nativeResult.faceDetected) {
            // Real face lost from camera view!
            currentFrameMetrics = {
              timestamp: Date.now(),
              faceDetected: false,
              faceConfidence: 0,
              leftEAR: 0,
              rightEAR: 0,
              avgEAR: 0,
              mar: 0,
              isBlinking: false,
              blinkDurationMs: 0,
              blinkCount: metrics.blinkCount,
              blinkRatePerMin: metrics.blinkRatePerMin,
              eyeClosureDurationSec: 0,
              perclos: metrics.perclos,
              headPose: { pitch: 0, yaw: 0, roll: 0 },
              attentionState: 'NO_FACE',
              isYawning: false,
              yawnDurationSec: 0,
              fps: metrics.fps,
              processingLatencyMs: 3
            };
            landmarksToDraw = [];
          } else {
            // Real face detected in webcam!
            landmarksToDraw = nativeResult.landmarks;
            currentFrameMetrics = cvTrackerRef.current.processLandmarks(
              landmarksToDraw,
              baseline?.baselineEAR ? baseline.baselineEAR * 0.70 : 0.21,
              baseline?.baselineMAR ? baseline.baselineMAR * 2.8 : 0.38
            );
            // Integrate optical measurements
            currentFrameMetrics.avgEAR = nativeResult.ear;
            currentFrameMetrics.leftEAR = nativeResult.ear;
            currentFrameMetrics.rightEAR = nativeResult.ear;
            currentFrameMetrics.mar = nativeResult.mar;
            currentFrameMetrics.headPose = nativeResult.headPose;
            currentFrameMetrics.faceDetected = true;
            currentFrameMetrics.faceConfidence = nativeResult.confidence;
          }
        }
      } else {
        const sim = simulationEngine.generateNextFrame();
        currentFrameMetrics = sim.metrics;
        landmarksToDraw = sim.syntheticLandmarks;
      }

      setMetrics(currentFrameMetrics);

      // Evaluate Risk Engine every ~150ms
      const now = Date.now();
      if (now - lastEvalTime >= 150) {
        lastEvalTime = now;
        const driveMinutes = Math.round(tripElapsedSec / 60);
        const repeatedCount = activeTrip.warningCount + activeTrip.criticalCount;
        
        const evaluation = riskEngineRef.current.evaluate(
          currentFrameMetrics,
          baseline,
          driveMinutes,
          repeatedCount
        );

        setRiskResult(evaluation);

        // Multi-stage intervention trigger
        if (evaluation.interventionStage !== 'STAGE_0_NORMAL') {
          soundService.triggerIntervention(evaluation.interventionStage, evaluation.primaryCause);

          // If Stage 3 or Stage 4, generate safety event
          if (evaluation.interventionStage === 'STAGE_3_CRITICAL_ALERT' || evaluation.interventionStage === 'STAGE_4_OWNER_ALERT') {
            onTriggerEvent({
              tripId: activeTrip.id,
              driverId,
              driverName,
              vehicleId: activeTrip.vehicleId,
              vehiclePlate,
              timestamp: new Date().toISOString(),
              eventType: currentFrameMetrics.eyeClosureDurationSec >= 1.5 ? 'PROLONGED_CLOSURE' : 'MICROSLEEP',
              severity: 'CRITICAL',
              interventionStage: evaluation.interventionStage,
              riskLevel: evaluation.riskLevel,
              safetyScoreAtEvent: evaluation.safetyScore,
              description: evaluation.primaryCause,
              metricsSnapshot: {
                ear: currentFrameMetrics.avgEAR,
                eyeClosureDurationSec: currentFrameMetrics.eyeClosureDurationSec,
                perclos: currentFrameMetrics.perclos,
                mar: currentFrameMetrics.mar,
                headPitch: currentFrameMetrics.headPose.pitch,
                headYaw: currentFrameMetrics.headPose.yaw
              },
              acknowledged: false,
              fleetAlertDispatched: true
            });
          }
        }
      }

      // Draw HUD canvas overlay
      drawCanvasOverlay(landmarksToDraw, currentFrameMetrics);

      requestAnimationFrame(processFrame);
    };

    const frameId = requestAnimationFrame(processFrame);

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [isSimulatedMode, cameraActive, baseline, tripElapsedSec, activeTrip, driverId, driverName, vehiclePlate, onTriggerEvent]);

  // Render HUD canvas overlay
  const drawCanvasOverlay = useCallback((landmarks: Point2D[], curMetrics: FacialMetrics) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (overlayStyle === 'CLEAN') return;

    if (!curMetrics.faceDetected) {
      // Draw search target
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(width * 0.25, height * 0.15, width * 0.5, height * 0.7);
      ctx.setLineDash([]);
      return;
    }

    // Bounding / Focus frame
    const boxColor = curMetrics.eyeClosureDurationSec > 1.2 ? '#f43f5e' :
                     curMetrics.eyeClosureDurationSec > 0.6 ? '#f59e0b' : '#10b981';
    
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 2;

    // Corner brackets
    const bx = width * 0.22;
    const by = height * 0.12;
    const bw = width * 0.56;
    const bh = height * 0.76;
    const cl = 24;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by);
    // Top-right
    ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl);
    // Bottom-right
    ctx.moveTo(bx + bw, by + bh - cl); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - cl, by + bh);
    // Bottom-left
    ctx.moveTo(bx + cl, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - cl);
    ctx.stroke();

    // Eye landmark anchors
    if (landmarks.length > 300) {
      ctx.fillStyle = curMetrics.avgEAR < 0.20 ? 'rgba(244, 63, 94, 0.9)' : 'rgba(34, 211, 238, 0.8)';
      
      // Draw left eye loop
      FACEMESH_LEFT_EYE.forEach(idx => {
        const pt = landmarks[idx];
        if (pt) {
          ctx.beginPath();
          ctx.arc(pt.x * width, pt.y * height, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // Draw right eye loop
      FACEMESH_RIGHT_EYE.forEach(idx => {
        const pt = landmarks[idx];
        if (pt) {
          ctx.beginPath();
          ctx.arc(pt.x * width, pt.y * height, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // Gaze Ray / Head orientation vector
      const nose = landmarks[1];
      if (nose) {
        const nx = nose.x * width;
        const ny = nose.y * height;
        const targetX = nx + (curMetrics.headPose.yaw * 2.5);
        const targetY = ny - (curMetrics.headPose.pitch * 2.5);

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [overlayStyle]);

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundService.setMuted(next);
  };

  const handleRefocusAcknowledge = () => {
    setAcknowledgedStage(riskResult.interventionStage);
    soundService.stopAll();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Score colors
  const score = riskResult.safetyScore;
  const scoreColor = score >= 85 ? 'text-emerald-400' :
                     score >= 65 ? 'text-amber-400' :
                     score >= 45 ? 'text-orange-400' : 'text-rose-400';
  const strokeColor = score >= 85 ? '#34d399' :
                      score >= 65 ? '#fbbf24' :
                      score >= 45 ? '#fb923c' : '#f43f5e';

  return (
    <div className="space-y-4">
      {/* Top Banner: Multi-Stage Intervention System */}
      {riskResult.interventionStage !== 'STAGE_0_NORMAL' && acknowledgedStage !== riskResult.interventionStage && (
        <div className={`p-4 rounded-xl border transition-all animate-pulse duration-500 shadow-xl flex items-center justify-between ${
          riskResult.interventionStage === 'STAGE_4_OWNER_ALERT'
            ? 'bg-rose-950/80 border-rose-500 text-rose-200'
            : riskResult.interventionStage === 'STAGE_3_CRITICAL_ALERT'
            ? 'bg-red-950/80 border-red-500 text-red-100'
            : riskResult.interventionStage === 'STAGE_2_DRIVER_WARNING'
            ? 'bg-amber-950/80 border-amber-500 text-amber-100'
            : 'bg-yellow-950/70 border-yellow-600/80 text-yellow-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-black/40 text-current">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold uppercase tracking-wider text-xs">
                  {riskResult.interventionStage.replace(/_/g, ' ')}
                </span>
                <span className="text-xs opacity-75">·</span>
                <span className="text-xs font-mono tabular-nums opacity-90">Score: {riskResult.safetyScore}</span>
              </div>
              <p className="text-sm font-semibold mt-0.5">{riskResult.primaryCause}</p>
              <p className="text-xs opacity-80 mt-0.5">{riskResult.recommendation}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefocusAcknowledge}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
            >
              Acknowledge & Refocus
            </button>
            {riskResult.interventionStage === 'STAGE_3_CRITICAL_ALERT' && (
              <button
                onClick={() => alert('Rest break route initiated. Nearest service plaza: 2.4 miles ahead.')}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 transition-colors cursor-pointer"
              >
                Pull Over Safe
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main HUD Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Live Visual HUD (Camera / Simulator View) */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {/* Viewport Top Bar */}
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <div className={`w-2 h-2 rounded-full ${metrics.faceDetected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-semibold text-white">Live Driver Visual HUD</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 font-mono tabular-nums">
                {isSimulatedMode ? 'SIMULATED DATA' : 'PHYSICAL SENSOR'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-mono tabular-nums">{metrics.fps} FPS · {metrics.processingLatencyMs}ms</span>
              
              {/* Overlay selector */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px]">
                <button
                  onClick={() => setOverlayStyle('EYES')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${overlayStyle === 'EYES' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
                >
                  Anchors
                </button>
                <button
                  onClick={() => setOverlayStyle('FULL')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${overlayStyle === 'FULL' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
                >
                  Target
                </button>
                <button
                  onClick={() => setOverlayStyle('CLEAN')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${overlayStyle === 'CLEAN' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
                >
                  Clean
                </button>
              </div>

              {/* Mode switch */}
              <button
                onClick={() => onToggleSimulatedMode(!isSimulatedMode)}
                className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSimulatedMode ? <Camera className="w-3.5 h-3.5 text-cyan-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isSimulatedMode ? 'Use WebCam' : 'Demo Mode'}</span>
              </button>

              {onNavigateToPhotoLab && (
                <button
                  onClick={onNavigateToPhotoLab}
                  className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Open Static Photo Diagnostic Scanner"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Photo Lab</span>
                </button>
              )}

              {/* Audio mute */}
              <button
                onClick={handleMuteToggle}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title={isMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Video / Canvas Stage */}
          <div className="relative aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Hidden or visible video element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
                isSimulatedMode || !cameraActive ? 'opacity-0' : 'opacity-100'
              }`}
            />

            {/* In demo mode or if no camera, show automotive simulation backdrop */}
            {(isSimulatedMode || !cameraActive) && (
              <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-black flex items-center justify-center">
                {/* Silhouette driver frame */}
                <div className="text-center opacity-30 pointer-events-none">
                  <div className="w-40 h-40 rounded-full border-2 border-dashed border-cyan-500/40 mx-auto flex items-center justify-center">
                    <Eye className="w-16 h-16 text-cyan-400" />
                  </div>
                  <div className="text-xs font-mono mt-3 text-cyan-300">
                    REAL-TIME SYNTHETIC LANDMARK STREAM
                  </div>
                </div>
              </div>
            )}

            {/* Canvas for Landmark Mesh & Bounding Overlays */}
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* When face is not detected in camera */}
            {!metrics.faceDetected && cameraActive && !isSimulatedMode && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-6 text-center z-20 pointer-events-none">
                <div className="p-4 rounded-xl bg-slate-900/95 border border-amber-500/70 shadow-2xl max-w-sm">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-bounce" />
                  <h4 className="text-sm font-bold text-white mb-1">Driver monitoring unavailable</h4>
                  <p className="text-xs text-amber-200 leading-relaxed">
                    Please position your face correctly in the camera view with adequate lighting.
                  </p>
                </div>
              </div>
            )}

            {/* Overlay Telemetry HUD Chips */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none text-xs">
              <div className="bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded border border-slate-800 text-slate-300 font-mono flex items-center gap-2">
                <span className="text-slate-500">EAR:</span>
                <span className={`font-bold tabular-nums ${metrics.avgEAR < 0.20 ? 'text-rose-400' : 'text-cyan-300'}`}>
                  {metrics.avgEAR.toFixed(3)}
                </span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-500">Base:</span>
                <span className="text-slate-400 tabular-nums">
                  {baseline?.baselineEAR ? baseline.baselineEAR.toFixed(3) : '0.280'}
                </span>
              </div>

              <div className="bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded border border-slate-800 text-slate-300 font-mono flex items-center gap-2">
                <span className="text-slate-500">Closure:</span>
                <span className={`font-bold tabular-nums ${
                  metrics.eyeClosureDurationSec >= 1.5 ? 'text-rose-400' :
                  metrics.eyeClosureDurationSec >= 0.7 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {metrics.eyeClosureDurationSec.toFixed(1)}s
                </span>
              </div>

              <div className="bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded border border-slate-800 text-slate-300 font-mono flex items-center gap-2">
                <span className="text-slate-500">PERCLOS:</span>
                <span className={`font-bold tabular-nums ${metrics.perclos > 0.15 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {(metrics.perclos * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Bottom Attention & Head Pose HUD */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="bg-slate-950/85 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-400">Gaze:</span>
                  <span className={`font-semibold ${
                    metrics.attentionState === 'FOCUSED' ? 'text-emerald-400' :
                    metrics.attentionState === 'LOOKING_AWAY' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {metrics.attentionState.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-slate-700">|</span>
                <div className="font-mono text-slate-300 text-[11px] tabular-nums">
                  Pitch: {metrics.headPose.pitch > 0 ? `+${metrics.headPose.pitch}` : metrics.headPose.pitch}° · Yaw: {metrics.headPose.yaw > 0 ? `+${metrics.headPose.yaw}` : metrics.headPose.yaw}°
                </div>
              </div>

              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border backdrop-blur-xs ${
                riskResult.riskLevel === 'SAFE' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50' :
                riskResult.riskLevel === 'LOW' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/50' :
                riskResult.riskLevel === 'MODERATE' ? 'bg-amber-950/80 text-amber-300 border-amber-600/50' :
                riskResult.riskLevel === 'HIGH' ? 'bg-orange-950/80 text-orange-300 border-orange-600/50' :
                'bg-rose-950/90 text-rose-200 border-rose-500 animate-bounce'
              }`}>
                {riskResult.riskLevel} RISK
              </div>
            </div>
          </div>

          {/* Quick HUD Footer Controls */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono tabular-nums">{formatTime(tripElapsedSec)}</span>
              </span>
              <span>·</span>
              <span>Trip: {activeTrip.id}</span>
              <span>·</span>
              <span>Driver: {driverName}</span>
              <span>·</span>
              <span>Vehicle: {vehiclePlate}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCalibrationOpen(true)}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Calibrate Baseline</span>
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Tune Thresholds</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Safety Score Ring */}
        <div className="lg:col-span-4 space-y-4">
          {/* Radial Safety Score Ring */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 text-center relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver Safety Score</span>
              <button
                onClick={() => setIsFormulaModalOpen(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Formula</span>
              </button>
            </div>

            {/* Circular Gauge */}
            <div className="relative inline-flex items-center justify-center my-3">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  stroke="#1e293b"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  stroke={strokeColor}
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={364.4}
                  strokeDashoffset={364.4 - (364.4 * score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <span className={`text-4xl font-extrabold font-mono tabular-nums ${scoreColor}`}>
                  {score}
                </span>
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                  / 100
                </span>
              </div>
            </div>

            <div className="text-xs font-medium text-slate-300 max-w-xs mx-auto">
              {riskResult.primaryCause}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-left text-xs">
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500">Fatigue Penalty</span>
                <div className="font-mono text-amber-400 font-bold tabular-nums">
                  -{riskResult.scoreBreakdown.fatiguePenalty}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500">Closure Penalty</span>
                <div className="font-mono text-rose-400 font-bold tabular-nums">
                  -{riskResult.scoreBreakdown.prolongedClosurePenalty}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Physiological Gauges */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Physiological Metrics</h4>

            {/* EAR Metric */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium">Eye Openness (EAR)</span>
                <span className="font-mono tabular-nums text-cyan-300 font-bold">{metrics.avgEAR.toFixed(3)}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 relative">
                <div
                  className={`h-full transition-all duration-200 ${
                    metrics.avgEAR < 0.20 ? 'bg-rose-500' : metrics.avgEAR < 0.25 ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.avgEAR / 0.40) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
                <span>0.00 (Closed)</span>
                <span>Threshold: 0.21</span>
                <span>0.40 (Wide)</span>
              </div>
            </div>

            {/* MAR Yawning Metric */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium">Mouth Openness (MAR)</span>
                <span className={`font-mono tabular-nums font-bold ${metrics.isYawning ? 'text-purple-400' : 'text-slate-300'}`}>
                  {metrics.mar.toFixed(3)} {metrics.isYawning ? '· YAWNING' : ''}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-200 ${metrics.isYawning ? 'bg-purple-500' : 'bg-slate-600'}`}
                  style={{ width: `${Math.min(100, (metrics.mar / 0.60) * 100)}%` }}
                />
              </div>
            </div>

            {/* Blink Cadence */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[11px]">Blink Frequency</span>
                <div className="font-mono text-base font-bold text-slate-200 tabular-nums">
                  {metrics.blinkRatePerMin} <span className="text-xs font-normal text-slate-400">bpm</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Nominal: 12-24 bpm</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[11px]">Cumulative Blinks</span>
                <div className="font-mono text-base font-bold text-slate-200 tabular-nums">
                  {metrics.blinkCount}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Session total</div>
              </div>
            </div>

            {/* Incident Counters */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[11px]">Stage 1-2 Warnings</span>
                <div className="font-mono text-base font-bold text-amber-400 tabular-nums">
                  {activeTrip.warningCount}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[11px]">Critical Alerts</span>
                <div className="font-mono text-base font-bold text-rose-400 tabular-nums">
                  {activeTrip.criticalCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Modals */}
      <ScoreFormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        result={riskResult}
      />

      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentMetrics={metrics}
        driverId={driverId}
        onSaveBaseline={(newBase) => {
          riskEngineRef.current.resetTemporalState();
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        weights={riskEngineRef.current.getWeights()}
        onUpdateWeights={(newWeights) => {
          riskEngineRef.current.updateWeights(newWeights);
        }}
      />
    </div>
  );
};

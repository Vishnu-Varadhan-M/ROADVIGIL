/**
 * DriveGuard AI — Baseline Calibration Wizard Modal
 */

import React, { useState, useEffect } from 'react';
import { Target, X, CheckCircle2, RotateCw, AlertTriangle } from 'lucide-react';
import { BaselineCalibrator } from '../engine/calibration';
import { FacialMetrics, DriverBaseline } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentMetrics: FacialMetrics;
  driverId: string;
  onSaveBaseline: (baseline: DriverBaseline) => void;
}

export const CalibrationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentMetrics,
  driverId,
  onSaveBaseline
}) => {
  const [calibrator] = useState(() => new BaselineCalibrator(20));
  const [phase, setPhase] = useState<'IDLE' | 'CALIBRATING' | 'COMPLETED'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [remainingSec, setRemainingSec] = useState(20);
  const [sampleCount, setSampleCount] = useState(0);
  const [resultBaseline, setResultBaseline] = useState<DriverBaseline | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPhase('IDLE');
      calibrator.stop();
      return;
    }
  }, [isOpen, calibrator]);

  useEffect(() => {
    if (phase !== 'CALIBRATING') return;

    calibrator.addSample(currentMetrics);
    const status = calibrator.getProgress();
    setProgress(status.progress);
    setRemainingSec(status.remainingSeconds);
    setSampleCount(status.sampleCount);

    if (status.isComplete) {
      const baseline = calibrator.finalizeCalibration(driverId);
      setResultBaseline(baseline);
      setPhase('COMPLETED');
    }
  }, [phase, currentMetrics, calibrator, driverId]);

  if (!isOpen) return null;

  const handleStart = () => {
    calibrator.start();
    setPhase('CALIBRATING');
    setResultBaseline(null);
  };

  const handleSave = () => {
    if (resultBaseline) {
      onSaveBaseline(resultBaseline);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Driver Baseline Calibration</h2>
            <p className="text-xs text-slate-400">Personalized 20-second biometric & gaze alignment</p>
          </div>
        </div>

        {phase === 'IDLE' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              Every driver has unique facial geometry, natural eye openness, and seating postures.
              Baseline calibration observes you for 20 seconds to establish:
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-cyan-400">Natural Open Eye (EAR):</span>
                <p className="text-slate-400 mt-1">Prevents false alarms for naturally narrower eyelids.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-emerald-400">Neutral Gaze Vector:</span>
                <p className="text-slate-400 mt-1">Accounts for dashboard camera angle & driver height.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-amber-400">Blink Frequency:</span>
                <p className="text-slate-400 mt-1">Establishes personal baseline blinks per minute.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-purple-400">Resting Mouth Aspect:</span>
                <p className="text-slate-400 mt-1">Distinguishes speaking/breathing from true yawning.</p>
              </div>
            </div>

            <div className="p-3 rounded bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-300">
              <strong>Instructions:</strong> Sit comfortably, look straight ahead through the windshield, and blink normally. Do not exaggerate expressions.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="px-5 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
              >
                Start 20s Calibration
              </button>
            </div>
          </div>
        )}

        {phase === 'CALIBRATING' && (
          <div className="space-y-5 text-center py-4">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-cyan-400 transition-all duration-300 ease-out"
                  fill="transparent"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * progress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold font-mono text-white tabular-nums">{remainingSec}</span>
                <span className="block text-[10px] text-slate-400 uppercase tracking-widest">sec</span>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">Analyzing Facial Posture...</h3>
              <p className="text-xs text-slate-400 mt-1">Remain in your normal forward driving posture</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-left bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500">Live EAR</span>
                <div className="font-mono text-cyan-400 font-bold tabular-nums">{currentMetrics.avgEAR.toFixed(3)}</div>
              </div>
              <div>
                <span className="text-slate-500">Head Pitch</span>
                <div className="font-mono text-emerald-400 font-bold tabular-nums">{currentMetrics.headPose.pitch.toFixed(1)}°</div>
              </div>
              <div>
                <span className="text-slate-500">Samples</span>
                <div className="font-mono text-slate-300 font-bold tabular-nums">{sampleCount}</div>
              </div>
            </div>
          </div>
        )}

        {phase === 'COMPLETED' && resultBaseline && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-white">Personalized Baseline Computed!</div>
                <div className="text-xs text-emerald-300">Custom thresholds applied for high accuracy.</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Personalized Open EAR:</span>
                <div className="text-lg font-mono font-bold text-cyan-400 tabular-nums">{resultBaseline.baselineEAR}</div>
                <div className="text-[11px] text-slate-500">Custom closure threshold: {(resultBaseline.baselineEAR * 0.70).toFixed(2)}</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Neutral Gaze Pose:</span>
                <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
                  Pitch: {resultBaseline.baselineHeadPitch}°, Yaw: {resultBaseline.baselineHeadYaw}°
                </div>
                <div className="text-[11px] text-slate-500">Dashboard offset accounted</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Normal Blink Cadence:</span>
                <div className="text-lg font-mono font-bold text-amber-400 tabular-nums">{resultBaseline.baselineBlinkRate} bpm</div>
                <div className="text-[11px] text-slate-500">Nominal range: 12-24 bpm</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Resting Mouth MAR:</span>
                <div className="text-lg font-mono font-bold text-purple-400 tabular-nums">{resultBaseline.baselineMAR}</div>
                <div className="text-[11px] text-slate-500">Custom yawn threshold: {(resultBaseline.baselineMAR * 2.8).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleStart}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Recalibrate
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                Save Baseline Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * DriveGuard AI — Risk Engine Configurable Thresholds & Weights
 */

import React, { useState } from 'react';
import { Sliders, X, RotateCcw, Check } from 'lucide-react';
import { RiskEngineWeights } from '../types';
import { DEFAULT_WEIGHTS } from '../engine/riskEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  weights: RiskEngineWeights;
  onUpdateWeights: (newWeights: RiskEngineWeights) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  weights,
  onUpdateWeights
}) => {
  const [formData, setFormData] = useState<RiskEngineWeights>({ ...weights });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (key: keyof RiskEngineWeights, value: number) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFormData({ ...DEFAULT_WEIGHTS });
  };

  const handleSave = () => {
    onUpdateWeights(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Risk Engine Parameters</h2>
            <p className="text-xs text-slate-400">Tuning thresholds for demonstration & sensitivity evaluation</p>
          </div>
        </div>

        <div className="space-y-4 my-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-semibold text-slate-200">Eye Aspect Ratio (EAR) Threshold</span>
              <span className="font-mono text-cyan-400 tabular-nums">{formData.earClosureThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.30"
              step="0.01"
              value={formData.earClosureThreshold}
              onChange={e => handleChange('earClosureThreshold', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Frames with EAR below this value count as closed eyelids.</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-semibold text-slate-200">Prolonged Closure Time (Stage 2 Warning)</span>
              <span className="font-mono text-amber-400 tabular-nums">{formData.prolongedClosureTimeSec.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.1"
              value={formData.prolongedClosureTimeSec}
              onChange={e => handleChange('prolongedClosureTimeSec', parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Sustained closure beyond normal blinks (0.1s - 0.4s) before warning.</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-semibold text-slate-200">Microsleep Duration (Stage 3 Critical)</span>
              <span className="font-mono text-rose-400 tabular-nums">{formData.microsleepTimeSec.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="1.2"
              max="3.5"
              step="0.1"
              value={formData.microsleepTimeSec}
              onChange={e => handleChange('microsleepTimeSec', parseFloat(e.target.value))}
              className="w-full accent-rose-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Imminent collision hazard threshold triggering loud emergency alarm.</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-semibold text-slate-200">PERCLOS Drowsy Trigger</span>
              <span className="font-mono text-indigo-400 tabular-nums">{(formData.perclosDrowsyThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.08"
              max="0.30"
              step="0.01"
              value={formData.perclosDrowsyThreshold}
              onChange={e => handleChange('perclosDrowsyThreshold', parseFloat(e.target.value))}
              className="w-full accent-indigo-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Percentage of eye closure over 30s window indicating chronic drowsiness.</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-semibold text-slate-200">Yawn Mouth Aspect (MAR) Threshold</span>
              <span className="font-mono text-purple-400 tabular-nums">{formData.yawnMARThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="0.55"
              step="0.01"
              value={formData.yawnMARThreshold}
              onChange={e => handleChange('yawnMARThreshold', parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-semibold text-slate-200">Head Yaw Distraction Angle</span>
              <span className="font-mono text-orange-400 tabular-nums">±{formData.headYawDistractionDeg}°</span>
            </div>
            <input
              type="range"
              min="15"
              max="45"
              step="1"
              value={formData.headYawDistractionDeg}
              onChange={e => handleChange('headYawDistractionDeg', parseInt(e.target.value))}
              className="w-full accent-orange-400 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : null}
              {savedSuccess ? 'Saved!' : 'Apply Parameters'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

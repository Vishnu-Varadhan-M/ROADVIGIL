/**
 * DriveGuard AI — Explainable Safety Score Formula Modal
 */

import React from 'react';
import { Calculator, X, ShieldAlert, Award } from 'lucide-react';
import { RiskEngineResult } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result: RiskEngineResult;
}

export const ScoreFormulaModal: React.FC<Props> = ({ isOpen, onClose, result }) => {
  if (!isOpen) return null;

  const { scoreBreakdown, safetyScore, primaryCause, recommendation } = result;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Explainable Safety Score Engine</h2>
            <p className="text-xs text-slate-400">Mathematical derivation & penalty deduction ledger</p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 my-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Formula Equation</span>
            <span className="text-xs font-mono text-cyan-400">S = max(0, 100 − Σ Penalties)</span>
          </div>
          <div className="font-mono text-sm text-slate-200 bg-slate-900/90 p-3 rounded border border-slate-800/80">
            Score = 100 
            <span className="text-rose-400"> − P_closure ({scoreBreakdown.prolongedClosurePenalty})</span>
            <span className="text-amber-400"> − P_fatigue ({scoreBreakdown.fatiguePenalty})</span>
            <span className="text-orange-400"> − P_distract ({scoreBreakdown.distractionPenalty})</span>
            <span className="text-purple-400"> − P_repeated ({scoreBreakdown.repeatedEventPenalty})</span>
            <span className="text-blue-400"> − P_duration ({scoreBreakdown.continuousDurationPenalty})</span>
          </div>
        </div>

        <div className="space-y-2 mb-5 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/70 border border-slate-800/60">
            <span className="text-slate-300">Base Nominal Score</span>
            <span className="font-mono tabular-nums font-semibold text-emerald-400">+100</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/70 border border-slate-800/60">
            <div>
              <div className="text-slate-300 font-medium">Prolonged Closure / Microsleep Penalty</div>
              <div className="text-slate-500 text-[11px]">Deducts up to 35 points if eye closure duration &gt; 1.4s</div>
            </div>
            <span className="font-mono tabular-nums font-semibold text-rose-400">
              {scoreBreakdown.prolongedClosurePenalty > 0 ? `-${scoreBreakdown.prolongedClosurePenalty}` : '0'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/70 border border-slate-800/60">
            <div>
              <div className="text-slate-300 font-medium">Cumulative Fatigue & Yawn Penalty</div>
              <div className="text-slate-500 text-[11px]">Deducts points for PERCLOS &gt; 15% and deep yawning cycles</div>
            </div>
            <span className="font-mono tabular-nums font-semibold text-amber-400">
              {scoreBreakdown.fatiguePenalty > 0 ? `-${scoreBreakdown.fatiguePenalty}` : '0'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/70 border border-slate-800/60">
            <div>
              <div className="text-slate-300 font-medium">Attention & Gaze Deviation Penalty</div>
              <div className="text-slate-500 text-[11px]">Deducts 20 points for looking away (&gt;24° yaw) or head nodding (&lt;-16° pitch)</div>
            </div>
            <span className="font-mono tabular-nums font-semibold text-orange-400">
              {scoreBreakdown.distractionPenalty > 0 ? `-${scoreBreakdown.distractionPenalty}` : '0'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/70 border border-slate-800/60">
            <div>
              <div className="text-slate-300 font-medium">Repeated Warnings Penalty</div>
              <div className="text-slate-500 text-[11px]">Deducts 5 points per past warning event in trip session (max 25)</div>
            </div>
            <span className="font-mono tabular-nums font-semibold text-purple-400">
              {scoreBreakdown.repeatedEventPenalty > 0 ? `-${scoreBreakdown.repeatedEventPenalty}` : '0'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/70 border border-slate-800/60">
            <div>
              <div className="text-slate-300 font-medium">Continuous Driving Duration Penalty</div>
              <div className="text-slate-500 text-[11px]">Deducts 10 points for continuous drives exceeding 2 hours without rest</div>
            </div>
            <span className="font-mono tabular-nums font-semibold text-blue-400">
              {scoreBreakdown.continuousDurationPenalty > 0 ? `-${scoreBreakdown.continuousDurationPenalty}` : '0'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg font-bold font-mono text-xl tabular-nums ${
              safetyScore >= 85 ? 'bg-emerald-500/10 text-emerald-400' :
              safetyScore >= 65 ? 'bg-amber-500/10 text-amber-400' :
              'bg-rose-500/10 text-rose-400'
            }`}>
              {safetyScore}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Current Computed Safety Score</div>
              <div className="text-[11px] text-slate-400">{primaryCause}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors cursor-pointer"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};

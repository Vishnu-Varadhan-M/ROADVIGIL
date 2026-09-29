/**
 * DriveGuard AI — Privacy & Edge Computing Modal
 */

import React from 'react';
import { ShieldCheck, Lock, EyeOff, Cpu, X, Server } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Privacy-First Architecture</h2>
            <p className="text-xs text-slate-400">Zero raw video streaming · Edge computer vision · GDPR & CCPA compliant design</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5 text-sm">
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
              <Cpu className="w-4 h-4" />
              <span>100% Client-Side Processing</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Camera video frames are processed entirely in memory on the device via MediaPipe & WebGL. No video feed or facial photos are ever saved to disk or streamed to remote servers.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
              <EyeOff className="w-4 h-4" />
              <span>Data Minimization</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Only abstract numeric telemetry is transmitted (e.g. Eye Aspect Ratio: 0.28, PERCLOS: 0.04). Biometric identity landmarks are immediately discarded after vector calculation.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
              <Lock className="w-4 h-4" />
              <span>Safety Event Metadata Only</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When a Stage 3 or 4 incident occurs, the database stores solely timestamp, event type, duration, and numeric values. No surveillance logs or driver cabin recordings exist.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2">
              <Server className="w-4 h-4" />
              <span>Role-Based Access Control</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Drivers have full visibility over their own live HUD and baselines. Fleet managers receive aggregated safety indices and emergency dispatch alerts without invasive video access.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 mb-6">
          <span className="font-semibold text-slate-200">Legal & Operational Disclaimer:</span> DriveGuard AI is an intelligent early-warning decision-support tool. It does not provide medical diagnostic conclusions nor guarantee collision immunity. Drivers retain primary responsibility for vehicle operation.
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};

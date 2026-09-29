/**
 * DriveGuard AI — Simulation & Interview Demonstration Console
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  Zap,
  Sliders,
  AlertTriangle,
  ShieldCheck,
  Eye,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { simulationEngine, SimulationScenario } from '../engine/simulationEngine';
import { AttentionState } from '../types';

interface Props {
  onScenarioSelect: (scenario: SimulationScenario) => void;
  currentScenario: SimulationScenario;
}

export const DemoSimulator: React.FC<Props> = ({
  onScenarioSelect,
  currentScenario
}) => {
  const [isManual, setIsManual] = useState(simulationEngine.isManual());
  const [manualValues, setManualValues] = useState(simulationEngine.getManualValues());
  const [lastInjectedAction, setLastInjectedAction] = useState<string | null>(null);

  const handleScenarioChange = (scenario: SimulationScenario) => {
    simulationEngine.setScenario(scenario);
    onScenarioSelect(scenario);
    setIsManual(false);
    setLastInjectedAction(`Scenario switched to: ${scenario.replace(/_/g, ' ')}`);
  };

  const handleManualSlider = (key: keyof typeof manualValues, value: any) => {
    const updated = { ...manualValues, [key]: value };
    setManualValues(updated);
    setIsManual(true);
    simulationEngine.setManualControl(true, updated);
  };

  const handleInjectBlink = () => {
    // Normal blink test: drop EAR to 0.12 for 200ms, then restore
    handleManualSlider('ear', 0.12);
    handleManualSlider('closureSec', 0.2);
    setLastInjectedAction('Injected 200ms physiological blink. Note: False-alarm logic correctly suppresses alert.');
    setTimeout(() => {
      handleManualSlider('ear', 0.31);
      handleManualSlider('closureSec', 0);
    }, 250);
  };

  const handleInjectMicrosleep = () => {
    // Stage 3 test: sustained 2.2s closure
    handleManualSlider('ear', 0.11);
    handleManualSlider('closureSec', 2.2);
    handleManualSlider('pitch', -15);
    setLastInjectedAction('Injected 2.2s microsleep episode. Triggered Stage 3 Critical Alert & safety event.');
  };

  const handleInjectDistraction = () => {
    // Looking away 35 degrees
    handleManualSlider('yaw', 35);
    handleManualSlider('attention', 'LOOKING_AWAY');
    setLastInjectedAction('Injected 35° lateral head turn. Triggered Stage 2 Driver Warning.');
  };

  const handleInjectRepeatedEscalation = () => {
    simulationEngine.incrementRepeatedEvents();
    simulationEngine.incrementRepeatedEvents();
    simulationEngine.incrementRepeatedEvents();
    simulationEngine.incrementRepeatedEvents();
    handleScenarioChange('REPEATED_FATIGUE_ESCALATION');
    setLastInjectedAction('Injected 4 repeated fatigue events. Triggered Stage 4 Fleet Owner Alert escalation.');
  };

  const handleReset = () => {
    simulationEngine.setManualControl(false);
    setIsManual(false);
    handleScenarioChange('NORMAL_DRIVING');
    setLastInjectedAction('Reset to normal baseline driving.');
  };

  return (
    <div className="space-y-6">
      {/* Simulation Header with DEMO DATA Badge */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Interview Demonstration & Scenario Simulator</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DEMO DATA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inject synthetic telemetry into the exact same Risk Engine and Alert Architecture without requiring ideal camera lighting.
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All</span>
        </button>
      </div>

      {/* Scenario Presets Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-400">1. Instant Scenario Presets</span>
          <span className="text-slate-500">Click any card to load deterministic behavior</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Preset 1 */}
          <button
            onClick={() => handleScenarioChange('NORMAL_DRIVING')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              currentScenario === 'NORMAL_DRIVING' && !isManual
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white text-xs">Normal Attentive Driving</span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">STAGE 0 · SAFE</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard voluntary blinks (180ms), EAR ~0.31, MAR ~0.09, centered forward gaze. Score: ~96.
            </p>
          </button>

          {/* Preset 2 */}
          <button
            onClick={() => handleScenarioChange('EARLY_FATIGUE')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              currentScenario === 'EARLY_FATIGUE' && !isManual
                ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white text-xs">Early Fatigue & Yawning</span>
              <span className="text-[10px] font-mono text-amber-400 font-semibold">STAGE 1 · LOW RISK</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sluggish eye flutter (450ms), repeated yawning cycles (MAR 0.44), PERCLOS ~19%. Score: ~78.
            </p>
          </button>

          {/* Preset 3 */}
          <button
            onClick={() => handleScenarioChange('PROLONGED_CLOSURE')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              currentScenario === 'PROLONGED_CLOSURE' && !isManual
                ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white text-xs">Prolonged Closure / Microsleep</span>
              <span className="text-[10px] font-mono text-rose-400 font-semibold">STAGE 3 · CRITICAL</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sustained eye closure &gt; 2.0s with head dipping down. Triggers high-priority audible siren & incident log. Score: ~38.
            </p>
          </button>

          {/* Preset 4 */}
          <button
            onClick={() => handleScenarioChange('DRIVER_DISTRACTION')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              currentScenario === 'DRIVER_DISTRACTION' && !isManual
                ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white text-xs">Driver Distraction (Looking Away)</span>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">STAGE 2 · MODERATE</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gaze turned sideways (Yaw 34°) or down at lap mobile screen. Warning prompts driver to refocus. Score: ~62.
            </p>
          </button>

          {/* Preset 5 */}
          <button
            onClick={() => handleScenarioChange('REPEATED_FATIGUE_ESCALATION')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              currentScenario === 'REPEATED_FATIGUE_ESCALATION' && !isManual
                ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white text-xs">Chronic Repeated Fatigue</span>
              <span className="text-[10px] font-mono text-purple-400 font-semibold">STAGE 4 · FLEET ALERT</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Persistent unresolved Stage 3 condition with 4+ warnings. Triggers automated fleet dispatch escalation. Score: ~22.
            </p>
          </button>
        </div>
      </div>

      {/* Quick Event Injector (Tests False Alarm Logic & Escalations) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            2. High-Frequency Event Injector
          </span>
          <span className="text-xs text-slate-500">Live validation of temporal smoothing & escalation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={handleInjectBlink}
            className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span>Normal Blink (200ms)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Proves single short blink does NOT cause false alarm.
            </p>
          </button>

          <button
            onClick={handleInjectMicrosleep}
            className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 mb-1">
              <Zap className="w-4 h-4" />
              <span>Microsleep (2.2s)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Validates Stage 3 critical siren & safety event creation.
            </p>
          </button>

          <button
            onClick={handleInjectDistraction}
            className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
              <Eye className="w-4 h-4" />
              <span>Side Distraction (35°)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Tests head pose yaw penalty and refocus warning.
            </p>
          </button>

          <button
            onClick={handleInjectRepeatedEscalation}
            className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/50 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Stage 4 Fleet Alert</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Tests automated fleet dispatch notification.
            </p>
          </button>
        </div>

        {lastInjectedAction && (
          <div className="mt-3 p-2.5 rounded bg-slate-950/80 border border-cyan-800/40 text-xs text-cyan-300 font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
            <span>{lastInjectedAction}</span>
          </div>
        )}
      </div>

      {/* Manual Fine-Tuning Sliders */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            3. Continuous Telemetry Sliders (Manual Override)
          </span>
          <span className={`text-[11px] font-mono ${isManual ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
            {isManual ? 'MANUAL CONTROL ENGAGED' : 'SCENARIO DRIVEN'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium">Eye Aspect Ratio (EAR)</span>
              <span className="font-mono text-cyan-400 tabular-nums font-bold">{manualValues.ear.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.08"
              max="0.40"
              step="0.01"
              value={manualValues.ear}
              onChange={e => handleManualSlider('ear', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium">Sustained Eye Closure Duration</span>
              <span className="font-mono text-rose-400 tabular-nums font-bold">{manualValues.closureSec.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="3.5"
              step="0.1"
              value={manualValues.closureSec}
              onChange={e => handleManualSlider('closureSec', parseFloat(e.target.value))}
              className="w-full accent-rose-400 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium">Mouth Aspect Ratio (MAR - Yawn)</span>
              <span className="font-mono text-purple-400 tabular-nums font-bold">{manualValues.mar.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.01"
              value={manualValues.mar}
              onChange={e => handleManualSlider('mar', parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium">Head Yaw (Looking Left / Right)</span>
              <span className="font-mono text-amber-400 tabular-nums font-bold">{manualValues.yaw}°</span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              step="1"
              value={manualValues.yaw}
              onChange={e => handleManualSlider('yaw', parseInt(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

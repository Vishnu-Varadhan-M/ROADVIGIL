/**
 * DriveGuard AI — Static Photo Vision Lab & Biometric Diagnostic Scanner
 * 
 * Provides static photo upload, benchmark scenario testing, precision
 * computer-vision landmark overlays, and formal client validation reports.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Sliders,
  FileText,
  Download,
  ShieldCheck,
  Compass,
  Activity,
  Layers,
  Sparkles,
  Info,
  RefreshCw
} from 'lucide-react';
import { photoAnalyzer, PhotoAnalysisResult } from '../engine/imageAnalyzer';
import { SAMPLE_DRIVER_PHOTOS, SampleDriverPhoto } from '../data/sampleDriverPhotos';
import { ScoreFormulaModal } from './ScoreFormulaModal';

interface Props {
  onTriggerEvent?: (event: any) => void;
}

export const PhotoAnalysisLab: React.FC<Props> = ({ onTriggerEvent }) => {
  const [selectedSample, setSelectedSample] = useState<SampleDriverPhoto>(SAMPLE_DRIVER_PHOTOS[0]);
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(SAMPLE_DRIVER_PHOTOS[0].dataUri);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [overlayStyle, setOverlayStyle] = useState<'FULL' | 'ANCHORS' | 'BOXES' | 'CLEAN'>('ANCHORS');
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analyze whenever currentImageSrc changes
  useEffect(() => {
    let active = true;
    setIsAnalyzing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentImageSrc;

    img.onload = async () => {
      if (!active) return;
      try {
        const result = await photoAnalyzer.analyzeImage(img);
        if (!active) return;
        setAnalysisResult(result);
        drawAnnotations(img, result);
      } catch (err) {
        console.error('Photo analysis error:', err);
      } finally {
        if (active) setIsAnalyzing(false);
      }
    };

    return () => {
      active = false;
    };
  }, [currentImageSrc, overlayStyle]);

  // Re-draw annotations on overlay style switch
  const drawAnnotations = (img: HTMLImageElement, result: PhotoAnalysisResult) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw background image scaled to canvas
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    if (overlayStyle === 'CLEAN' || !result.faceDetected) return;

    const scaleX = width / result.imageWidth;
    const scaleY = height / result.imageHeight;

    // 1. Draw Face Bounding Box
    if (result.faceBoundingBox) {
      const fb = result.faceBoundingBox;
      const bx = fb.x * scaleX;
      const by = fb.y * scaleY;
      const bw = fb.width * scaleX;
      const bh = fb.height * scaleY;

      const boxColor = result.riskEvaluation.riskLevel === 'CRITICAL' ? '#f43f5e' :
                       result.riskEvaluation.riskLevel === 'HIGH' ? '#fb923c' :
                       result.riskEvaluation.riskLevel === 'MODERATE' ? '#fbbf24' : '#10b981';

      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 2.5;

      // Draw futuristic corner reticles
      const cl = Math.min(28, bw * 0.2);
      ctx.beginPath();
      // Top-left
      ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by);
      // Top-right
      ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl);
      // Bottom-right
      ctx.moveTo(bx + bw, by + bh - cl); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - cl, by + bh);
      // Bottom-left
      ctx.moveTo(bx + cl, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - cl);
      ctx.stroke();

      // Top label badge
      ctx.fillStyle = boxColor;
      ctx.fillRect(bx, Math.max(0, by - 24), 160, 24);
      ctx.fillStyle = '#090d16';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(`DRIVER DETECTED: ${(result.faceConfidence * 100).toFixed(1)}%`, bx + 6, Math.max(16, by - 8));
    }

    // 2. Draw Eye Bounding Boxes & EAR Annotation
    if ((overlayStyle === 'ANCHORS' || overlayStyle === 'BOXES') && result.leftEyeBox && result.rightEyeBox) {
      const drawBox = (box: { x: number; y: number; width: number; height: number }, label: string, earVal: number) => {
        const x = box.x * scaleX;
        const y = box.y * scaleY;
        const w = box.width * scaleX;
        const h = box.height * scaleY;

        ctx.strokeStyle = earVal < 0.20 ? '#f43f5e' : '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(x, y - 18, 90, 16);
        ctx.fillStyle = earVal < 0.20 ? '#fb7185' : '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${label}: ${earVal.toFixed(3)}`, x + 4, y - 6);
      };

      drawBox(result.leftEyeBox, 'L-EAR', result.metrics.leftEAR);
      drawBox(result.rightEyeBox, 'R-EAR', result.metrics.rightEAR);
    }

    // 3. Draw Mouth Bounding Box & MAR Annotation
    if ((overlayStyle === 'ANCHORS' || overlayStyle === 'BOXES') && result.mouthBox) {
      const mb = result.mouthBox;
      const mx = mb.x * scaleX;
      const my = mb.y * scaleY;
      const mw = mb.width * scaleX;
      const mh = mb.height * scaleY;

      ctx.strokeStyle = result.metrics.isYawning ? '#c084fc' : '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mx, my, mw, mh);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(mx, my + mh + 4, 110, 16);
      ctx.fillStyle = result.metrics.isYawning ? '#e879f9' : '#cbd5e1';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`MAR: ${result.metrics.mar.toFixed(3)}${result.metrics.isYawning ? ' · YAWN' : ''}`, mx + 4, my + mh + 16);
    }

    // 4. Draw Landmark points
    if (overlayStyle === 'FULL' && result.landmarks.length > 300) {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.7)';
      result.landmarks.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, 1.8, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // 5. Gaze Direction Ray
    if (result.landmarks[1]) {
      const nose = result.landmarks[1];
      const nx = nose.x * width;
      const ny = nose.y * height;
      const targetX = nx + (result.metrics.headPose.yaw * 3.5);
      const targetY = ny - (result.metrics.headPose.pitch * 3.5);

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 4.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setCurrentImageSrc(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const exportDossierJSON = () => {
    if (!analysisResult) return;
    const dossier = {
      platform: 'DriveGuard AI Client Diagnostic Scanner',
      timestamp: new Date().toISOString(),
      validationSummary: analysisResult.validationSummary,
      faceDetected: analysisResult.faceDetected,
      confidence: `${(analysisResult.faceConfidence * 100).toFixed(1)}%`,
      metrics: {
        eyeAspectRatio: {
          average: analysisResult.metrics.avgEAR,
          left: analysisResult.metrics.leftEAR,
          right: analysisResult.metrics.rightEAR,
          closureThresholdNominal: 0.21
        },
        mouthAspectRatio: {
          mar: analysisResult.metrics.mar,
          isYawning: analysisResult.metrics.isYawning,
          yawnThresholdNominal: 0.38
        },
        headPose: analysisResult.metrics.headPose,
        attentionState: analysisResult.metrics.attentionState
      },
      riskEvaluation: {
        safetyScore: analysisResult.riskEvaluation.safetyScore,
        riskLevel: analysisResult.riskEvaluation.riskLevel,
        interventionStage: analysisResult.riskEvaluation.interventionStage,
        deductionBreakdown: analysisResult.riskEvaluation.scoreBreakdown,
        primaryCause: analysisResult.riskEvaluation.primaryCause,
        recommendation: analysisResult.riskEvaluation.recommendation
      },
      auditCompliance: 'ISO 26262 Explainable Automotive Safety Prototype'
    };

    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driveguard_biometric_dossier_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const score = analysisResult?.riskEvaluation.safetyScore || 100;
  const scoreColor = score >= 85 ? 'text-emerald-400' :
                     score >= 65 ? 'text-amber-400' :
                     score >= 45 ? 'text-orange-400' : 'text-rose-400';
  const strokeColor = score >= 85 ? '#34d399' :
                      score >= 65 ? '#fbbf24' :
                      score >= 45 ? '#fb923c' : '#f43f5e';

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Static Photo Biometric Diagnostic Lab</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                CLIENT VALIDATION LAB
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload custom driver photography or benchmark against clinical driver state scenarios with full mathematical validation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Driver Photo</span>
          </button>
          <button
            onClick={exportDossierJSON}
            disabled={!analysisResult}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Dossier</span>
          </button>
        </div>
      </div>

      {/* Benchmark Presets Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-400">
            1. Select Benchmark Clinical Photo or Upload Custom
          </span>
          <span className="text-slate-500">1-click instant scenario validation</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SAMPLE_DRIVER_PHOTOS.map(p => {
            const isSelected = selectedSample.id === p.id && currentImageSrc === p.dataUri;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedSample(p);
                  setCurrentImageSrc(p.dataUri);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="aspect-4/3 rounded-lg overflow-hidden bg-slate-950 mb-2 border border-slate-800">
                  <img src={p.dataUri} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-white truncate">
                  <span>{p.name.split('—')[0]}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className={`px-1.5 py-0.2 rounded font-mono font-semibold ${
                    p.expectedState === 'SAFE' ? 'text-emerald-400 bg-emerald-950/60' :
                    p.expectedState === 'CRITICAL' ? 'text-rose-400 bg-rose-950/60' :
                    p.expectedState === 'WARNING' ? 'text-amber-400 bg-amber-950/60' :
                    'text-slate-400 bg-slate-800'
                  }`}>
                    {p.expectedState}
                  </span>
                  <span className="text-slate-500 font-mono">EAR: {p.expectedEAR}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Analysis Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Annotated Canvas Viewport */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {/* Viewport Top Bar */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Biometric Landmark Canvas</span>
              <span className="text-slate-500">·</span>
              <span className="font-mono text-slate-400 tabular-nums">
                {analysisResult ? `${analysisResult.imageWidth}×${analysisResult.imageHeight}px` : 'Loading...'}
              </span>
            </div>

            {/* Overlay Selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px]">
              <button
                onClick={() => setOverlayStyle('ANCHORS')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${overlayStyle === 'ANCHORS' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
              >
                Anchors
              </button>
              <button
                onClick={() => setOverlayStyle('FULL')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${overlayStyle === 'FULL' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
              >
                468 Mesh
              </button>
              <button
                onClick={() => setOverlayStyle('BOXES')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${overlayStyle === 'BOXES' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
              >
                Boxes
              </button>
              <button
                onClick={() => setOverlayStyle('CLEAN')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${overlayStyle === 'CLEAN' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
              >
                Raw
              </button>
            </div>
          </div>

          {/* Interactive Drag & Drop / Canvas Surface */}
          <div
            className={`relative aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden transition-all ${
              dragActive ? 'ring-2 ring-cyan-400 ring-inset bg-slate-900/90' : ''
            }`}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="w-full h-full object-contain"
            />

            {/* When face is not detected in static photo */}
            {analysisResult && !analysisResult.faceDetected && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-6 text-center z-20 pointer-events-none">
                <div className="p-5 rounded-xl bg-slate-900/95 border border-amber-500/70 shadow-2xl max-w-sm">
                  <AlertTriangle className="w-9 h-9 text-amber-400 mx-auto mb-2 animate-bounce" />
                  <h4 className="text-sm font-bold text-white mb-1">Driver Monitoring Unavailable</h4>
                  <p className="text-xs text-amber-200 leading-relaxed">
                    Facial landmarks lost. System cannot evaluate ocular or head metrics in this photo.
                  </p>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-30">
                <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing facial landmark vectors...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Latency: {analysisResult?.processingTimeMs || 2}ms</span>
            <span>Drag & drop any photo directly onto canvas</span>
          </div>
        </div>

        {/* Right: Formal Client Validation Dossier */}
        <div className="lg:col-span-5 space-y-4">
          {/* Validation Header Card */}
          <div className={`p-5 rounded-xl border transition-all ${
            !analysisResult?.faceDetected ? 'bg-amber-950/30 border-amber-600/60' :
            analysisResult.riskEvaluation.riskLevel === 'SAFE' ? 'bg-emerald-950/30 border-emerald-600/60' :
            analysisResult.riskEvaluation.riskLevel === 'CRITICAL' ? 'bg-rose-950/30 border-rose-600/60' :
            'bg-amber-950/30 border-amber-600/60'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-black/40 text-current">
                  {analysisResult?.validationSummary.status === 'VALID_SAFE' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : analysisResult?.validationSummary.status === 'VALID_CRITICAL' ? (
                    <XCircle className="w-6 h-6 text-rose-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 font-mono">
                    {analysisResult?.validationSummary.status.replace(/_/g, ' ')}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {analysisResult?.validationSummary.title}
                  </h3>
                </div>
              </div>

              {analysisResult?.faceDetected && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Score</span>
                  <span className={`text-2xl font-extrabold font-mono tabular-nums ${scoreColor}`}>
                    {score}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {analysisResult?.validationSummary.details}
            </p>
          </div>

          {/* Detailed Metric Inspection Ledger */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Physiological Validation Ledger
              </h4>
              <button
                onClick={() => setIsFormulaModalOpen(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Formula</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[11px]">Eye Openness (EAR)</span>
                <div className={`text-lg font-mono font-bold tabular-nums mt-0.5 ${
                  (analysisResult?.metrics.avgEAR || 0) < 0.20 ? 'text-rose-400' : 'text-cyan-400'
                }`}>
                  {analysisResult?.metrics.avgEAR.toFixed(3) || '0.000'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Threshold: 0.210 · {analysisResult?.validationSummary.eyesState.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[11px]">Mouth Aspect (MAR)</span>
                <div className={`text-lg font-mono font-bold tabular-nums mt-0.5 ${
                  (analysisResult?.metrics.mar || 0) >= 0.38 ? 'text-purple-400' : 'text-slate-200'
                }`}>
                  {analysisResult?.metrics.mar.toFixed(3) || '0.000'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Threshold: 0.380 · {analysisResult?.validationSummary.mouthState}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[11px]">Head Pose (Pitch / Yaw)</span>
                <div className="text-sm font-mono font-bold text-slate-200 tabular-nums mt-0.5">
                  {analysisResult?.metrics.headPose.pitch}° · {analysisResult?.metrics.headPose.yaw}°
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {analysisResult?.validationSummary.gazeState.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[11px]">Biometric Confidence</span>
                <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                  {((analysisResult?.faceConfidence || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Skin & contour verified</div>
              </div>
            </div>

            {/* Score Deductions Table */}
            {analysisResult && analysisResult.faceDetected && (
              <div className="pt-2 border-t border-slate-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Base Score:</span>
                  <span className="text-emerald-400">+100</span>
                </div>
                {analysisResult.riskEvaluation.scoreBreakdown.prolongedClosurePenalty > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Closure Penalty:</span>
                    <span>-{analysisResult.riskEvaluation.scoreBreakdown.prolongedClosurePenalty}</span>
                  </div>
                )}
                {analysisResult.riskEvaluation.scoreBreakdown.fatiguePenalty > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Fatigue / Yawn Penalty:</span>
                    <span>-{analysisResult.riskEvaluation.scoreBreakdown.fatiguePenalty}</span>
                  </div>
                )}
                {analysisResult.riskEvaluation.scoreBreakdown.distractionPenalty > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Gaze Distraction Penalty:</span>
                    <span>-{analysisResult.riskEvaluation.scoreBreakdown.distractionPenalty}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                  <span>Calculated Safety Score:</span>
                  <span className={scoreColor}>{score} / 100</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {analysisResult && (
        <ScoreFormulaModal
          isOpen={isFormulaModalOpen}
          onClose={() => setIsFormulaModalOpen(false)}
          result={analysisResult.riskEvaluation}
        />
      )}
    </div>
  );
};

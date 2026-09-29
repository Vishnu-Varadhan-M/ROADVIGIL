/**
 * DriveGuard AI — Curated Driver Benchmark Photos for Client Demonstrations
 * High-definition vector-rendered driver portraits representing key clinical & operational states.
 */

export interface SampleDriverPhoto {
  id: string;
  name: string;
  scenario: string;
  expectedState: 'SAFE' | 'WARNING' | 'CRITICAL' | 'INVALID';
  expectedEAR: string;
  expectedMAR: string;
  description: string;
  dataUri: string;
}

// Helper to create an SVG data URI
function createDriverSVG(opts: {
  bgHue: string;
  eyeHeight: number; // 2 to 14
  mouthHeight: number; // 4 to 28
  mouthWidth?: number;
  faceOffsetX?: number; // -30 to 30
  faceOffsetY?: number;
  showEyesClosedLine?: boolean;
  skinTone?: string;
  showFace?: boolean;
}): string {
  if (opts.showFace === false) {
    // Empty vehicle cockpit without driver
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="url(#bg)" />
      <!-- Driver headrest and empty seat -->
      <path d="M 220 180 C 220 120, 420 120, 420 180 L 440 380 L 200 380 Z" fill="#1e293b" stroke="#334155" stroke-width="3" />
      <path d="M 260 200 C 260 160, 380 160, 380 200 L 390 320 L 250 320 Z" fill="#0f172a" stroke="#1e293b" stroke-width="2" />
      <!-- Steering wheel rim -->
      <circle cx="320" cy="460" r="160" fill="none" stroke="#334155" stroke-width="24" />
      <text x="320" y="270" font-family="system-ui, sans-serif" font-size="16" fill="#64748b" text-anchor="middle" font-weight="600">
        [CABIN INTERIOR — SEAT UNOCCUPIED]
      </text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  const ox = opts.faceOffsetX || 0;
  const oy = opts.faceOffsetY || 0;
  const skin = opts.skinTone || '#d4a373';
  const eyeH = opts.eyeHeight;
  const mouthH = opts.mouthHeight;
  const mouthW = opts.mouthWidth || 48;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16" />
        <stop offset="100%" stop-color="${opts.bgHue}" />
      </linearGradient>
      <radialGradient id="skinGrad" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stop-color="${skin}" />
        <stop offset="100%" stop-color="#9a6745" />
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.6"/>
      </filter>
    </defs>
    <!-- Background cabin -->
    <rect width="640" height="480" fill="url(#bg)" />
    <!-- Rear headrest -->
    <rect x="220" y="80" width="200" height="320" rx="30" fill="#131b2e" />
    
    <!-- Driver Torso -->
    <path d="M ${160 + ox * 0.4} 480 L ${230 + ox * 0.5} 360 L ${410 + ox * 0.5} 360 L ${480 + ox * 0.4} 480 Z" fill="#1e293b" />
    
    <!-- Neck -->
    <rect x="${290 + ox}" y="${290 + oy}" width="60" height="80" fill="#a77755" />

    <!-- Head / Face Oval -->
    <ellipse cx="${320 + ox}" cy="${220 + oy}" rx="92" ry="118" fill="url(#skinGrad)" filter="url(#shadow)" />
    
    <!-- Hair -->
    <path d="M ${226 + ox} 200 C ${224 + ox} 100, ${416 + ox} 100, ${414 + ox} 200 C ${380 + ox} 130, ${260 + ox} 130, ${226 + ox} 200 Z" fill="#1a181b" />

    <!-- Eyebrows -->
    <path d="M ${255 + ox} ${168 + oy} Q ${280 + ox} ${160 + oy} ${300 + ox} ${168 + oy}" stroke="#2d221c" stroke-width="4.5" fill="none" stroke-linecap="round" />
    <path d="M ${340 + ox} ${168 + oy} Q ${360 + ox} ${160 + oy} ${385 + ox} ${168 + oy}" stroke="#2d221c" stroke-width="4.5" fill="none" stroke-linecap="round" />

    <!-- Eyes -->
    ${opts.showEyesClosedLine ? `
      <!-- Closed Eyelids (Microsleep / Sleep) -->
      <path d="M ${256 + ox} ${192 + oy} Q ${278 + ox} ${198 + oy} ${300 + ox} ${192 + oy}" stroke="#3e2318" stroke-width="4" fill="none" stroke-linecap="round" />
      <path d="M ${340 + ox} ${192 + oy} Q ${362 + ox} ${198 + oy} ${384 + ox} ${192 + oy}" stroke="#3e2318" stroke-width="4" fill="none" stroke-linecap="round" />
    ` : `
      <!-- Open Eyes with Sclera & Dark Pupils -->
      <ellipse cx="${278 + ox}" cy="${190 + oy}" rx="22" ry="${eyeH}" fill="#ffffff" stroke="#3e2318" stroke-width="2" />
      <circle cx="${278 + ox}" cy="${190 + oy}" r="${Math.min(eyeH, 7)}" fill="#1c1917" />
      <circle cx="${280 + ox}" cy="${188 + oy}" r="2" fill="#ffffff" opacity="0.8" />

      <ellipse cx="${362 + ox}" cy="${190 + oy}" rx="22" ry="${eyeH}" fill="#ffffff" stroke="#3e2318" stroke-width="2" />
      <circle cx="${362 + ox}" cy="${190 + oy}" r="${Math.min(eyeH, 7)}" fill="#1c1917" />
      <circle cx="${364 + ox}" cy="${188 + oy}" r="2" fill="#ffffff" opacity="0.8" />
    `}

    <!-- Nose -->
    <path d="M ${320 + ox} ${190 + oy} L ${314 + ox} ${238 + oy} L ${328 + ox} ${238 + oy}" stroke="#8c5838" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Mouth -->
    ${mouthH > 16 ? `
      <!-- Open Mouth (Yawning) with Dark Cavity -->
      <ellipse cx="${320 + ox}" cy="${275 + oy}" rx="${mouthW / 2}" ry="${mouthH / 2}" fill="#1c0f0a" stroke="#873e23" stroke-width="3" />
      <ellipse cx="${320 + ox}" cy="${275 + oy - mouthH * 0.2}" rx="${mouthW * 0.35}" ry="${mouthH * 0.2}" fill="#ffffff" opacity="0.9" />
    ` : `
      <!-- Normal / Resting Lips -->
      <path d="M ${320 + ox - mouthW / 2} ${275 + oy} Q ${320 + ox} ${275 + oy + mouthH} ${320 + ox + mouthW / 2} ${275 + oy}" stroke="#873e23" stroke-width="3.5" fill="none" stroke-linecap="round" />
    `}

    <!-- Ambient vehicle windshield glare -->
    <path d="M 0 0 L 280 0 L 140 480 L 0 480 Z" fill="#ffffff" opacity="0.02" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_DRIVER_PHOTOS: SampleDriverPhoto[] = [
  {
    id: 'sample-alert',
    name: 'Marcus Vance — Nominal Alert State',
    scenario: 'Normal Daytime Highway Driving',
    expectedState: 'SAFE',
    expectedEAR: '0.318',
    expectedMAR: '0.088',
    description: 'Driver exhibits wide, attentive ocular aperture (EAR 0.32), centered forward roadway focus, and relaxed mouth posture. Safety Score: 96 / SAFE.',
    dataUri: createDriverSVG({
      bgHue: '#0f172a',
      eyeHeight: 11,
      mouthHeight: 4,
      faceOffsetX: 0,
      faceOffsetY: 0
    })
  },
  {
    id: 'sample-microsleep',
    name: 'David Rodriguez — Prolonged Eye Closure (Microsleep)',
    scenario: 'Night Shift Fatigue Event (2:40 AM)',
    expectedState: 'CRITICAL',
    expectedEAR: '0.108',
    expectedMAR: '0.092',
    description: 'Eyelids completely shut with drooping facial posture. EAR collapses to 0.11, triggering Stage 3 Critical Alert & fleet safety incident log.',
    dataUri: createDriverSVG({
      bgHue: '#1e1115',
      eyeHeight: 2,
      mouthHeight: 3,
      faceOffsetX: 0,
      faceOffsetY: 12,
      showEyesClosedLine: true
    })
  },
  {
    id: 'sample-yawn',
    name: 'Sarah Chen — Severe Repetitive Yawning',
    scenario: 'Sustained Drive Hour 3.5',
    expectedState: 'WARNING',
    expectedEAR: '0.245',
    expectedMAR: '0.485',
    description: 'Respiratory fatigue compensation detected with prominent oral cavity enlargement (MAR 0.48). Triggers Stage 1 Early Fatigue visual notification.',
    dataUri: createDriverSVG({
      bgHue: '#1f1b0e',
      eyeHeight: 7, // eyes narrow slightly during deep yawn
      mouthHeight: 26,
      mouthWidth: 54,
      faceOffsetX: 0,
      faceOffsetY: -4
    })
  },
  {
    id: 'sample-distracted',
    name: 'Elena Rostova — Lateral Gaze Distraction',
    scenario: 'Smartphone Interaction / Blind Spot Glance',
    expectedState: 'WARNING',
    expectedEAR: '0.295',
    expectedMAR: '0.105',
    description: 'Head orientation turned sharply to passenger side (Yaw +34°). Attention deviation penalty applies. Triggers Stage 2 Driver Refocus Prompt.',
    dataUri: createDriverSVG({
      bgHue: '#0c1b22',
      eyeHeight: 10,
      mouthHeight: 4,
      faceOffsetX: 38,
      faceOffsetY: 6
    })
  },
  {
    id: 'sample-no-face',
    name: 'Cabin Sensor — Unoccupied / Lens Obscured',
    scenario: 'Camera Sensor Validation Check',
    expectedState: 'INVALID',
    expectedEAR: '0.000',
    expectedMAR: '0.000',
    description: 'Validates system failsafe: Displays "Driver monitoring unavailable — please position face correctly" instead of falsely reporting the driver is asleep.',
    dataUri: createDriverSVG({
      bgHue: '#020617',
      eyeHeight: 0,
      mouthHeight: 0,
      showFace: false
    })
  }
];

import Lenis from 'lenis';

/* ==========================================================================
   GLOBAL CONFIGURATION & CONSTANTS
   ========================================================================== */
const TOTAL_FRAMES = 240;
const FRAME_PATH = (idx) => `/frames/frame_${String(idx).padStart(3, '0')}.webp`;

// Frame cache
const frames = [];
let loadedCount = 0;
let isLoaded = false;

// Render State
let currentFrame = 1;
let targetFrame = 1;

// Audio Synthesizer State
let audioCtx = null;
let analyser = null;
let dataArray = null;
let currentProfile = 'orange'; // 'orange' | 'cream' | 'blue'
let keystrokeCount = 0;

/* ==========================================================================
   1. LENIS SMOOTH SCROLL INITIALIZATION
   ========================================================================== */
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

/* ==========================================================================
   2. 240 WEBP FRAME PRELOADER
   ========================================================================== */
const preloader = document.getElementById('preloader');
const loadingPct = document.getElementById('loading-pct');
const loadingBar = document.getElementById('loading-bar');
const loadingStatus = document.getElementById('loading-status');

function preloadFrames() {
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = FRAME_PATH(i);
    img.onload = () => {
      loadedCount++;
      const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
      if (loadingPct) loadingPct.textContent = `${pct}%`;
      if (loadingBar) loadingBar.style.width = `${pct}%`;

      if (loadedCount === 20 && loadingStatus) {
        loadingStatus.textContent = 'CALIBRATING ACOUSTIC ATTENUATION STACK...';
      } else if (loadedCount === 120 && loadingStatus) {
        loadingStatus.textContent = 'SYNCHRONIZING PORON FOAM HARMONICS...';
      } else if (loadedCount === 200 && loadingStatus) {
        loadingStatus.textContent = 'ENGAGING GASKET ISOLATION SUSPENSION...';
      }

      if (loadedCount === TOTAL_FRAMES) {
        onPreloadComplete();
      }
    };
    img.onerror = () => {
      loadedCount++;
      if (loadedCount === TOTAL_FRAMES) onPreloadComplete();
    };
    frames[i] = img;
  }
}

function onPreloadComplete() {
  isLoaded = true;
  if (loadingStatus) loadingStatus.textContent = 'STREAM READY';
  setTimeout(() => {
    if (preloader) preloader.classList.add('fade-out');
    resizeCanvas();
    renderCanvas();
  }, 350);
}

/* ==========================================================================
   3. FULL BLEED CANVAS RENDERER (NO PADDING, COVER FIT)
   ========================================================================== */
const canvas = document.getElementById('hero-canvas');
const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  ctx.scale(dpr, dpr);
  renderCanvas();
}
window.addEventListener('resize', resizeCanvas);

function renderCanvas() {
  if (!ctx || !canvas) return;
  const frameIdx = Math.min(Math.max(Math.round(currentFrame), 1), TOTAL_FRAMES);
  const img = frames[frameIdx];

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  // Clean background fill matching #ebebeb
  ctx.fillStyle = '#ebebeb';
  ctx.fillRect(0, 0, w, h);

  if (img && img.complete && img.naturalWidth > 0) {
    // Aspect Ratio COVER: Fills 100% of the screen with zero letterboxing / zero padding!
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = w / h;
    let renderW, renderH, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      renderW = w;
      renderH = w / imgRatio;
      offsetX = 0;
      offsetY = (h - renderH) / 2;
    } else {
      renderH = h;
      renderW = h * imgRatio;
      offsetX = (w - renderW) / 2;
      offsetY = 0;
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }
}

// 60FPS Lerp Animation Loop
function updateAnimationLoop() {
  const diff = targetFrame - currentFrame;
  if (Math.abs(diff) > 0.05) {
    currentFrame += diff * 0.16; // smooth responsive interpolation
    renderCanvas();
  }
  requestAnimationFrame(updateAnimationLoop);
}
requestAnimationFrame(updateAnimationLoop);

/* ==========================================================================
   4. SCROLL SYNC & 4-ACT STORYTELLING
   ========================================================================== */
const heroStage = document.getElementById('hero-stage');
const actLayers = [
  document.getElementById('act-1'),
  document.getElementById('act-2'),
  document.getElementById('act-3'),
  document.getElementById('act-4')
];

function onScroll() {
  if (!heroStage) return;

  const rect = heroStage.getBoundingClientRect();
  const totalScroll = heroStage.offsetHeight - window.innerHeight;
  const currentScroll = -rect.top;
  const progress = Math.min(Math.max(currentScroll / totalScroll, 0), 1);

  // Update target frame
  targetFrame = 1 + progress * (TOTAL_FRAMES - 1);

  // Act determination
  let activeAct = 1;
  if (progress >= 0.80) {
    activeAct = 4;
  } else if (progress >= 0.55) {
    activeAct = 3;
  } else if (progress >= 0.25) {
    activeAct = 2;
  } else {
    activeAct = 1;
  }

  // Update Act layers
  actLayers.forEach((layer, idx) => {
    if (layer) {
      if (idx + 1 === activeAct) {
        layer.classList.add('active');
      } else {
        layer.classList.remove('active');
      }
    }
  });
}

window.addEventListener('scroll', onScroll, { passive: true });

/* ==========================================================================
   5. WEB AUDIO API: MECHANICAL SWITCH SYNTHESIS & ACOUSTIC STUDIO
   ========================================================================== */
const readoutHz = document.getElementById('readout-hz');
const readoutKeystrokes = document.getElementById('readout-keystrokes');
const currentSwitchTag = document.getElementById('current-switch-tag');

function initAudio() {
  if (audioCtx) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.8;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  startOscilloscopeLoop();
}

function playMechanicalSwitchSound(profile = currentProfile, isSpacebar = false) {
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  keystrokeCount++;
  if (readoutKeystrokes) readoutKeystrokes.textContent = keystrokeCount;

  // 1. Transient Click Burst (Noise Buffer)
  const bufferSize = audioCtx.sampleRate * 0.025; // 25ms noise burst
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
  }

  const noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = noiseBuffer;

  const noiseFilter = audioCtx.createBiquadFilter();
  const noiseGain = audioCtx.createGain();

  // 2. Fundamental Acoustic Body Oscillator
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();

  let fundamentalFreq = 125;
  let decayTime = 0.055;

  if (profile === 'orange') {
    // 125 Hz Deep Thock with Poron wave foam dampening
    fundamentalFreq = isSpacebar ? 95 : 125 + (Math.random() * 12 - 6);
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(isSpacebar ? 450 : 750, now);
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(fundamentalFreq * 1.8, now);
    osc.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.015);
    decayTime = isSpacebar ? 0.09 : 0.06;
    if (readoutHz) readoutHz.textContent = `${fundamentalFreq.toFixed(1)} Hz`;

  } else if (profile === 'cream') {
    // 210 Hz Creamy Marbly flow
    fundamentalFreq = isSpacebar ? 160 : 210 + (Math.random() * 20 - 10);
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.Q.setValueAtTime(3, now);
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(fundamentalFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.02);
    decayTime = 0.045;
    if (readoutHz) readoutHz.textContent = `${fundamentalFreq.toFixed(1)} Hz`;

  } else if (profile === 'blue') {
    // 820 Hz Crisp High-Clack
    fundamentalFreq = isSpacebar ? 620 : 820 + (Math.random() * 40 - 20);
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1800, now);
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(fundamentalFreq, now);
    osc.frequency.exponentialRampToValueAtTime(fundamentalFreq * 0.9, now + 0.03);
    decayTime = 0.035;
    if (readoutHz) readoutHz.textContent = `${fundamentalFreq.toFixed(1)} Hz`;
  }

  oscGain.gain.setValueAtTime(0.6, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

  // Connect Audio Graph
  noiseNode.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(analyser);

  osc.connect(oscGain);
  oscGain.connect(analyser);

  analyser.connect(audioCtx.destination);

  noiseNode.start(now);
  osc.start(now);
  osc.stop(now + decayTime + 0.01);
}

// Physical Keyboard Listener (Type anywhere to hear acoustic switches!)
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const isSpace = e.code === 'Space';
  playMechanicalSwitchSound(currentProfile, isSpace);

  const keyCap = document.querySelector(`.key-cap[data-key="${e.code}"]`);
  if (keyCap) {
    keyCap.classList.add('pressed');
    setTimeout(() => keyCap.classList.remove('pressed'), 120);
  }
});

// Virtual Keypad Clicks
document.querySelectorAll('.key-cap').forEach((key) => {
  key.addEventListener('mousedown', () => {
    const isSpace = key.classList.contains('key-space');
    playMechanicalSwitchSound(currentProfile, isSpace);
    key.classList.add('pressed');
  });
  key.addEventListener('mouseup', () => key.classList.remove('pressed'));
  key.addEventListener('mouseleave', () => key.classList.remove('pressed'));
});

// Switch Selector Buttons
const switchBtns = document.querySelectorAll('.switch-btn');
switchBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    switchBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentProfile = btn.dataset.profile;

    if (currentSwitchTag) {
      if (currentProfile === 'orange') currentSwitchTag.textContent = 'ACTIVE: ORANGE LINEAR (125 Hz)';
      else if (currentProfile === 'cream') currentSwitchTag.textContent = 'ACTIVE: MUTED CREAM (210 Hz)';
      else if (currentProfile === 'blue') currentSwitchTag.textContent = 'ACTIVE: TACTILE CRISP (820 Hz)';
    }

    playMechanicalSwitchSound(currentProfile, false);
  });
});

/* ==========================================================================
   6. LIVE ACOUSTIC OSCILLOSCOPE
   ========================================================================== */
const oscCanvas = document.getElementById('audio-visualizer-canvas');
const oscCtx = oscCanvas ? oscCanvas.getContext('2d') : null;

function startOscilloscopeLoop() {
  if (!oscCanvas || !oscCtx || !analyser) return;

  function drawOscilloscope() {
    requestAnimationFrame(drawOscilloscope);
    analyser.getByteTimeDomainData(dataArray);

    const w = oscCanvas.width;
    const h = oscCanvas.height;

    oscCtx.fillStyle = 'rgba(23, 24, 26, 0.3)';
    oscCtx.fillRect(0, 0, w, h);

    oscCtx.lineWidth = 2.5;
    oscCtx.strokeStyle = '#ff611a'; // Signature Orange
    oscCtx.shadowColor = 'rgba(255, 97, 26, 0.6)';
    oscCtx.shadowBlur = 8;
    oscCtx.beginPath();

    const sliceWidth = (w * 1.0) / analyser.frequencyBinCount;
    let x = 0;

    for (let i = 0; i < analyser.frequencyBinCount; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;

      if (i === 0) {
        oscCtx.moveTo(x, y);
      } else {
        oscCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    oscCtx.lineTo(w, h / 2);
    oscCtx.stroke();
    oscCtx.shadowBlur = 0;
  }

  drawOscilloscope();
}

// Initial waveform line
if (oscCanvas && oscCtx) {
  oscCtx.fillStyle = '#17181a';
  oscCtx.fillRect(0, 0, oscCanvas.width, oscCanvas.height);
  oscCtx.lineWidth = 2;
  oscCtx.strokeStyle = 'rgba(255, 97, 26, 0.4)';
  oscCtx.beginPath();
  oscCtx.moveTo(0, oscCanvas.height / 2);
  for (let x = 0; x < oscCanvas.width; x += 10) {
    const y = oscCanvas.height / 2 + Math.sin(x * 0.05) * 4;
    oscCtx.lineTo(x, y);
  }
  oscCtx.stroke();
}

/* ==========================================================================
   7. INTERACTIVE MECHANICAL LAYER INSPECTOR
   ========================================================================== */
const layerItems = document.querySelectorAll('.layer-item');
layerItems.forEach((item) => {
  item.addEventListener('click', () => {
    layerItems.forEach((l) => l.classList.remove('active'));
    item.classList.add('active');
  });
});

/* ==========================================================================
   8. CONFIGURATOR & ORDER SUBMISSION
   ========================================================================== */
document.querySelectorAll('.option-group').forEach((group) => {
  const pills = group.querySelectorAll('.opt-pill');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
});

const btnSubmitOrder = document.getElementById('btn-submit-order');
if (btnSubmitOrder) {
  btnSubmitOrder.addEventListener('click', () => {
    btnSubmitOrder.innerHTML = '<span>Processing Allocation...</span>';
    setTimeout(() => {
      btnSubmitOrder.innerHTML = '<span>✓ Batch 01 Reserved</span>';
      btnSubmitOrder.style.background = '#14b8a6';
      setTimeout(() => {
        btnSubmitOrder.innerHTML = '<span>Secure Pre-Order</span> <span class="mono arrow-mark">→</span>';
        btnSubmitOrder.style.background = '#121212';
      }, 3000);
    }, 600);
  });
}

/* ==========================================================================
   BOOTSTRAP
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  preloadFrames();
});

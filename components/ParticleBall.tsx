'use client';

/**
 * Physics Ball — interactive particle sphere with gravity and bounce.
 * Drag with mouse (or touch) to throw it; it bounces off the viewport edges.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { type ParticleSettings, THEMES } from './SettingsPanel';

const RADIUS    = 50;   // world-space ball radius
const CAMERA_Z  = 280;  // fixed camera distance

function getCounts(quality: string) {
  if (quality === 'low')    return { surface: 25_000, ring: 4_000 };
  if (quality === 'medium') return { surface: 65_000, ring: 8_000 };
  return                           { surface: 130_000, ring: 14_000 };
}

const vertexShader = /* glsl */ `
  attribute float aLayer;    // 0 = surface, 1 = ring
  attribute float aRandom;
  attribute float aPhase;
  varying float vHeight;
  varying float vLayer;
  varying float vRandom;
  varying float vFog;
  uniform float uTime;
  uniform float uAnimSpeed;
  uniform float uParticleSize;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uSquishY;
  uniform float uSquishX;

  void main() {
    vLayer  = aLayer;
    vRandom = aRandom;

    vec3 pos = position;

    // Squash-and-stretch on bounce
    pos.y *= uSquishY;
    pos.x *= uSquishX;
    pos.z *= uSquishX;

    if (aLayer < 0.5) {
      // Surface: radial breathing pulse
      float pulse  = sin(uTime * 1.1 * uAnimSpeed + aPhase) * 0.5 + 0.5;
      float radial = sin(uTime * 0.55 * uAnimSpeed + aPhase * 2.1) * 3.5;
      pos *= 1.0 + radial / 60.0;
      vHeight = 0.6 + 0.4 * pulse;
    } else {
      // Ring: orbit wobble + precession
      float wobble = sin(uTime * 0.22 * uAnimSpeed + aRandom * 6.28) * 0.07;
      mat3 tilt = mat3(
        1.0, 0.0, 0.0,
        0.0, cos(wobble), -sin(wobble),
        0.0, sin(wobble),  cos(wobble)
      );
      pos = tilt * pos;
      float prec = uTime * 0.07 * uAnimSpeed;
      mat3 precess = mat3(
        cos(prec), 0.0, sin(prec),
        0.0,       1.0, 0.0,
       -sin(prec), 0.0, cos(prec)
      );
      pos = precess * pos;
      vHeight = 0.9 + 0.1 * sin(aPhase + aRandom * 8.0);
    }

    vec4 mvPos  = modelViewMatrix * vec4(pos, 1.0);
    float pulse2 = 1.0 + sin(uTime * 1.4 * uAnimSpeed + aRandom * 6.28) * 0.11;
    float lsize  = aLayer < 0.5 ? 1.0 : 1.35;
    gl_PointSize = 1.9 * uParticleSize * lsize * pulse2 * (300.0 / -mvPos.z);

    gl_Position = projectionMatrix * mvPos;

    float fogDist = length(mvPos.xyz);
    vFog = smoothstep(uFogNear, uFogFar, fogDist);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;
  varying float vLayer;
  varying float vRandom;
  varying float vFog;
  uniform float uTime;
  uniform float uAnimSpeed;
  uniform float uBrightness;
  uniform vec3 uBgColor;
  uniform vec3 uColorLow;
  uniform vec3 uColorMid;
  uniform vec3 uColorHigh;
  uniform vec3 uColorPeak;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist  = length(center);
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
    float glow  = 1.0 - smoothstep(0.0, 0.35, dist);

    vec3 color;

    if (vLayer < 0.5) {
      float t = vHeight;
      color = t < 0.5 ? mix(uColorMid, uColorHigh, t * 2.0) : mix(uColorHigh, uColorPeak, (t - 0.5) * 2.0);
      float arc = pow(sin(uTime * 3.8 * uAnimSpeed + vRandom * 50.0) * 0.5 + 0.5, 6.0);
      color += uColorPeak * arc * 0.4;
    } else {
      float rp = sin(uTime * 2.3 * uAnimSpeed + vRandom * 20.0) * 0.5 + 0.5;
      color = mix(uColorHigh, uColorPeak, rp);
    }

    color += glow * 0.2 * vHeight;
    color *= uBrightness;
    color  = mix(color, uBgColor, vFog);
    alpha *= (1.0 - vFog * 0.85);

    gl_FragColor = vec4(color, alpha);
  }
`;

interface Props {
  settings: ParticleSettings;
}

export default function ParticleBall({ settings }: Props) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null);
  const bgColorRef  = useRef<THREE.Color | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const settingsRef = useRef(settings);

  // Keep settingsRef in sync for physics loop
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Reactive uniform updates
  useEffect(() => {
    const u = uniformsRef.current;
    if (!u) return;
    const theme = THEMES[settings.theme] || THEMES.mono;
    u.uBrightness.value   = settings.brightness;
    u.uParticleSize.value = settings.particleSize;
    u.uAnimSpeed.value    = settings.animSpeed;
    u.uFogNear.value      = settings.fogNear;
    u.uFogFar.value       = settings.fogFar;
    u.uColorLow.value     = new THREE.Vector3(...theme.colorLow);
    u.uColorMid.value     = new THREE.Vector3(...theme.colorMid);
    u.uColorHigh.value    = new THREE.Vector3(...theme.colorHigh);
    u.uColorPeak.value    = new THREE.Vector3(...theme.colorPeak);
    const newBg = new THREE.Color(theme.bg[0], theme.bg[1], theme.bg[2]);
    u.uBgColor.value = new THREE.Vector3(newBg.r, newBg.g, newBg.b);
    if (bgColorRef.current && sceneRef.current) {
      bgColorRef.current.copy(newBg);
      sceneRef.current.background = bgColorRef.current;
    }
  }, [settings]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let raf = 0;

    const { surface: SURFACE_COUNT, ring: RING_COUNT } = getCounts(settings.quality);
    const TOTAL = SURFACE_COUNT + RING_COUNT;

    const positions = new Float32Array(TOTAL * 3);
    const layers    = new Float32Array(TOTAL);
    const randoms   = new Float32Array(TOTAL);
    const phases    = new Float32Array(TOTAL);

    // Fibonacci sphere surface
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < SURFACE_COUNT; i++) {
      const y     = 1 - (i / (SURFACE_COUNT - 1)) * 2;
      const r     = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const jit   = (Math.random() - 0.5) * 2.0;
      positions[i * 3]     = Math.cos(theta) * r * RADIUS + jit;
      positions[i * 3 + 1] = y * RADIUS + jit;
      positions[i * 3 + 2] = Math.sin(theta) * r * RADIUS + jit;
      layers[i]  = 0;
      randoms[i] = Math.random();
      phases[i]  = Math.random() * Math.PI * 2;
    }

    // Two tilted equatorial rings
    const off = SURFACE_COUNT;
    const ringDefs = [
      { r: RADIUS * 1.45, count: Math.floor(RING_COUNT * 0.55), tiltX: 0.20, tiltZ: 0.0 },
      { r: RADIUS * 1.75, count: RING_COUNT - Math.floor(RING_COUNT * 0.55), tiltX: -0.12, tiltZ: 0.15 },
    ];
    let rIdx = 0;
    for (const ring of ringDefs) {
      for (let i = 0; i < ring.count; i++) {
        const angle  = (i / ring.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
        const spread = (Math.random() - 0.5) * 3.0;
        const x = Math.cos(angle) * ring.r;
        const z = Math.sin(angle) * ring.r;
        const yTilted = x * Math.sin(ring.tiltX) + spread * Math.cos(ring.tiltX);
        const xTilted = x * Math.cos(ring.tiltX) - spread * Math.sin(ring.tiltX);
        positions[(off + rIdx) * 3]     = xTilted * Math.cos(ring.tiltZ) - z * Math.sin(ring.tiltZ);
        positions[(off + rIdx) * 3 + 1] = yTilted;
        positions[(off + rIdx) * 3 + 2] = xTilted * Math.sin(ring.tiltZ) + z * Math.cos(ring.tiltZ);
        layers[off + rIdx]  = 1;
        randoms[off + rIdx] = Math.random();
        phases[off + rIdx]  = angle;
        rIdx++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aLayer',   new THREE.BufferAttribute(layers, 1));
    geometry.setAttribute('aRandom',  new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));

    const initTheme = THEMES[settings.theme] || THEMES.mono;
    const uniforms = {
      uTime:         { value: 0 },
      uBrightness:   { value: settings.brightness },
      uParticleSize: { value: settings.particleSize },
      uAnimSpeed:    { value: settings.animSpeed },
      uFogNear:      { value: settings.fogNear },
      uFogFar:       { value: settings.fogFar },
      uBgColor:      { value: new THREE.Vector3(...initTheme.bg) },
      uColorLow:     { value: new THREE.Vector3(...initTheme.colorLow) },
      uColorMid:     { value: new THREE.Vector3(...initTheme.colorMid) },
      uColorHigh:    { value: new THREE.Vector3(...initTheme.colorHigh) },
      uColorPeak:    { value: new THREE.Vector3(...initTheme.colorPeak) },
      uSquishY:      { value: 1.0 },
      uSquishX:      { value: 1.0 },
    };
    uniformsRef.current = uniforms;

    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    const scene   = new THREE.Scene();
    const bgColor = new THREE.Color(initTheme.bg[0], initTheme.bg[1], initTheme.bg[2]);
    scene.background   = bgColor;
    bgColorRef.current = bgColor;
    sceneRef.current   = scene;

    // Ball group — we move this to do physics
    const ballGroup = new THREE.Object3D();
    ballGroup.add(new THREE.Points(geometry, material));
    scene.add(ballGroup);

    // Fixed camera — no OrbitControls
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 5000);
    camera.position.set(0, 0, CAMERA_Z);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // Viewport half-extents at z=0 plane
    const fovRad  = (50 * Math.PI) / 180;
    let halfH = CAMERA_Z * Math.tan(fovRad / 2);
    let halfW = halfH * (window.innerWidth / window.innerHeight);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      halfH = CAMERA_Z * Math.tan(fovRad / 2);
      halfW = halfH * (window.innerWidth / window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Physics state
    const phys = {
      x: 0, y: 20,
      vx: 120, vy: 0,
      dragging: false,
      // Mouse velocity tracking (last two sampled world positions)
      mx0: 0, my0: 0, mt0: 0,
      mx1: 0, my1: 0, mt1: 0,
    };

    // Squish state
    const squish = { y: 1.0, x: 1.0, timer: 0.0 };

    function triggerSquish() {
      squish.y     = 0.62;
      squish.x     = 1.38;
      squish.timer = 0.32;
    }

    // Convert client XY → world XY (at z=0 plane via raycasting)
    const raycaster = new THREE.Raycaster();
    const zPlane    = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const worldPt   = new THREE.Vector3();

    function clientToWorld(cx: number, cy: number): { x: number; y: number } | null {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const ndc  = new THREE.Vector2(
        ((cx - rect.left) / rect.width)  *  2 - 1,
        ((cy - rect.top)  / rect.height) * -2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(zPlane, worldPt)) return null;
      return { x: worldPt.x, y: worldPt.y };
    }

    function isOverBall(wx: number, wy: number) {
      const dx = wx - phys.x;
      const dy = wy - phys.y;
      return Math.sqrt(dx * dx + dy * dy) < RADIUS * 1.4;
    }

    // Mouse events
    const onMouseDown = (e: MouseEvent) => {
      const w = clientToWorld(e.clientX, e.clientY);
      if (!w || !isOverBall(w.x, w.y)) return;
      phys.dragging = true;
      phys.vx = 0; phys.vy = 0;
      phys.mx1 = w.x; phys.my1 = w.y; phys.mt1 = performance.now();
      phys.mx0 = w.x; phys.my0 = w.y; phys.mt0 = phys.mt1;
      el.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      // Update cursor hint even when not dragging
      if (!phys.dragging) {
        const w = clientToWorld(e.clientX, e.clientY);
        el.style.cursor = (w && isOverBall(w.x, w.y)) ? 'grab' : 'default';
        return;
      }
      const w = clientToWorld(e.clientX, e.clientY);
      if (!w) return;
      phys.mx0 = phys.mx1; phys.my0 = phys.my1; phys.mt0 = phys.mt1;
      phys.mx1 = w.x; phys.my1 = w.y; phys.mt1 = performance.now();
      phys.x = w.x; phys.y = w.y;
    };

    const onMouseUp = () => {
      if (!phys.dragging) return;
      phys.dragging = false;
      el.style.cursor = 'default';
      const dt = (phys.mt1 - phys.mt0) / 1000;
      if (dt > 0.001 && dt < 0.15) {
        phys.vx = Math.min(1200, Math.max(-1200, (phys.mx1 - phys.mx0) / dt));
        phys.vy = Math.min(1200, Math.max(-1200, (phys.my1 - phys.my0) / dt));
      }
    };

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const w = clientToWorld(t.clientX, t.clientY);
      if (!w || !isOverBall(w.x, w.y)) return;
      phys.dragging = true;
      phys.vx = 0; phys.vy = 0;
      phys.mx1 = w.x; phys.my1 = w.y; phys.mt1 = performance.now();
      phys.mx0 = w.x; phys.my0 = w.y; phys.mt0 = phys.mt1;
      e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!phys.dragging) return;
      const t = e.touches[0];
      const w = clientToWorld(t.clientX, t.clientY);
      if (!w) return;
      phys.mx0 = phys.mx1; phys.my0 = phys.my1; phys.mt0 = phys.mt1;
      phys.mx1 = w.x; phys.my1 = w.y; phys.mt1 = performance.now();
      phys.x = w.x; phys.y = w.y;
      e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!phys.dragging) return;
      phys.dragging = false;
      const dt = (phys.mt1 - phys.mt0) / 1000;
      if (dt > 0.001 && dt < 0.15) {
        phys.vx = Math.min(900, Math.max(-900, (phys.mx1 - phys.mx0) / dt));
        phys.vy = Math.min(900, Math.max(-900, (phys.my1 - phys.my0) / dt));
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    // Animation
    let lastTime = performance.now();
    const animate = () => {
      raf = requestAnimationFrame(animate);

      const now = performance.now();
      const dt  = Math.min((now - lastTime) / 1000, 0.05);
      lastTime  = now;

      const s = settingsRef.current;
      uniforms.uTime.value = uniforms.uTime.value as number + dt;

      if (!phys.dragging) {
        const gravity    = (s.gravity ?? 1.0) * 320;
        const bounciness = s.bounciness ?? 0.72;

        // Apply gravity
        phys.vy -= gravity * dt;

        // Move
        phys.x += phys.vx * dt;
        phys.y += phys.vy * dt;

        // Horizontal air resistance
        phys.vx *= Math.pow(0.985, dt * 60);

        const bx = halfW - RADIUS * 1.05;
        const by = halfH - RADIUS * 1.05;

        // Bounce off walls
        if (phys.x < -bx) {
          phys.x  = -bx;
          phys.vx = Math.abs(phys.vx) * bounciness;
          triggerSquish();
        } else if (phys.x > bx) {
          phys.x  = bx;
          phys.vx = -Math.abs(phys.vx) * bounciness;
          triggerSquish();
        }

        if (phys.y > by) {
          phys.y  = by;
          phys.vy = -Math.abs(phys.vy) * bounciness;
          triggerSquish();
        } else if (phys.y < -by) {
          phys.y  = -by;
          phys.vy = Math.abs(phys.vy) * bounciness;
          // Floor friction
          phys.vx *= 0.80;
          // Stop micro-bouncing
          if (Math.abs(phys.vy) < 8) phys.vy = 0;
          triggerSquish();
        }
      }

      // Squish animation
      if (squish.timer > 0) {
        squish.timer -= dt;
        const t = Math.max(0, squish.timer) / 0.32;
        const eased = t * t;
        uniforms.uSquishY.value = 1.0 - (1.0 - 0.62) * eased;
        uniforms.uSquishX.value = 1.0 + 0.38 * eased;
      } else {
        uniforms.uSquishY.value = 1.0;
        uniforms.uSquishX.value = 1.0;
      }

      // Move ball group + slow self-rotation for visual interest
      ballGroup.position.set(phys.x, phys.y, 0);
      ballGroup.rotation.y += dt * 0.28 * (s.animSpeed ?? 1);
      ballGroup.rotation.x += dt * 0.09 * (s.animSpeed ?? 1);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      uniformsRef.current = null;
      bgColorRef.current  = null;
      sceneRef.current    = null;
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [settings.quality]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      {/* Drag hint — fades away after mount via CSS animation would need globals; keep it subtle */}
      <div style={{
        position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.18)', fontSize: 10, letterSpacing: '0.15em',
        textTransform: 'uppercase', pointerEvents: 'none', zIndex: 10,
      }}>
        Drag to throw · gravity &amp; bounce
      </div>
    </div>
  );
}

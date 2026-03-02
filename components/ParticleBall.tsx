'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { type ParticleSettings, THEMES } from './SettingsPanel';

const RADIUS = 60;

function getCounts(quality: string) {
  if (quality === 'low')    return { surface: 40_000, inner: 20_000, ring: 10_000 };
  if (quality === 'medium') return { surface: 110_000, inner: 35_000, ring: 18_000 };
  return                           { surface: 180_000, inner: 60_000, ring: 30_000 };
}

const vertexShader = /* glsl */ `
  attribute float aLayer;   // 0 = surface, 1 = inner, 2 = ring
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

  void main() {
    vLayer = aLayer;
    vRandom = aRandom;

    vec3 pos = position;

    // Surface layer: radial breathing pulse
    if (aLayer < 0.5) {
      float pulse = sin(uTime * 1.2 * uAnimSpeed + aPhase) * 0.5 + 0.5;
      float radial = sin(uTime * 0.6 * uAnimSpeed + aPhase * 2.1) * 4.0;
      pos *= 1.0 + radial / 60.0;
      vHeight = 0.6 + 0.4 * pulse;
    }

    // Inner layer: slower expansion/contraction
    else if (aLayer < 1.5) {
      float inner = sin(uTime * 0.5 * uAnimSpeed + aPhase * 3.7) * 0.5 + 0.5;
      pos *= 0.8 + inner * 0.4;
      vHeight = 0.2 + 0.4 * inner;
    }

    // Ring layer: orbital tilt wobble
    else {
      float spin = uTime * 0.4 * uAnimSpeed + aPhase;
      float wobble = sin(uTime * 0.25 * uAnimSpeed + aRandom * 6.28) * 0.08;
      mat3 tilt = mat3(
        1.0, 0.0, 0.0,
        0.0, cos(wobble), -sin(wobble),
        0.0, sin(wobble),  cos(wobble)
      );
      pos = tilt * pos;
      // Orbit precession
      float prec = uTime * 0.08 * uAnimSpeed;
      mat3 precess = mat3(
        cos(prec), 0.0, sin(prec),
        0.0,       1.0, 0.0,
       -sin(prec), 0.0, cos(prec)
      );
      pos = precess * pos;
      vHeight = 0.9 + 0.1 * sin(spin + aRandom * 12.0);
    }

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

    float pulse2 = 1.0 + sin(uTime * 1.5 * uAnimSpeed + aRandom * 6.28) * 0.12;
    float layerSize = aLayer < 0.5 ? 1.0 : (aLayer < 1.5 ? 0.65 : 1.3);
    gl_PointSize = 1.8 * uParticleSize * layerSize * pulse2 * (300.0 / -mvPos.z);

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
    float dist = length(center);
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
    float glow  = 1.0 - smoothstep(0.0, 0.35, dist);

    vec3 color;

    // Surface: mid→high→peak gradient with electric shimmer
    if (vLayer < 0.5) {
      float t = vHeight;
      if (t < 0.5) {
        color = mix(uColorMid, uColorHigh, t * 2.0);
      } else {
        color = mix(uColorHigh, uColorPeak, (t - 0.5) * 2.0);
      }
      // Electric arc shimmer (fast)
      float arc = pow(sin(uTime * 4.0 * uAnimSpeed + vRandom * 50.0) * 0.5 + 0.5, 6.0);
      color += uColorPeak * arc * 0.4;

    // Inner: deep low→mid
    } else if (vLayer < 1.5) {
      color = mix(uColorLow, uColorMid, vHeight);
      float shimmer = sin(uTime * 0.8 * uAnimSpeed + vRandom * 30.0) * 0.5 + 0.5;
      color += uColorMid * shimmer * 0.1;
      alpha *= 0.55;

    // Ring: peak color with bright pulses
    } else {
      color = uColorPeak;
      float ringPulse = sin(uTime * 2.5 * uAnimSpeed + vRandom * 20.0) * 0.5 + 0.5;
      color = mix(uColorHigh, uColorPeak, ringPulse);
    }

    color += glow * 0.2 * vHeight;
    color *= uBrightness;

    color = mix(color, uBgColor, vFog);
    alpha *= (1.0 - vFog * 0.85);

    gl_FragColor = vec4(color, alpha);
  }
`;

interface Props {
  settings: ParticleSettings;
}

export default function ParticleBall({ settings }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bgColorRef = useRef<THREE.Color | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    const u = uniformsRef.current;
    const ctrl = controlsRef.current;
    if (!u) return;
    const theme = THEMES[settings.theme] || THEMES.mono;
    u.uBrightness.value = settings.brightness;
    u.uParticleSize.value = settings.particleSize;
    u.uAnimSpeed.value = settings.animSpeed;
    u.uFogNear.value = settings.fogNear;
    u.uFogFar.value = settings.fogFar;
    u.uColorLow.value = new THREE.Vector3(...theme.colorLow);
    u.uColorMid.value = new THREE.Vector3(...theme.colorMid);
    u.uColorHigh.value = new THREE.Vector3(...theme.colorHigh);
    u.uColorPeak.value = new THREE.Vector3(...theme.colorPeak);
    const newBg = new THREE.Color(theme.bg[0], theme.bg[1], theme.bg[2]);
    u.uBgColor.value = new THREE.Vector3(newBg.r, newBg.g, newBg.b);
    if (bgColorRef.current && sceneRef.current) {
      bgColorRef.current.copy(newBg);
      sceneRef.current.background = bgColorRef.current;
    }
    if (ctrl) ctrl.autoRotateSpeed = settings.autoRotateSpeed;
  }, [settings]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let raf = 0;

    const { surface: SURFACE_COUNT, inner: INNER_COUNT, ring: RING_COUNT } = getCounts(settings.quality);
    const TOTAL = SURFACE_COUNT + INNER_COUNT + RING_COUNT;

    const positions = new Float32Array(TOTAL * 3);
    const layers    = new Float32Array(TOTAL);
    const randoms   = new Float32Array(TOTAL);
    const phases    = new Float32Array(TOTAL);

    // -- Fibonacci sphere surface --
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < SURFACE_COUNT; i++) {
      const y = 1 - (i / (SURFACE_COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const jitter = (Math.random() - 0.5) * 2.5;
      positions[i * 3]     = Math.cos(theta) * r * RADIUS + jitter;
      positions[i * 3 + 1] = y * RADIUS + jitter;
      positions[i * 3 + 2] = Math.sin(theta) * r * RADIUS + jitter;
      layers[i]  = 0;
      randoms[i] = Math.random();
      phases[i]  = Math.random() * Math.PI * 2;
    }

    // -- Inner shell particles (random inside sphere) --
    const off = SURFACE_COUNT;
    for (let i = 0; i < INNER_COUNT; i++) {
      const u2 = Math.random();
      const v2 = Math.random();
      const w2 = Math.random();
      const theta2 = 2 * Math.PI * u2;
      const phi    = Math.acos(2 * v2 - 1);
      const rad    = RADIUS * 0.6 * Math.cbrt(w2);
      positions[(off + i) * 3]     = rad * Math.sin(phi) * Math.cos(theta2);
      positions[(off + i) * 3 + 1] = rad * Math.cos(phi);
      positions[(off + i) * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta2);
      layers[off + i]  = 1;
      randoms[off + i] = Math.random();
      phases[off + i]  = Math.random() * Math.PI * 2;
    }

    // -- Equatorial ring(s): 3 concentric rings at slight tilts --
    const off2 = SURFACE_COUNT + INNER_COUNT;
    const ringDefs = [
      { r: RADIUS * 1.35, count: Math.floor(RING_COUNT * 0.5),  tiltX: 0.18,  tiltZ: 0.0   },
      { r: RADIUS * 1.6,  count: Math.floor(RING_COUNT * 0.3),  tiltX: -0.1,  tiltZ: 0.12  },
      { r: RADIUS * 1.85, count: RING_COUNT - Math.floor(RING_COUNT * 0.8), tiltX: 0.25, tiltZ: -0.08 },
    ];
    let rIdx = 0;
    for (const ring of ringDefs) {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.05;
        const spread = (Math.random() - 0.5) * 3.5;
        const x = Math.cos(angle) * ring.r;
        const z = Math.sin(angle) * ring.r;
        // Tilt the ring
        const yTilted = x * Math.sin(ring.tiltX) + spread * Math.cos(ring.tiltX);
        const xTilted = x * Math.cos(ring.tiltX) - spread * Math.sin(ring.tiltX);
        positions[(off2 + rIdx) * 3]     = xTilted * Math.cos(ring.tiltZ) - z * Math.sin(ring.tiltZ);
        positions[(off2 + rIdx) * 3 + 1] = yTilted;
        positions[(off2 + rIdx) * 3 + 2] = xTilted * Math.sin(ring.tiltZ) + z * Math.cos(ring.tiltZ);
        layers[off2 + rIdx]  = 2;
        randoms[off2 + rIdx] = Math.random();
        phases[off2 + rIdx]  = angle;
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
    };
    uniformsRef.current = uniforms;

    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(initTheme.bg[0], initTheme.bg[1], initTheme.bg[2]);
    scene.background = bgColor;
    bgColorRef.current = bgColor;
    sceneRef.current = scene;
    scene.add(new THREE.Points(geometry, material));

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 10000);
    camera.position.set(0, 60, 220);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = settings.autoRotateSpeed;
    controls.maxDistance = 500;
    controls.minDistance = 20;
    controlsRef.current = controls;

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      uniformsRef.current = null;
      controlsRef.current = null;
      bgColorRef.current = null;
      sceneRef.current = null;
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} />;
}

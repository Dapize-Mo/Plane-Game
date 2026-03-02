'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createNoise2D } from 'simplex-noise';
import { type ParticleSettings, THEMES } from './SettingsPanel';

// Island definitions: [normX, normZ, gaussianRadius, heightMultiplier]
// 8 possible island positions; islandCount selects the first N
const ISLAND_DEFS = [
  { x: 0.50, z: 0.50, r: 0.085, h: 1.00 }, // main island – center
  { x: 0.26, z: 0.30, r: 0.055, h: 0.68 }, // NW island
  { x: 0.72, z: 0.68, r: 0.063, h: 0.74 }, // SE island
  { x: 0.34, z: 0.74, r: 0.042, h: 0.50 }, // S island
  { x: 0.70, z: 0.26, r: 0.038, h: 0.44 }, // NE island
  { x: 0.16, z: 0.60, r: 0.030, h: 0.35 }, // W tiny
  { x: 0.83, z: 0.44, r: 0.028, h: 0.30 }, // E tiny
  { x: 0.55, z: 0.13, r: 0.032, h: 0.38 }, // N tiny
];

const CONFIG = {
  spacing: 0.7,
  waterLevel: 1.8,
  peakHeight: 62.0,   // max island peak height
  noiseFreq: 0.022,
  baseSize: 1.8,
  waveAmplitude: 2.8,
} as const;

function getGridSize(quality: string) {
  if (quality === 'low') return 500;
  if (quality === 'medium') return 750;
  return 1000;
}

const vertexShader = /* glsl */ `
  attribute float aHeight;
  attribute float aRandom;
  attribute float aIsWater;
  varying float vHeight;
  varying float vFog;
  varying float vRandom;
  varying float vIsWater;
  uniform float uTime;
  uniform float uMaxHeight;
  uniform float uAnimSpeed;
  uniform float uParticleSize;
  uniform float uFogNear;
  uniform float uFogFar;

  void main() {
    vHeight   = aHeight / uMaxHeight;
    vRandom   = aRandom;
    vIsWater  = aIsWater;

    vec3 pos = position;

    if (aIsWater > 0.5) {
      // Ocean wave animation – gentle, multi-frequency
      float wave1 = sin(uTime * 0.55 * uAnimSpeed + pos.x * 0.025 + pos.z * 0.018) * 2.2;
      float wave2 = sin(uTime * 0.38 * uAnimSpeed + pos.x * 0.012 - pos.z * 0.022) * 1.4;
      float wave3 = cos(uTime * 0.28 * uAnimSpeed + pos.x * 0.007 + pos.z * 0.009) * 0.8;
      pos.y += (wave1 + wave2 + wave3) * 0.45;
    } else {
      // Island breathing – subtle
      float breathe = sin(uTime * 0.28 * uAnimSpeed + pos.x * 0.012 + pos.z * 0.012) * 0.5 + 0.5;
      pos.y += breathe * vHeight * 1.2;
    }

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

    float pulse      = 1.0 + sin(uTime * 0.75 * uAnimSpeed + aRandom * 6.28) * 0.10 * vHeight;
    float heightSize = 1.0 + vHeight * 1.3;
    float waterScale = aIsWater > 0.5 ? 0.65 : 1.0;
    float baseSize   = ${CONFIG.baseSize.toFixed(1)} * uParticleSize * waterScale;
    gl_PointSize = baseSize * heightSize * pulse * (300.0 / -mvPos.z);

    gl_Position = projectionMatrix * mvPos;

    float fogDist = length(mvPos.xyz);
    vFog = smoothstep(uFogNear, uFogFar, fogDist);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;
  varying float vFog;
  varying float vRandom;
  varying float vIsWater;
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

    float alpha = 1.0 - smoothstep(0.15, 0.5, dist);

    vec3 color;

    if (vIsWater > 0.5) {
      // Water: shimmer between low and mid with specular highlights
      float shimmer = sin(uTime * 0.45 * uAnimSpeed + vRandom * 10.0) * 0.5 + 0.5;
      color = mix(uColorLow, uColorMid, 0.25 + 0.75 * shimmer);
      float spec = pow(max(0.0, sin(uTime * 0.75 * uAnimSpeed + vRandom * 20.0)), 8.0);
      color += uColorHigh * spec * 0.28;
      alpha *= 0.48;
    } else {
      // Island: gradient from shore to peak
      float h = vHeight;
      if (h < 0.25) {
        color = mix(uColorLow, uColorMid, h / 0.25);
      } else if (h < 0.62) {
        color = mix(uColorMid, uColorHigh, (h - 0.25) / 0.37);
      } else {
        color = mix(uColorHigh, uColorPeak, (h - 0.62) / 0.38);
      }
      float shimmer = sin(uTime * 1.1 * uAnimSpeed + vRandom * 40.0) * 0.5 + 0.5;
      color += shimmer * 0.055 * h;
    }

    float glow = 1.0 - smoothstep(0.0, 0.4, dist);
    color += glow * 0.10 * vHeight;

    color *= uBrightness;
    color  = mix(color, uBgColor, vFog);
    alpha *= (1.0 - vFog * 0.9);
    alpha *= 0.6 + 0.4 * vHeight;

    gl_FragColor = vec4(color, alpha);
  }
`;

interface Props {
  settings: ParticleSettings;
}

export default function OceanMountain({ settings }: Props) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bgColorRef  = useRef<THREE.Color | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);

  // Reactive uniform updates
  useEffect(() => {
    const u    = uniformsRef.current;
    const ctrl = controlsRef.current;
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
    if (ctrl) ctrl.autoRotateSpeed = settings.autoRotateSpeed;
  }, [settings]);

  // Scene setup — remounts when quality or islandCount changes
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let raf = 0;

    const gridSize   = getGridSize(settings.quality);
    const islandCount = Math.max(2, Math.min(8, Math.round(settings.islandCount)));
    const islands     = ISLAND_DEFS.slice(0, islandCount);
    const simplex     = createNoise2D();
    const totalSize   = gridSize * CONFIG.spacing;
    const offset      = totalSize / 2;

    function getTerrainData(i: number, j: number): { height: number; isWater: boolean } {
      const normI = i / gridSize;
      const normJ = j / gridSize;
      const nx    = i * CONFIG.noiseFreq;
      const nz    = j * CONFIG.noiseFreq;

      // Fractal noise (used only to shape island surfaces)
      let noiseVal = (simplex(nx, nz) + 1) / 2;
      noiseVal += simplex(nx * 2, nz * 2) * 0.5;
      noiseVal += simplex(nx * 4, nz * 4) * 0.25;
      noiseVal += simplex(nx * 8, nz * 8) * 0.125;
      noiseVal = noiseVal / 1.875;

      // Accumulate height from all islands (take the max)
      let maxHeight = 0;
      for (const island of islands) {
        const cx   = normI - island.x;
        const cz   = normJ - island.z;
        const dist = Math.sqrt(cx * cx + cz * cz);

        // Organic radius variation by angle
        const angle      = Math.atan2(cz, cx);
        const angleNoise = simplex(Math.cos(angle) * 3.5, Math.sin(angle) * 3.5) * 0.018;
        const r          = island.r + angleNoise;

        // Sharp gaussian for island peak
        const gaussian = Math.exp(-(dist * dist) / (2 * r * r));
        const h        = gaussian * noiseVal * CONFIG.peakHeight * island.h;
        if (h > maxHeight) maxHeight = h;
      }

      if (maxHeight < CONFIG.waterLevel) {
        // Flat ocean with tiny depth variation
        const waterNoise = simplex(nx * 0.3, nz * 0.3) * 0.4;
        return { height: CONFIG.waterLevel + waterNoise, isWater: true };
      }

      return { height: maxHeight, isWater: false };
    }

    // Scene
    const scene     = new THREE.Scene();
    const initTheme = THEMES[settings.theme] || THEMES.mono;
    const bgColor   = new THREE.Color(initTheme.bg[0], initTheme.bg[1], initTheme.bg[2]);
    scene.background   = bgColor;
    bgColorRef.current = bgColor;
    sceneRef.current   = scene;

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 20000);
    camera.position.set(-80, 100, 210);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.05;
    controls.screenSpacePanning = true;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = settings.autoRotateSpeed;
    controls.maxDistance     = 420;
    controls.minDistance     = 30;
    controls.target.set(0, 8, 0);
    controlsRef.current = controls;

    // Generate terrain
    const count     = gridSize * gridSize;
    const positions = new Float32Array(count * 3);
    const heights   = new Float32Array(count);
    const randoms   = new Float32Array(count);
    const isWater   = new Float32Array(count);

    let k = 0;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x    = i * CONFIG.spacing - offset;
        const z    = j * CONFIG.spacing - offset;
        const data = getTerrainData(i, j);

        positions[k * 3]     = x;
        positions[k * 3 + 1] = data.height;
        positions[k * 3 + 2] = z;
        heights[k]  = data.height;
        randoms[k]  = Math.random();
        isWater[k]  = data.isWater ? 1.0 : 0.0;
        k++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aHeight',  new THREE.BufferAttribute(heights, 1));
    geometry.setAttribute('aRandom',  new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aIsWater', new THREE.BufferAttribute(isWater, 1));

    const uniforms = {
      uTime:         { value: 0 },
      uMaxHeight:    { value: CONFIG.peakHeight },
      uBrightness:   { value: settings.brightness },
      uParticleSize: { value: settings.particleSize },
      uAnimSpeed:    { value: settings.animSpeed },
      uFogNear:      { value: settings.fogNear },
      uFogFar:       { value: settings.fogFar },
      uBgColor:      { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
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

    scene.add(new THREE.Points(geometry, material));

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    const clock   = new THREE.Clock();
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
      bgColorRef.current  = null;
      sceneRef.current    = null;
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [settings.quality, settings.islandCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} />;
}

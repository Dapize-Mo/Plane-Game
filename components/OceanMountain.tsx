'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createNoise2D } from 'simplex-noise';
import { type ParticleSettings, THEMES } from './SettingsPanel';

const CONFIG = {
  gridSize: 1000,
  spacing: 0.7,
  waterLevel: 2.0,
  mountainPeakHeight: 110.0,
  mountainRadius: 0.18,
  noiseFreq: 0.02,
  baseSize: 1.8,
  waveAmplitude: 3.5,
  waveFreq: 0.04,
};

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
    vHeight = aHeight / uMaxHeight;
    vRandom = aRandom;
    vIsWater = aIsWater;

    vec3 pos = position;

    // Ocean wave animation for water particles
    if (aIsWater > 0.5) {
      float wave1 = sin(uTime * 0.6 * uAnimSpeed + pos.x * 0.03 + pos.z * 0.02) * 2.5;
      float wave2 = sin(uTime * 0.4 * uAnimSpeed + pos.x * 0.015 - pos.z * 0.025) * 1.5;
      float wave3 = cos(uTime * 0.3 * uAnimSpeed + pos.x * 0.008 + pos.z * 0.01) * 1.0;
      pos.y += (wave1 + wave2 + wave3) * 0.5;
    } else {
      // Mountain breathing — subtle
      float breathe = sin(uTime * 0.3 * uAnimSpeed + pos.x * 0.01 + pos.z * 0.01) * 0.5 + 0.5;
      pos.y += breathe * vHeight * 1.5;
    }

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

    float pulse = 1.0 + sin(uTime * 0.8 * uAnimSpeed + aRandom * 6.28) * 0.12 * vHeight;
    float heightSize = 1.0 + vHeight * 1.2;
    // Water particles slightly smaller
    float waterScale = aIsWater > 0.5 ? 0.7 : 1.0;
    float baseSize = ${CONFIG.baseSize.toFixed(1)} * uParticleSize * waterScale;
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
    float dist = length(center);
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.15, 0.5, dist);

    vec3 color;
    float h = vHeight;

    if (vIsWater > 0.5) {
      // Water uses lower two colors with shimmer
      color = mix(uColorLow, uColorMid, 0.3 + 0.7 * sin(uTime * 0.5 * uAnimSpeed + vRandom * 10.0) * 0.5 + 0.5);
      // Specular highlights on water
      float spec = pow(max(0.0, sin(uTime * 0.8 * uAnimSpeed + vRandom * 20.0)), 8.0);
      color += uColorHigh * spec * 0.3;
      alpha *= 0.5;
    } else {
      // Mountain gradient
      if (h < 0.25) {
        color = mix(uColorLow, uColorMid, h / 0.25);
      } else if (h < 0.6) {
        color = mix(uColorMid, uColorHigh, (h - 0.25) / 0.35);
      } else {
        color = mix(uColorHigh, uColorPeak, (h - 0.6) / 0.4);
      }

      float shimmer = sin(uTime * 1.2 * uAnimSpeed + vRandom * 40.0) * 0.5 + 0.5;
      color += shimmer * 0.06 * h;
    }

    // Inner glow
    float glow = 1.0 - smoothstep(0.0, 0.4, dist);
    color += glow * 0.12 * h;

    color *= uBrightness;

    // Fog
    color = mix(color, uBgColor, vFog);
    alpha *= (1.0 - vFog * 0.9);
    alpha *= 0.6 + 0.4 * h;

    gl_FragColor = vec4(color, alpha);
  }
`;

interface Props {
  settings: ParticleSettings;
}

export default function OceanMountain({ settings }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bgColorRef = useRef<THREE.Color | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Update uniforms reactively
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

    if (ctrl) {
      ctrl.autoRotateSpeed = settings.autoRotateSpeed;
    }
  }, [settings]);

  // Scene setup
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let raf = 0;

    const simplex = createNoise2D();
    const totalSize = CONFIG.gridSize * CONFIG.spacing;
    const offset = totalSize / 2;

    function getTerrainData(i: number, j: number): { height: number; isWater: boolean } {
      const normI = i / CONFIG.gridSize;
      const normJ = j / CONFIG.gridSize;

      // Distance from center for mountain
      const cx = normI - 0.5;
      const cz = normJ - 0.5;
      const distFromCenter = Math.sqrt(cx * cx + cz * cz);

      // Mountain shape — gaussian + noise for organic shape
      const nx = i * CONFIG.noiseFreq;
      const nz = j * CONFIG.noiseFreq;

      let noiseVal = (simplex(nx, nz) + 1) / 2;
      noiseVal += simplex(nx * 2, nz * 2) * 0.5;
      noiseVal += simplex(nx * 4, nz * 4) * 0.25;
      noiseVal += simplex(nx * 8, nz * 8) * 0.125;
      noiseVal = noiseVal / 1.875;

      // Angular variation for non-circular mountain
      const angle = Math.atan2(cz, cx);
      const angleNoise = simplex(Math.cos(angle) * 3, Math.sin(angle) * 3) * 0.04;
      const effectiveRadius = CONFIG.mountainRadius + angleNoise;

      // Mountain influence
      const mountainFalloff = Math.exp(-(distFromCenter * distFromCenter) / (2 * effectiveRadius * effectiveRadius));
      const mountainHeight = mountainFalloff * noiseVal * CONFIG.mountainPeakHeight;

      // Secondary smaller peak offset from center
      const cx2 = normI - 0.38;
      const cz2 = normJ - 0.6;
      const dist2 = Math.sqrt(cx2 * cx2 + cz2 * cz2);
      const secondaryPeak = Math.exp(-(dist2 * dist2) / (2 * 0.07 * 0.07)) * noiseVal * CONFIG.mountainPeakHeight * 0.4;

      const totalHeight = mountainHeight + secondaryPeak;

      if (totalHeight < CONFIG.waterLevel) {
        // Water level with subtle noise variation
        const waterNoise = simplex(nx * 0.5, nz * 0.5) * 0.5;
        return { height: CONFIG.waterLevel + waterNoise, isWater: true };
      }

      return { height: totalHeight, isWater: false };
    }

    // Scene
    const scene = new THREE.Scene();
    const initTheme = THEMES[settings.theme] || THEMES.mono;
    const bgColor = new THREE.Color(initTheme.bg[0], initTheme.bg[1], initTheme.bg[2]);
    scene.background = bgColor;
    bgColorRef.current = bgColor;
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 20000);
    camera.position.set(-100, 120, 220);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = settings.autoRotateSpeed;
    controls.maxDistance = 400;
    controls.minDistance = 30;
    controls.target.set(0, 15, 0);
    controlsRef.current = controls;

    // Generate terrain
    const count = CONFIG.gridSize * CONFIG.gridSize;
    const positions = new Float32Array(count * 3);
    const heights = new Float32Array(count);
    const randoms = new Float32Array(count);
    const isWater = new Float32Array(count);

    let k = 0;
    for (let i = 0; i < CONFIG.gridSize; i++) {
      for (let j = 0; j < CONFIG.gridSize; j++) {
        const x = i * CONFIG.spacing - offset;
        const z = j * CONFIG.spacing - offset;
        const data = getTerrainData(i, j);

        positions[k * 3] = x;
        positions[k * 3 + 1] = data.height;
        positions[k * 3 + 2] = z;
        heights[k] = data.height;
        randoms[k] = Math.random();
        isWater[k] = data.isWater ? 1.0 : 0.0;
        k++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aHeight', new THREE.BufferAttribute(heights, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aIsWater', new THREE.BufferAttribute(isWater, 1));

    const uniforms = {
      uTime: { value: 0 },
      uMaxHeight: { value: CONFIG.mountainPeakHeight },
      uBrightness: { value: settings.brightness },
      uParticleSize: { value: settings.particleSize },
      uAnimSpeed: { value: settings.animSpeed },
      uFogNear: { value: settings.fogNear },
      uFogFar: { value: settings.fogFar },
      uBgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
      uColorLow: { value: new THREE.Vector3(...initTheme.colorLow) },
      uColorMid: { value: new THREE.Vector3(...initTheme.colorMid) },
      uColorHigh: { value: new THREE.Vector3(...initTheme.colorHigh) },
      uColorPeak: { value: new THREE.Vector3(...initTheme.colorPeak) },
    };
    uniformsRef.current = uniforms;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    scene.add(new THREE.Points(geometry, material));

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Animate
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

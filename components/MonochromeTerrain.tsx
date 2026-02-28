'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createNoise2D } from 'simplex-noise';
import { type ParticleSettings, THEMES } from './SettingsPanel';

const CONFIG = {
  gridSize: 1000,
  spacing: 0.7,
  hillHeight: 25.0,
  mountainHeight: 90.0,
  trenchDepth: 50.0,
  noiseFreq: 0.018,
  baseSize: 1.8,
  seaLevel: 0.08,
};

const vertexShader = /* glsl */ `
  attribute float aHeight;
  attribute float aRandom;
  varying float vHeight;
  varying float vFog;
  varying float vRandom;
  uniform float uTime;
  uniform float uMaxHeight;
  uniform float uAnimSpeed;
  uniform float uParticleSize;
  uniform float uFogNear;
  uniform float uFogFar;

  void main() {
    vHeight = aHeight / uMaxHeight;
    vRandom = aRandom;

    vec3 pos = position;

    // Subtle vertical breathing based on height and time
    float breathe = sin(uTime * 0.4 * uAnimSpeed + pos.x * 0.02 + pos.z * 0.02) * 0.5 + 0.5;
    pos.y += breathe * vHeight * 2.0;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

    // Size: taller particles are slightly larger, plus subtle pulse
    float pulse = 1.0 + sin(uTime * 0.8 * uAnimSpeed + aRandom * 6.28) * 0.15 * vHeight;
    float heightSize = 1.0 + vHeight * 1.5;
    float baseSize = ${CONFIG.baseSize.toFixed(1)} * uParticleSize;
    gl_PointSize = baseSize * heightSize * pulse * (300.0 / -mvPos.z);

    gl_Position = projectionMatrix * mvPos;

    // Fog factor
    float fogDist = length(mvPos.xyz);
    vFog = smoothstep(uFogNear, uFogFar, fogDist);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;
  varying float vFog;
  varying float vRandom;
  uniform float uTime;
  uniform float uAnimSpeed;
  uniform float uBrightness;
  uniform vec3 uBgColor;
  uniform vec3 uColorLow;
  uniform vec3 uColorMid;
  uniform vec3 uColorHigh;
  uniform vec3 uColorPeak;

  void main() {
    // Soft circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.15, 0.5, dist);

    // Color gradient driven by uniforms
    vec3 color;
    float h = vHeight;
    if (h < 0.3) {
      color = mix(uColorLow, uColorMid, h / 0.3);
    } else if (h < 0.7) {
      color = mix(uColorMid, uColorHigh, (h - 0.3) / 0.4);
    } else {
      color = mix(uColorHigh, uColorPeak, (h - 0.7) / 0.3);
    }

    // Subtle shimmer on higher particles
    float shimmer = sin(uTime * 1.5 * uAnimSpeed + vRandom * 40.0) * 0.5 + 0.5;
    color += shimmer * 0.08 * h;

    // Inner glow — brighter at center
    float glow = 1.0 - smoothstep(0.0, 0.4, dist);
    color += glow * 0.15 * h;

    // Apply brightness
    color *= uBrightness;

    // Apply fog
    color = mix(color, uBgColor, vFog);
    alpha *= (1.0 - vFog * 0.9);
    alpha *= 0.7 + 0.3 * h;

    gl_FragColor = vec4(color, alpha);
  }
`;

interface Props {
  settings: ParticleSettings;
}

export default function MonochromeTerrain({ settings }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bgColorRef = useRef<THREE.Color | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Update uniforms reactively without recreating the scene
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

  // Scene setup — runs once
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let raf = 0;

    const simplex = createNoise2D();
    const totalSize = CONFIG.gridSize * CONFIG.spacing;
    const offset = totalSize / 2;
    const noiseScale = 350 / CONFIG.gridSize;

    const mountainCenterX = 0.35;
    const mountainWidth = 0.06;
    const trenchCenterX = 0.75;
    const trenchWidth = 0.04;

    function getHeight(i: number, j: number): number {
      const nx = i * CONFIG.noiseFreq * noiseScale;
      const nz = j * CONFIG.noiseFreq * noiseScale;

      let noiseVal = (simplex(nx, nz) + 1) / 2;
      noiseVal += simplex(nx * 2, nz * 2) * 0.5;
      noiseVal += simplex(nx * 4, nz * 4) * 0.25;
      noiseVal += simplex(nx * 8, nz * 8) * 0.125;
      noiseVal = noiseVal / 1.875;

      const normI = i / CONFIG.gridSize;
      const normJ = j / CONFIG.gridSize;

      const mountainWave = simplex(normJ * 3, 0.5) * 0.04;
      const mountainDist = Math.abs(normI - mountainCenterX - mountainWave);
      const mountainInfluence = Math.exp(-(mountainDist * mountainDist) / (2 * mountainWidth * mountainWidth));

      const trenchWave = simplex(normJ * 4, 1.5) * 0.03;
      const trenchDist = Math.abs(normI - trenchCenterX - trenchWave);
      const trenchInfluence = Math.exp(-(trenchDist * trenchDist) / (2 * trenchWidth * trenchWidth));

      const hillY = noiseVal * CONFIG.hillHeight;
      const mountainY = mountainInfluence * noiseVal * CONFIG.mountainHeight;
      const trenchY = trenchInfluence * CONFIG.trenchDepth;

      let displayY = hillY + mountainY - trenchY;
      const seaFloor = CONFIG.seaLevel * CONFIG.hillHeight;
      if (displayY < seaFloor) displayY = seaFloor * 0.3;

      return displayY;
    }

    // Scene
    const scene = new THREE.Scene();
    const initTheme = THEMES[settings.theme] || THEMES.mono;
    const bgColor = new THREE.Color(initTheme.bg[0], initTheme.bg[1], initTheme.bg[2]);
    scene.background = bgColor;
    bgColorRef.current = bgColor;
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.5,
      20000
    );
    camera.position.set(0, 100, 200);

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
    controls.autoRotateSpeed = 0.12;
    controls.maxDistance = 350;
    controls.minDistance = 30;
    controlsRef.current = controls;

    // Generate terrain
    const count = CONFIG.gridSize * CONFIG.gridSize;
    const positions = new Float32Array(count * 3);
    const heights = new Float32Array(count);
    const randoms = new Float32Array(count);
    const maxH = CONFIG.hillHeight + CONFIG.mountainHeight;

    let k = 0;
    for (let i = 0; i < CONFIG.gridSize; i++) {
      for (let j = 0; j < CONFIG.gridSize; j++) {
        const x = i * CONFIG.spacing - offset;
        const z = j * CONFIG.spacing - offset;
        const y = getHeight(i, j);

        positions[k * 3] = x;
        positions[k * 3 + 1] = y;
        positions[k * 3 + 2] = z;
        heights[k] = y;
        randoms[k] = Math.random();
        k++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aHeight', new THREE.BufferAttribute(heights, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const uniforms = {
      uTime: { value: 0 },
      uMaxHeight: { value: maxH },
      uBrightness: { value: 1.0 },
      uParticleSize: { value: 1.0 },
      uAnimSpeed: { value: 1.0 },
      uFogNear: { value: 100.0 },
      uFogFar: { value: 450.0 },
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

    // Cleanup
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

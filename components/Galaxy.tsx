'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { type ParticleSettings, THEMES } from './SettingsPanel';

// Galaxy parameters
const ARM_COUNT = 4;
const PARTICLES_PER_ARM = 120_000;
const BULGE_COUNT = 80_000;
const HALO_COUNT = 50_000;
const TOTAL = ARM_COUNT * PARTICLES_PER_ARM + BULGE_COUNT + HALO_COUNT;

const GALAXY_RADIUS = 280;
const ARM_TWIST = 3.2;       // radians of twist per arm
const ARM_WIDTH = 0.22;      // tightness of arms
const BULGE_RADIUS = 35;

const vertexShader = /* glsl */ `
  attribute float aType;    // 0 = arm, 1 = bulge, 2 = halo
  attribute float aArm;     // which arm (0-3)
  attribute float aRandom;
  attribute float aRadius;  // distance from center (0-1)
  varying float vBrightness;
  varying float vType;
  varying float vRadius;
  varying float vRandom;
  varying float vFog;
  uniform float uTime;
  uniform float uAnimSpeed;
  uniform float uParticleSize;
  uniform float uFogNear;
  uniform float uFogFar;

  void main() {
    vType   = aType;
    vRadius = aRadius;
    vRandom = aRandom;

    vec3 pos = position;

    // Gentle differential rotation (inner spins faster)
    float rotSpeed = (1.0 - aRadius * 0.7) * 0.04 * uAnimSpeed;
    float rot = uTime * rotSpeed + aArm * 1.5708;  // pi/2 offset per arm
    mat2 spinMat = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
    pos.xz = spinMat * pos.xz;

    // Vertical ripple for arm particles
    if (aType < 0.5) {
      float ripple = sin(uTime * 0.35 * uAnimSpeed + aRadius * 8.0 + aRandom * 6.28) * 1.2 * (1.0 - aRadius);
      pos.y += ripple;
    }

    // Bulge: slow vertical breathing
    if (aType > 0.5 && aType < 1.5) {
      float breathe = sin(uTime * 0.3 * uAnimSpeed + aRandom * 6.28) * 2.5;
      pos.y += breathe;
    }

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

    // Arm stars at ends are dimmer/smaller; center is brighter
    float sizeBoost = aType < 0.5 ? (1.2 - aRadius * 0.5) : (aType < 1.5 ? 1.4 : 0.6);
    float twinkle = 1.0 + sin(uTime * 2.0 * uAnimSpeed + aRandom * 40.0) * 0.08;
    gl_PointSize = 1.6 * uParticleSize * sizeBoost * twinkle * (300.0 / -mvPos.z);

    gl_Position = projectionMatrix * mvPos;

    float fogDist = length(mvPos.xyz);
    vFog = smoothstep(uFogNear, uFogFar, fogDist);
    vBrightness = sizeBoost;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vBrightness;
  varying float vType;
  varying float vRadius;
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

    float alpha = 1.0 - smoothstep(0.05, 0.5, dist);
    float glow  = 1.0 - smoothstep(0.0, 0.3, dist);

    vec3 color;

    // Spiral arms: color gradient from inner (warm) to outer (cool)
    if (vType < 0.5) {
      if (vRadius < 0.3) {
        color = mix(uColorMid, uColorHigh, vRadius / 0.3);
      } else if (vRadius < 0.7) {
        color = mix(uColorHigh, uColorMid, (vRadius - 0.3) / 0.4);
      } else {
        color = mix(uColorMid, uColorLow, (vRadius - 0.7) / 0.3);
      }
      // Rare bright star flash
      float flash = pow(sin(uTime * 3.0 * uAnimSpeed + vRandom * 60.0) * 0.5 + 0.5, 12.0);
      color += uColorPeak * flash * 0.5;
      alpha *= 0.55 + 0.45 * (1.0 - vRadius);

    // Bulge: hot bright core
    } else if (vType < 1.5) {
      float t = sin(uTime * 0.5 * uAnimSpeed + vRandom * 15.0) * 0.5 + 0.5;
      color = mix(uColorHigh, uColorPeak, t);
      color += glow * 0.3;
      alpha *= 0.8;

    // Halo: sparse, dim
    } else {
      color = mix(uColorLow, uColorMid, vRandom);
      alpha *= 0.3;
    }

    color += glow * 0.1 * vBrightness;
    color *= uBrightness;
    color = mix(color, uBgColor, vFog);
    alpha *= (1.0 - vFog * 0.9);

    gl_FragColor = vec4(color, alpha);
  }
`;

interface Props {
  settings: ParticleSettings;
}

export default function Galaxy({ settings }: Props) {
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

    const positions = new Float32Array(TOTAL * 3);
    const types     = new Float32Array(TOTAL);
    const arms      = new Float32Array(TOTAL);
    const radii     = new Float32Array(TOTAL);
    const randoms   = new Float32Array(TOTAL);

    let idx = 0;

    // -- Spiral arms --
    for (let a = 0; a < ARM_COUNT; a++) {
      const armAngle = (a / ARM_COUNT) * Math.PI * 2;
      for (let i = 0; i < PARTICLES_PER_ARM; i++) {
        // Logarithmic distribution — denser near center
        const t = Math.pow(Math.random(), 0.8);
        const r = BULGE_RADIUS + t * (GALAXY_RADIUS - BULGE_RADIUS);
        const norm = (r - BULGE_RADIUS) / (GALAXY_RADIUS - BULGE_RADIUS);

        const twist  = norm * ARM_TWIST;
        const spread = (Math.random() - 0.5) * ARM_WIDTH * (0.4 + norm * 0.6) * GALAXY_RADIUS;
        const angle  = armAngle + twist + spread / GALAXY_RADIUS * 0.5;

        const x = Math.cos(angle) * r + (Math.random() - 0.5) * 5;
        const z = Math.sin(angle) * r + (Math.random() - 0.5) * 5;
        const y = (Math.random() - 0.5) * 12 * (1 - norm * 0.8);

        positions[idx * 3]     = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;
        types[idx]   = 0;
        arms[idx]    = a;
        radii[idx]   = norm;
        randoms[idx] = Math.random();
        idx++;
      }
    }

    // -- Core bulge --
    for (let i = 0; i < BULGE_COUNT; i++) {
      const r     = Math.pow(Math.random(), 0.5) * BULGE_RADIUS * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi   = (Math.random() - 0.5) * Math.PI;
      const flatten = 0.35;
      positions[idx * 3]     = r * Math.cos(theta) * Math.cos(phi);
      positions[idx * 3 + 1] = r * Math.sin(phi) * flatten;
      positions[idx * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
      types[idx]   = 1;
      arms[idx]    = 0;
      radii[idx]   = r / BULGE_RADIUS;
      randoms[idx] = Math.random();
      idx++;
    }

    // -- Sparse halo --
    for (let i = 0; i < HALO_COUNT; i++) {
      const r   = GALAXY_RADIUS * 0.7 + Math.random() * GALAXY_RADIUS * 0.5;
      const th  = Math.random() * Math.PI * 2;
      const ph  = (Math.random() - 0.5) * Math.PI * 0.6;
      positions[idx * 3]     = r * Math.cos(th) * Math.cos(ph);
      positions[idx * 3 + 1] = r * Math.sin(ph) * 0.25;
      positions[idx * 3 + 2] = r * Math.sin(th) * Math.cos(ph);
      types[idx]   = 2;
      arms[idx]    = 0;
      radii[idx]   = 1.0;
      randoms[idx] = Math.random();
      idx++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aType',    new THREE.BufferAttribute(types, 1));
    geometry.setAttribute('aArm',     new THREE.BufferAttribute(arms, 1));
    geometry.setAttribute('aRadius',  new THREE.BufferAttribute(radii, 1));
    geometry.setAttribute('aRandom',  new THREE.BufferAttribute(randoms, 1));

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

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 20000);
    camera.position.set(100, 200, 450);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = settings.autoRotateSpeed * 0.6;
    controls.maxDistance = 1200;
    controls.minDistance = 40;
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

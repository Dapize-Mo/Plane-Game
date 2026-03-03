'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { type ParticleSettings, THEMES } from './SettingsPanel';

const ARM_COUNT    = 4;
const GALAXY_RADIUS = 280;
const ARM_TWIST     = 3.2;
const ARM_WIDTH     = 0.22;
const BULGE_RADIUS  = 35;

function getGalaxyCounts(quality: string) {
  if (quality === 'low')    return { perArm: 30_000, bulge: 25_000, halo: 15_000 };
  if (quality === 'medium') return { perArm: 70_000, bulge: 50_000, halo: 30_000 };
  return                           { perArm: 120_000, bulge: 80_000, halo: 50_000 };
}

function getPlanetParticleCount(quality: string) {
  if (quality === 'low')    return 3_000;
  if (quality === 'medium') return 6_000;
  return                           10_000;
}

// Orbital parameters for planets; at most 6 entries (matches max planetCount)
const PLANET_CONFIGS = [
  { orbitRadius: 130, orbitY:  12, orbitSpeed: 0.18, size: 14, colorA: [0.4, 0.6, 1.0] as [number,number,number], colorB: [0.8, 0.9, 1.0] as [number,number,number] },
  { orbitRadius: 195, orbitY: -18, orbitSpeed: 0.11, size: 19, colorA: [1.0, 0.55, 0.2] as [number,number,number], colorB: [1.0, 0.85, 0.5] as [number,number,number] },
  { orbitRadius: 240, orbitY:  25, orbitSpeed: 0.07, size: 12, colorA: [0.5, 1.0, 0.6] as [number,number,number], colorB: [0.8, 1.0, 0.9] as [number,number,number] },
  { orbitRadius: 100, orbitY: -8,  orbitSpeed: 0.25, size: 10, colorA: [0.9, 0.3, 0.8] as [number,number,number], colorB: [1.0, 0.7, 1.0] as [number,number,number] },
  { orbitRadius: 165, orbitY:  35, orbitSpeed: 0.13, size: 16, colorA: [1.0, 0.8, 0.2] as [number,number,number], colorB: [1.0, 1.0, 0.6] as [number,number,number] },
  { orbitRadius: 215, orbitY: -30, orbitSpeed: 0.09, size: 11, colorA: [0.3, 0.9, 0.9] as [number,number,number], colorB: [0.7, 1.0, 1.0] as [number,number,number] },
];

// ---- Galaxy shaders (unchanged from original) ----
const galaxyVertexShader = /* glsl */ `
  attribute float aType;
  attribute float aArm;
  attribute float aRandom;
  attribute float aRadius;
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

    float rotSpeed = (1.0 - aRadius * 0.7) * 0.04 * uAnimSpeed;
    float rot = uTime * rotSpeed + aArm * 1.5708;
    mat2 spinMat = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
    pos.xz = spinMat * pos.xz;

    if (aType < 0.5) {
      float ripple = sin(uTime * 0.35 * uAnimSpeed + aRadius * 8.0 + aRandom * 6.28) * 1.2 * (1.0 - aRadius);
      pos.y += ripple;
    }
    if (aType > 0.5 && aType < 1.5) {
      float breathe = sin(uTime * 0.3 * uAnimSpeed + aRandom * 6.28) * 2.5;
      pos.y += breathe;
    }

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

    float sizeBoost = aType < 0.5 ? (1.2 - aRadius * 0.5) : (aType < 1.5 ? 1.4 : 0.6);
    float twinkle   = 1.0 + sin(uTime * 2.0 * uAnimSpeed + aRandom * 40.0) * 0.08;
    gl_PointSize = 1.6 * uParticleSize * sizeBoost * twinkle * (300.0 / -mvPos.z);

    gl_Position = projectionMatrix * mvPos;

    float fogDist = length(mvPos.xyz);
    vFog = smoothstep(uFogNear, uFogFar, fogDist);
    vBrightness = sizeBoost;
  }
`;

const galaxyFragmentShader = /* glsl */ `
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
    float dist  = length(center);
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.05, 0.5, dist);
    float glow  = 1.0 - smoothstep(0.0, 0.3, dist);

    vec3 color;

    if (vType < 0.5) {
      if (vRadius < 0.3) {
        color = mix(uColorMid, uColorHigh, vRadius / 0.3);
      } else if (vRadius < 0.7) {
        color = mix(uColorHigh, uColorMid, (vRadius - 0.3) / 0.4);
      } else {
        color = mix(uColorMid, uColorLow, (vRadius - 0.7) / 0.3);
      }
      float flash = pow(sin(uTime * 3.0 * uAnimSpeed + vRandom * 60.0) * 0.5 + 0.5, 12.0);
      color += uColorPeak * flash * 0.5;
      alpha *= 0.55 + 0.45 * (1.0 - vRadius);

    } else if (vType < 1.5) {
      float t = sin(uTime * 0.5 * uAnimSpeed + vRandom * 15.0) * 0.5 + 0.5;
      color = mix(uColorHigh, uColorPeak, t);
      color += glow * 0.3;
      alpha *= 0.8;

    } else {
      color = mix(uColorLow, uColorMid, vRandom);
      alpha *= 0.3;
    }

    color += glow * 0.1 * vBrightness;
    color *= uBrightness;
    color  = mix(color, uBgColor, vFog);
    alpha *= (1.0 - vFog * 0.9);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ---- Planet shaders ----
const planetVertexShader = /* glsl */ `
  attribute float aPhase;
  attribute float aRandom;
  varying float vRandom;
  varying float vFog;
  uniform float uTime;
  uniform float uAnimSpeed;
  uniform float uParticleSize;
  uniform float uFogNear;
  uniform float uFogFar;

  void main() {
    vec3 pos = position;

    // Gentle radial pulse
    float pulse = 1.0 + sin(uTime * 1.1 * uAnimSpeed + aPhase) * 0.04;
    pos *= pulse;

    vec4 mvPos  = modelViewMatrix * vec4(pos, 1.0);
    float twink = 1.0 + sin(uTime * 2.5 * uAnimSpeed + aRandom * 40.0) * 0.10;
    gl_PointSize = 2.0 * uParticleSize * twink * (300.0 / -mvPos.z);

    gl_Position = projectionMatrix * mvPos;

    vRandom = aRandom;
    float fogDist = length(mvPos.xyz);
    vFog = smoothstep(uFogNear, uFogFar, fogDist);
  }
`;

const planetFragmentShader = /* glsl */ `
  varying float vRandom;
  varying float vFog;
  uniform float uTime;
  uniform float uAnimSpeed;
  uniform float uBrightness;
  uniform vec3 uBgColor;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist  = length(center);
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.08, 0.5, dist);
    float glow  = 1.0 - smoothstep(0.0, 0.35, dist);

    float t     = sin(uTime * 0.7 * uAnimSpeed + vRandom * 20.0) * 0.5 + 0.5;
    vec3 color  = mix(uColorA, uColorB, t);
    color += glow * 0.35;
    color *= uBrightness;
    color  = mix(color, uBgColor, vFog);
    alpha *= (1.0 - vFog * 0.9);

    gl_FragColor = vec4(color, alpha);
  }
`;

function makePlanetGeometry(radius: number, count: number) {
  const positions = new Float32Array(count * 3);
  const phases    = new Float32Array(count);
  const randoms   = new Float32Array(count);
  const golden    = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y     = 1 - (i / (count - 1)) * 2;
    const r     = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const jit   = (Math.random() - 0.5) * radius * 0.06;
    positions[i * 3]     = Math.cos(theta) * r * radius + jit;
    positions[i * 3 + 1] = y * radius + jit;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius + jit;
    phases[i]   = Math.random() * Math.PI * 2;
    randoms[i]  = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aRandom',  new THREE.BufferAttribute(randoms, 1));
  return geo;
}

interface Props {
  settings: ParticleSettings;
}

export default function Galaxy({ settings }: Props) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bgColorRef  = useRef<THREE.Color | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  // Ref to all planet material uniforms for reactive updates
  const planetUnifsRef = useRef<Array<Record<string, { value: unknown }>>>([]);

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
    // Update planet materials
    for (const pu of planetUnifsRef.current) {
      pu.uBrightness.value   = settings.brightness;
      pu.uParticleSize.value = settings.particleSize;
      pu.uAnimSpeed.value    = settings.animSpeed;
      pu.uFogNear.value      = settings.fogNear;
      pu.uFogFar.value       = settings.fogFar;
      pu.uBgColor.value      = new THREE.Vector3(newBg.r, newBg.g, newBg.b);
    }
    if (ctrl) ctrl.autoRotateSpeed = settings.autoRotateSpeed * 0.6;
  }, [settings]);

  // Scene setup
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let raf = 0;

    const { perArm: PARTICLES_PER_ARM, bulge: BULGE_COUNT, halo: HALO_COUNT } = getGalaxyCounts(settings.quality);
    const TOTAL      = ARM_COUNT * PARTICLES_PER_ARM + BULGE_COUNT + HALO_COUNT;
    const planetCount = Math.max(0, Math.min(6, Math.round(settings.planetCount)));
    const ppCount    = getPlanetParticleCount(settings.quality);

    // Galaxy geometry
    const positions = new Float32Array(TOTAL * 3);
    const types     = new Float32Array(TOTAL);
    const arms      = new Float32Array(TOTAL);
    const radii     = new Float32Array(TOTAL);
    const randoms   = new Float32Array(TOTAL);

    let idx = 0;

    // Spiral arms
    for (let a = 0; a < ARM_COUNT; a++) {
      const armAngle = (a / ARM_COUNT) * Math.PI * 2;
      for (let i = 0; i < PARTICLES_PER_ARM; i++) {
        const t      = Math.pow(Math.random(), 0.8);
        const r      = BULGE_RADIUS + t * (GALAXY_RADIUS - BULGE_RADIUS);
        const norm   = (r - BULGE_RADIUS) / (GALAXY_RADIUS - BULGE_RADIUS);
        const twist  = norm * ARM_TWIST;
        const spread = (Math.random() - 0.5) * ARM_WIDTH * (0.4 + norm * 0.6) * GALAXY_RADIUS;
        const angle  = armAngle + twist + spread / GALAXY_RADIUS * 0.5;
        positions[idx * 3]     = Math.cos(angle) * r + (Math.random() - 0.5) * 5;
        positions[idx * 3 + 1] = (Math.random() - 0.5) * 12 * (1 - norm * 0.8);
        positions[idx * 3 + 2] = Math.sin(angle) * r + (Math.random() - 0.5) * 5;
        types[idx]   = 0; arms[idx] = a; radii[idx] = norm; randoms[idx] = Math.random();
        idx++;
      }
    }

    // Core bulge
    for (let i = 0; i < BULGE_COUNT; i++) {
      const r     = Math.pow(Math.random(), 0.5) * BULGE_RADIUS * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi   = (Math.random() - 0.5) * Math.PI;
      positions[idx * 3]     = r * Math.cos(theta) * Math.cos(phi);
      positions[idx * 3 + 1] = r * Math.sin(phi) * 0.35;
      positions[idx * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
      types[idx] = 1; arms[idx] = 0; radii[idx] = r / BULGE_RADIUS; randoms[idx] = Math.random();
      idx++;
    }

    // Sparse halo
    for (let i = 0; i < HALO_COUNT; i++) {
      const r  = GALAXY_RADIUS * 0.7 + Math.random() * GALAXY_RADIUS * 0.5;
      const th = Math.random() * Math.PI * 2;
      const ph = (Math.random() - 0.5) * Math.PI * 0.6;
      positions[idx * 3]     = r * Math.cos(th) * Math.cos(ph);
      positions[idx * 3 + 1] = r * Math.sin(ph) * 0.25;
      positions[idx * 3 + 2] = r * Math.sin(th) * Math.cos(ph);
      types[idx] = 2; arms[idx] = 0; radii[idx] = 1.0; randoms[idx] = Math.random();
      idx++;
    }

    const galaxyGeo = new THREE.BufferGeometry();
    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    galaxyGeo.setAttribute('aType',    new THREE.BufferAttribute(types, 1));
    galaxyGeo.setAttribute('aArm',     new THREE.BufferAttribute(arms, 1));
    galaxyGeo.setAttribute('aRadius',  new THREE.BufferAttribute(radii, 1));
    galaxyGeo.setAttribute('aRandom',  new THREE.BufferAttribute(randoms, 1));

    const initTheme  = THEMES[settings.theme] || THEMES.mono;
    const galaxyUnifs = {
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
    uniformsRef.current = galaxyUnifs;

    const galaxyMat = new THREE.ShaderMaterial({
      vertexShader: galaxyVertexShader,
      fragmentShader: galaxyFragmentShader,
      uniforms: galaxyUnifs,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    const scene   = new THREE.Scene();
    const bgColor = new THREE.Color(initTheme.bg[0], initTheme.bg[1], initTheme.bg[2]);
    scene.background   = bgColor;
    bgColorRef.current = bgColor;
    sceneRef.current   = scene;
    scene.add(new THREE.Points(galaxyGeo, galaxyMat));

    // Create planets
    const planetMeshes: Array<{ group: THREE.Object3D; orbitAngle: number; orbitRadius: number; orbitY: number; orbitSpeed: number; uniforms: Record<string, { value: unknown }> }> = [];
    const allPlanetUnifs: Array<Record<string, { value: unknown }>> = [];

    for (let p = 0; p < planetCount; p++) {
      const cfg = PLANET_CONFIGS[p];
      const geo = makePlanetGeometry(cfg.size, ppCount);

      const pu = {
        uTime:         { value: 0 },
        uBrightness:   { value: settings.brightness },
        uParticleSize: { value: settings.particleSize },
        uAnimSpeed:    { value: settings.animSpeed },
        uFogNear:      { value: settings.fogNear },
        uFogFar:       { value: settings.fogFar },
        uBgColor:      { value: new THREE.Vector3(...initTheme.bg) },
        uColorA:       { value: new THREE.Vector3(...cfg.colorA) },
        uColorB:       { value: new THREE.Vector3(...cfg.colorB) },
      };

      const mat   = new THREE.ShaderMaterial({
        vertexShader: planetVertexShader,
        fragmentShader: planetFragmentShader,
        uniforms: pu,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geo, mat);
      const group  = new THREE.Object3D();
      group.add(points);

      // Initial orbit angle staggered
      const initAngle = (p / planetCount) * Math.PI * 2;
      group.position.set(
        Math.cos(initAngle) * cfg.orbitRadius,
        cfg.orbitY,
        Math.sin(initAngle) * cfg.orbitRadius,
      );
      scene.add(group);

      planetMeshes.push({ group, orbitAngle: initAngle, orbitRadius: cfg.orbitRadius, orbitY: cfg.orbitY, orbitSpeed: cfg.orbitSpeed, uniforms: pu });
      allPlanetUnifs.push(pu);
    }
    planetUnifsRef.current = allPlanetUnifs;

    // Camera — slightly above galaxy plane, looking down at an angle
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 20000);
    camera.position.set(120, 260, 480);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.05;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = settings.autoRotateSpeed * 0.6;
    controls.maxDistance     = 1400;
    controls.minDistance     = 40;
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
      const t  = clock.getElapsedTime();

      galaxyUnifs.uTime.value = t;

      // Orbit planets
      for (const pm of planetMeshes) {
        pm.orbitAngle += pm.orbitSpeed * 0.016; // ~60fps assumed; gentle orbit
        pm.group.position.set(
          Math.cos(pm.orbitAngle) * pm.orbitRadius,
          pm.orbitY,
          Math.sin(pm.orbitAngle) * pm.orbitRadius,
        );
        pm.group.rotation.y += 0.005 * settings.animSpeed;
        pm.uniforms.uTime.value = t;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      galaxyGeo.dispose();
      galaxyMat.dispose();
      for (const pm of planetMeshes) {
        const pts = pm.group.children[0] as THREE.Points;
        pts.geometry.dispose();
        (pts.material as THREE.Material).dispose();
      }
      uniformsRef.current     = null;
      controlsRef.current     = null;
      bgColorRef.current      = null;
      sceneRef.current        = null;
      planetUnifsRef.current  = [];
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [settings.quality, settings.planetCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} />;
}

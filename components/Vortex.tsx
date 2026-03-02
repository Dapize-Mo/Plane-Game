'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { type ParticleSettings, THEMES } from './SettingsPanel';

function getVortexCounts(quality: string) {
  if (quality === 'low')    return { spiral: 50_000, debris: 25_000, streamers: 7_000 };
  if (quality === 'medium') return { spiral: 90_000, debris: 50_000, streamers: 13_000 };
  return                           { spiral: 150_000, debris: 80_000, streamers: 20_000 };
}

const HEIGHT      = 160;
const BASE_RADIUS = 80;

const vertexShader = /* glsl */ `
  attribute float aType;
  attribute float aRandom;
  attribute float aProgress;
  attribute float aAngleBase;
  varying float vHeight;
  varying float vType;
  varying float vRandom;
  varying float vFog;
  uniform float uTime;
  uniform float uAnimSpeed;
  uniform float uParticleSize;
  uniform float uFogNear;
  uniform float uFogFar;

  void main() {
    vType    = aType;
    vRandom  = aRandom;
    vHeight  = aProgress;

    vec3 pos = position;

    if (aType < 0.5) {
      float spinRate = (1.5 - aProgress * 1.2) * uAnimSpeed;
      float angle    = aAngleBase + uTime * spinRate;
      float radius   = mix(80.0, 8.0, aProgress * aProgress);
      float wobble   = sin(uTime * 1.2 * uAnimSpeed + aProgress * 12.0 + aRandom * 6.28) * 4.0 * (1.0 - aProgress);

      pos.x = cos(angle) * (radius + wobble);
      pos.z = sin(angle) * (radius + wobble);
      float drift = mod(uTime * 18.0 * uAnimSpeed * (0.3 + aProgress * 0.7) + aRandom * float(${HEIGHT}), float(${HEIGHT}));
      pos.y = drift - float(${HEIGHT}) * 0.5;

    } else if (aType < 1.5) {
      float debris_angle = aAngleBase + uTime * 0.3 * uAnimSpeed * (1.0 + aRandom);
      float debris_r     = 80.0 + aRandom * 60.0 + sin(uTime * 0.5 * uAnimSpeed + aRandom * 20.0) * 10.0;
      pos.x = cos(debris_angle) * debris_r;
      pos.z = sin(debris_angle) * debris_r;
      pos.y += sin(uTime * 0.4 * uAnimSpeed + aRandom * 8.0) * 8.0;

    } else {
      float bolt_angle = aAngleBase + uTime * 2.5 * uAnimSpeed;
      float bolt_r     = aProgress * 30.0 * (1.0 - aProgress);
      pos.x = cos(bolt_angle + aProgress * 15.0) * bolt_r;
      pos.z = sin(bolt_angle + aProgress * 15.0) * bolt_r;
      pos.y = aProgress * float(${HEIGHT}) - float(${HEIGHT}) * 0.5;
    }

    vec4 mvPos   = modelViewMatrix * vec4(pos, 1.0);
    float typeSize = aType < 0.5 ? 1.0 : (aType < 1.5 ? 0.8 : 1.5);
    float pulse    = 1.0 + sin(uTime * 2.0 * uAnimSpeed + aRandom * 6.28) * 0.1;
    gl_PointSize   = 1.6 * uParticleSize * typeSize * pulse * (300.0 / -mvPos.z);

    gl_Position = projectionMatrix * mvPos;

    float fogDist = length(mvPos.xyz);
    vFog = smoothstep(uFogNear, uFogFar, fogDist);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;
  varying float vType;
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

    float alpha = 1.0 - smoothstep(0.08, 0.5, dist);
    float glow  = 1.0 - smoothstep(0.0, 0.3, dist);

    vec3 color;

    if (vType < 0.5) {
      if (vHeight < 0.4) {
        color = mix(uColorLow, uColorMid, vHeight / 0.4);
      } else if (vHeight < 0.75) {
        color = mix(uColorMid, uColorHigh, (vHeight - 0.4) / 0.35);
      } else {
        color = mix(uColorHigh, uColorPeak, (vHeight - 0.75) / 0.25);
      }
      float flicker = sin(uTime * 3.5 * uAnimSpeed + vRandom * 80.0) * 0.5 + 0.5;
      color += uColorMid * flicker * 0.08;
      alpha *= 0.65;

    } else if (vType < 1.5) {
      float t = sin(uTime * 0.6 * uAnimSpeed + vRandom * 15.0) * 0.5 + 0.5;
      color = mix(uColorLow, uColorMid, t);
      alpha *= 0.45;

    } else {
      float bolt = pow(sin(uTime * 6.0 * uAnimSpeed + vRandom * 30.0) * 0.5 + 0.5, 4.0);
      color = mix(uColorHigh, uColorPeak, bolt);
      color += uColorPeak * bolt * 0.5;
      alpha *= bolt * 0.9 + 0.1;
    }

    color += glow * 0.15;
    color *= uBrightness;
    color  = mix(color, uBgColor, vFog);
    alpha *= (1.0 - vFog * 0.9);

    gl_FragColor = vec4(color, alpha);
  }
`;

interface Props {
  settings: ParticleSettings;
}

export default function Vortex({ settings }: Props) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bgColorRef  = useRef<THREE.Color | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);

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

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let raf = 0;

    const { spiral: SPIRAL_COUNT, debris: DEBRIS_COUNT, streamers: STREAMER_COUNT } = getVortexCounts(settings.quality);
    const TOTAL = SPIRAL_COUNT + DEBRIS_COUNT + STREAMER_COUNT;

    const positions  = new Float32Array(TOTAL * 3);
    const types      = new Float32Array(TOTAL);
    const randoms    = new Float32Array(TOTAL);
    const progresses = new Float32Array(TOTAL);
    const angleBases = new Float32Array(TOTAL);

    let idx = 0;

    for (let i = 0; i < SPIRAL_COUNT; i++) {
      const progress = Math.random();
      const angle    = Math.random() * Math.PI * 2;
      const radius   = THREE.MathUtils.lerp(BASE_RADIUS, 5, progress * progress);
      positions[idx * 3]     = Math.cos(angle) * radius;
      positions[idx * 3 + 1] = progress * HEIGHT - HEIGHT * 0.5;
      positions[idx * 3 + 2] = Math.sin(angle) * radius;
      types[idx] = 0; randoms[idx] = Math.random(); progresses[idx] = progress; angleBases[idx] = angle;
      idx++;
    }

    for (let i = 0; i < DEBRIS_COUNT; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = BASE_RADIUS + Math.random() * 70;
      const y      = (Math.random() - 0.5) * HEIGHT * 0.8;
      positions[idx * 3]     = Math.cos(angle) * radius;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = Math.sin(angle) * radius;
      types[idx] = 1; randoms[idx] = Math.random(); progresses[idx] = (y + HEIGHT * 0.5) / HEIGHT; angleBases[idx] = angle;
      idx++;
    }

    for (let i = 0; i < STREAMER_COUNT; i++) {
      const progress = Math.random();
      const angle    = Math.random() * Math.PI * 2;
      positions[idx * 3]     = 0;
      positions[idx * 3 + 1] = progress * HEIGHT - HEIGHT * 0.5;
      positions[idx * 3 + 2] = 0;
      types[idx] = 2; randoms[idx] = Math.random(); progresses[idx] = progress; angleBases[idx] = angle;
      idx++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',  new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aType',     new THREE.BufferAttribute(types, 1));
    geometry.setAttribute('aRandom',   new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aProgress', new THREE.BufferAttribute(progresses, 1));
    geometry.setAttribute('aAngleBase',new THREE.BufferAttribute(angleBases, 1));

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

    const scene   = new THREE.Scene();
    const bgColor = new THREE.Color(initTheme.bg[0], initTheme.bg[1], initTheme.bg[2]);
    scene.background   = bgColor;
    bgColorRef.current = bgColor;
    sceneRef.current   = scene;
    scene.add(new THREE.Points(geometry, material));

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 10000);
    camera.position.set(180, 80, 260);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.05;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = settings.autoRotateSpeed;
    controls.maxDistance     = 600;
    controls.minDistance     = 20;
    controlsRef.current = controls;

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const guide = [
    {
      dot: 'rgba(120,180,255,0.8)',
      label: 'Funnel Spiral',
      desc: 'Particles spin around a shrinking funnel — faster near the top eye of the vortex.',
    },
    {
      dot: 'rgba(180,180,180,0.6)',
      label: 'Debris Field',
      desc: 'Outer fragments orbit at varying radii, flung outward by centrifugal force.',
    },
    {
      dot: 'rgba(255,255,255,0.9)',
      label: 'Lightning Core',
      desc: 'Bright electric streamers pulse and arc along the central axis.',
    },
  ];

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Explanation overlay */}
      <div style={{
        position: 'absolute',
        bottom: 90,
        left: 20,
        zIndex: 10,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        padding: '12px 14px',
        maxWidth: 230,
        pointerEvents: 'none',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 10px 0' }}>
          Vortex Guide
        </p>
        {guide.map(item => (
          <div key={item.label} style={{ display: 'flex', gap: 9, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: item.dot,
              flexShrink: 0, marginTop: 3,
              boxShadow: `0 0 6px ${item.dot}`,
            }} />
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 2px 0', fontWeight: 500 }}>{item.label}</p>
              <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9, margin: 0, lineHeight: 1.45 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

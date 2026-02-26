'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight, getTerrainColor, getVisualHeight } from '@/lib/terrain';
import { GameSettings, defaultSettings } from '@/lib/settings';

// Deterministic hash for jitter (avoids sin-based precision issues)
function hashJitter(x: number, z: number, seed: number): number {
  let h = ((x * 374761393 + z * 668265263 + seed * 1274126177) | 0);
  h = (((h >> 13) ^ h) * 1274126177) | 0;
  h = ((h >> 16) ^ h) | 0;
  return (h & 0xffff) / 0xffff; // 0 to 1
}

interface ParticleTerrainProps {
  playerPosition: React.MutableRefObject<{ x: number; y: number; z: number }>;
  settings?: GameSettings;
}

export default function ParticleTerrain({
  playerPosition,
  settings = defaultSettings,
}: ParticleTerrainProps) {
  const TERRAIN_COUNT = 30000;
  const ATMO_COUNT = 3000;
  const TOTAL_COUNT = TERRAIN_COUNT + ATMO_COUNT;
  const GRID_SPACING = settings.particleSpacing;
  const RENDER_DIST = settings.renderDistance;

  const pointsRef = useRef<THREE.Points>(null);
  const lastUpdateX = useRef(Infinity);
  const lastUpdateZ = useRef(Infinity);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(TOTAL_COUNT * 3);
    const colors = new Float32Array(TOTAL_COUNT * 3);
    const sizes = new Float32Array(TOTAL_COUNT);
    const phases = new Float32Array(TOTAL_COUNT);

    for (let i = 0; i < TOTAL_COUNT; i++) {
      phases[i] = Math.random() * Math.PI * 2;
      sizes[i] = i < TERRAIN_COUNT ? 0.6 + Math.random() * 0.8 : 0.3 + Math.random() * 0.4;
      positions[i * 3 + 1] = -10000;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));

    const pSize = settings.particleSize || 4.0;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseSize: { value: pSize },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        uniform float baseSize;

        void main() {
          vColor = color;
          vec3 pos = position;

          if (pos.y < -9000.0) {
            gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
            gl_PointSize = 0.0;
            vAlpha = 0.0;
            return;
          }

          // Animate: gentle float + shimmer
          pos.y += sin(time * 0.5 + aPhase) * 1.0;
          pos.x += sin(time * 0.25 + aPhase * 1.7) * 0.3;
          pos.z += cos(time * 0.2 + aPhase * 2.3) * 0.3;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float dist = -mvPosition.z;
          gl_PointSize = baseSize * aSize * (250.0 / max(dist, 1.0));
          gl_PointSize = clamp(gl_PointSize, 1.0, 30.0);
          gl_Position = projectionMatrix * mvPosition;

          vAlpha = smoothstep(${RENDER_DIST.toFixed(1)}, ${(RENDER_DIST * 0.55).toFixed(1)}, dist);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Soft glow with bright center
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float core = 1.0 - smoothstep(0.0, 0.15, dist);
          float alpha = (glow * glow * 0.7 + core * 0.3) * vAlpha;
          vec3 col = vColor * (1.0 + core * 0.8);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [TOTAL_COUNT, TERRAIN_COUNT, GRID_SPACING, RENDER_DIST, settings.particleSize]);

  const updateTerrain = (centerX: number, centerZ: number) => {
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    const halfGrid = Math.ceil(RENDER_DIST / GRID_SPACING);
    const snapX = Math.round(centerX / GRID_SPACING) * GRID_SPACING;
    const snapZ = Math.round(centerZ / GRID_SPACING) * GRID_SPACING;

    let idx = 0;

    for (let gx = -halfGrid; gx <= halfGrid && idx < TERRAIN_COUNT; gx++) {
      for (let gz = -halfGrid; gz <= halfGrid && idx < TERRAIN_COUNT; gz++) {
        const wx = snapX + gx * GRID_SPACING;
        const wz = snapZ + gz * GRID_SPACING;

        const dx = wx - centerX;
        const dz = wz - centerZ;
        if (dx * dx + dz * dz > RENDER_DIST * RENDER_DIST) continue;

        // Deterministic jitter centered on grid cell
        const jx = (hashJitter(wx, wz, 1) - 0.5) * GRID_SPACING * 0.6;
        const jz = (hashJitter(wx, wz, 2) - 0.5) * GRID_SPACING * 0.6;

        const sampleX = wx + jx;
        const sampleZ = wz + jz;
        const height = getTerrainHeight(sampleX, sampleZ);
        const visualY = getVisualHeight(sampleX, sampleZ);
        const color = getTerrainColor(sampleX, sampleZ, height);

        positions[idx * 3] = sampleX;
        positions[idx * 3 + 1] = visualY;
        positions[idx * 3 + 2] = sampleZ;

        colors[idx * 3] = color[0];
        colors[idx * 3 + 1] = color[1];
        colors[idx * 3 + 2] = color[2];

        idx++;
      }
    }

    for (let i = idx; i < TERRAIN_COUNT; i++) {
      positions[i * 3 + 1] = -10000;
    }

    // Atmosphere particles - scattered dust/motes in the air
    for (let i = 0; i < ATMO_COUNT; i++) {
      const aidx = TERRAIN_COUNT + i;
      const angle = (i / ATMO_COUNT) * Math.PI * 2 + i * 1.618;
      const dist = Math.sqrt(i / ATMO_COUNT) * RENDER_DIST * 0.85;
      positions[aidx * 3] = centerX + Math.cos(angle) * dist;
      positions[aidx * 3 + 1] = 15 + (i * 7.13) % 180;
      positions[aidx * 3 + 2] = centerZ + Math.sin(angle) * dist;
      // Subtle blue-grey atmospheric color
      colors[aidx * 3] = 0.3 + (i % 5) * 0.04;
      colors[aidx * 3 + 1] = 0.35 + (i % 7) * 0.03;
      colors[aidx * 3 + 2] = 0.45 + (i % 3) * 0.05;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  };

  useEffect(() => {
    const pos = playerPosition.current;
    updateTerrain(pos.x, pos.z);
    lastUpdateX.current = pos.x;
    lastUpdateZ.current = pos.z;
  }, []);

  useFrame((state) => {
    material.uniforms.time.value = state.clock.elapsedTime;

    const pos = playerPosition.current;
    const dx = pos.x - lastUpdateX.current;
    const dz = pos.z - lastUpdateZ.current;

    if (dx * dx + dz * dz > GRID_SPACING * GRID_SPACING) {
      updateTerrain(pos.x, pos.z);
      lastUpdateX.current = pos.x;
      lastUpdateZ.current = pos.z;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

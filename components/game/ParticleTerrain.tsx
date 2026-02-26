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
  const TERRAIN_COUNT = 35000;
  const GRID_SPACING = settings.particleSpacing;
  const RENDER_DIST = settings.renderDistance;

  const pointsRef = useRef<THREE.Points>(null);
  const lastUpdateX = useRef(Infinity);
  const lastUpdateZ = useRef(Infinity);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(TERRAIN_COUNT * 3);
    const colors = new Float32Array(TERRAIN_COUNT * 3);
    const sizes = new Float32Array(TERRAIN_COUNT);

    for (let i = 0; i < TERRAIN_COUNT; i++) {
      sizes[i] = 0.7 + hashJitter(i, i * 3, 99) * 0.6;
      positions[i * 3 + 1] = -10000; // hidden until terrain update
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));

    const pSize = settings.particleSize || 5.0;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        baseSize: { value: pSize },
        fogNear: { value: RENDER_DIST * 0.3 },
        fogFar: { value: RENDER_DIST * 0.95 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        varying vec3 vColor;
        varying float vFog;
        uniform float baseSize;
        uniform float fogNear;
        uniform float fogFar;

        void main() {
          vColor = color;
          vec3 pos = position;

          // Hide particles placed at y=-10000
          if (pos.y < -9000.0) {
            gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
            gl_PointSize = 0.0;
            vFog = 0.0;
            return;
          }

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float dist = -mvPosition.z;

          // Scale point size with distance
          gl_PointSize = baseSize * aSize * (200.0 / max(dist, 1.0));
          gl_PointSize = clamp(gl_PointSize, 1.5, 25.0);
          gl_Position = projectionMatrix * mvPosition;

          // Distance fog factor (1 = fully visible, 0 = faded out)
          vFog = 1.0 - smoothstep(fogNear, fogFar, dist);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vFog;

        void main() {
          // Circular dot with slight edge softening
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Slight edge fade for anti-aliasing
          float alpha = 1.0 - smoothstep(0.35, 0.5, dist);
          alpha *= vFog;

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NormalBlending,
    });

    return { geometry: geo, material: mat };
  }, [TERRAIN_COUNT, GRID_SPACING, RENDER_DIST, settings.particleSize]);

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

    // Hide unused particle slots
    for (let i = idx; i < TERRAIN_COUNT; i++) {
      positions[i * 3 + 1] = -10000;
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

  useFrame(() => {
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

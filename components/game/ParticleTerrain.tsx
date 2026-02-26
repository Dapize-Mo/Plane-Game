'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight, getTerrainColor } from '@/lib/terrain';
import { GameSettings, defaultSettings } from '@/lib/settings';

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
      positions[i * 3 + 1] = -10000; // Start hidden
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

          pos.y += sin(time * 0.6 + aPhase) * 1.2;
          pos.x += sin(time * 0.3 + aPhase * 1.7) * 0.4;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float dist = -mvPosition.z;
          gl_PointSize = baseSize * aSize * (250.0 / max(dist, 1.0));
          gl_PointSize = clamp(gl_PointSize, 1.0, 30.0);
          gl_Position = projectionMatrix * mvPosition;

          vAlpha = smoothstep(${RENDER_DIST.toFixed(1)}, ${(RENDER_DIST * 0.6).toFixed(1)}, dist);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = glow * glow * vAlpha * 0.9;
          gl_FragColor = vec4(vColor * (1.0 + glow * 0.5), alpha);
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

        // Jitter to break grid pattern
        const jx = ((Math.sin(wx * 127.1 + wz * 311.7) * 43758.5453) % 1) * GRID_SPACING * 0.3;
        const jz = ((Math.sin(wx * 269.5 + wz * 183.3) * 43758.5453) % 1) * GRID_SPACING * 0.3;

        const sampleX = wx + jx;
        const sampleZ = wz + jz;
        const height = getTerrainHeight(sampleX, sampleZ);
        const color = getTerrainColor(sampleX, sampleZ, height);

        positions[idx * 3] = sampleX;
        positions[idx * 3 + 1] = height;
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

    // Atmosphere particles
    for (let i = 0; i < ATMO_COUNT; i++) {
      const aidx = TERRAIN_COUNT + i;
      const angle = (i / ATMO_COUNT) * Math.PI * 2 + i * 1.618;
      const dist = (i / ATMO_COUNT) * RENDER_DIST * 0.8;
      positions[aidx * 3] = centerX + Math.cos(angle) * dist;
      positions[aidx * 3 + 1] = 20 + (i * 7.13) % 150;
      positions[aidx * 3 + 2] = centerZ + Math.sin(angle) * dist;
      colors[aidx * 3] = 0.4;
      colors[aidx * 3 + 1] = 0.4;
      colors[aidx * 3 + 2] = 0.5;
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

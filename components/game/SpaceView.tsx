'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameSettings } from '@/lib/settings';
import { getTerrainHeight, getTerrainColor } from '@/lib/terrain';

interface SpaceViewProps {
  settings: GameSettings;
  playerPosition: React.MutableRefObject<{ x: number; y: number; z: number }>;
}

const SPHERE_PARTICLES = 15000;

export default function SpaceView({ settings, playerPosition }: SpaceViewProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(SPHERE_PARTICLES * 3);
    const colors = new Float32Array(SPHERE_PARTICLES * 3);
    const sizes = new Float32Array(SPHERE_PARTICLES);
    const phases = new Float32Array(SPHERE_PARTICLES);

    const worldR = settings.worldRadius;
    const sphereR = worldR * 0.4; // Visual sphere radius

    // Place particles on a sphere, mapping flat world coordinates
    for (let i = 0; i < SPHERE_PARTICLES; i++) {
      // Fibonacci sphere distribution for even coverage
      const phi = Math.acos(1 - (2 * (i + 0.5)) / SPHERE_PARTICLES);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      // Map sphere position to world coordinates
      const worldX = ((Math.cos(theta) * Math.sin(phi) + 1) / 2) * worldR * 2 - worldR;
      const worldZ = ((Math.sin(theta) * Math.sin(phi) + 1) / 2) * worldR * 2 - worldR;

      const height = getTerrainHeight(worldX, worldZ);
      const color = getTerrainColor(worldX, worldZ, height);

      // Map height to sphere radius variation
      const heightNorm = Math.max(0, height) / settings.terrainAmplitude;
      const r = sphereR + heightNorm * sphereR * 0.05;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      colors[i * 3] = color[0];
      colors[i * 3 + 1] = color[1];
      colors[i * 3 + 2] = color[2];

      sizes[i] = 0.8 + Math.random() * 0.5;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseSize: { value: 3.0 },
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
          // Gentle pulsing
          float pulse = sin(time * 0.3 + aPhase) * 0.5 + 0.5;
          pos *= 1.0 + pulse * 0.005;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float dist = -mvPosition.z;
          gl_PointSize = baseSize * aSize * (400.0 / max(dist, 1.0));
          gl_PointSize = clamp(gl_PointSize, 1.0, 20.0);
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = 1.0;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor * (1.0 + glow * 0.5), glow * glow * vAlpha * 0.9);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [settings]);

  useFrame((state) => {
    material.uniforms.time.value = state.clock.elapsedTime;

    if (pointsRef.current) {
      // Slowly rotate the planet
      pointsRef.current.rotation.y += 0.001;
    }

    // Position camera to see the sphere
    const sphereR = settings.worldRadius * 0.4;
    const camDist = sphereR * 3;
    const t = state.clock.elapsedTime * 0.05;
    state.camera.position.set(
      Math.cos(t) * camDist,
      sphereR * 0.5,
      Math.sin(t) * camDist
    );
    state.camera.lookAt(0, 0, 0);
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

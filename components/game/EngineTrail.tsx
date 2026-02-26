'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TRAIL_LENGTH = 80;

interface EngineTrailProps {
  playerPosition: React.MutableRefObject<{ x: number; y: number; z: number }>;
  flightData: React.MutableRefObject<{
    speed: number;
    throttle: number;
    heading: number;
    pitch: number;
    roll: number;
    isGrounded: boolean;
  }>;
}

export default function EngineTrail({ playerPosition, flightData }: EngineTrailProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const trailIdx = useRef(0);
  const frameCount = useRef(0);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(TRAIL_LENGTH * 3);
    const colors = new Float32Array(TRAIL_LENGTH * 3);
    const sizes = new Float32Array(TRAIL_LENGTH);
    const ages = new Float32Array(TRAIL_LENGTH);

    // Start all particles hidden
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      positions[i * 3 + 1] = -10000;
      sizes[i] = 0;
      ages[i] = 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geo.setAttribute('aAge', new THREE.Float32BufferAttribute(ages, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAge;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;

        void main() {
          vColor = color;
          vec3 pos = position;

          if (pos.y < -9000.0 || aAge > 0.99) {
            gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
            gl_PointSize = 0.0;
            vAlpha = 0.0;
            return;
          }

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float dist = -mvPosition.z;
          gl_PointSize = aSize * (200.0 / max(dist, 1.0));
          gl_PointSize = clamp(gl_PointSize, 0.5, 20.0);
          gl_Position = projectionMatrix * mvPosition;

          // Fade out as age increases
          vAlpha = (1.0 - aAge) * 0.8;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor * (1.0 + glow), glow * vAlpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    material.uniforms.time.value = state.clock.elapsedTime;

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const ageAttr = geometry.getAttribute('aAge') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;
    const sizes = sizeAttr.array as Float32Array;
    const ages = ageAttr.array as Float32Array;

    // Age all existing particles
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      ages[i] = Math.min(1, ages[i] + delta * 0.8);
    }

    // Spawn new particle every few frames if throttle > 0
    frameCount.current++;
    const fd = flightData.current;

    if (fd.throttle > 0.05 && frameCount.current % 2 === 0) {
      const i = trailIdx.current;

      // Calculate exhaust position (behind the plane)
      const euler = new THREE.Euler(fd.pitch, fd.heading, fd.roll, 'YXZ');
      const quat = new THREE.Quaternion().setFromEuler(euler);
      const offset = new THREE.Vector3(0, 0, 3.5); // Behind plane
      offset.applyQuaternion(quat);

      const pos = playerPosition.current;
      positions[i * 3] = pos.x + offset.x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = pos.y + offset.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = pos.z + offset.z + (Math.random() - 0.5) * 0.5;

      // Orange-yellow exhaust color, intensity based on throttle
      const intensity = fd.throttle;
      colors[i * 3] = 1.0 * intensity;
      colors[i * 3 + 1] = 0.5 * intensity;
      colors[i * 3 + 2] = 0.1 * intensity;

      sizes[i] = 1.5 + fd.throttle * 2;
      ages[i] = 0;

      trailIdx.current = (trailIdx.current + 1) % TRAIL_LENGTH;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    ageAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

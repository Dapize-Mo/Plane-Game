'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createNoise2D } from 'simplex-noise';

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

  void main() {
    vHeight = aHeight / uMaxHeight;
    vRandom = aRandom;

    vec3 pos = position;

    // Subtle vertical breathing based on height and time
    float breathe = sin(uTime * 0.4 + pos.x * 0.02 + pos.z * 0.02) * 0.5 + 0.5;
    pos.y += breathe * vHeight * 2.0;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

    // Size: taller particles are slightly larger, plus subtle pulse
    float pulse = 1.0 + sin(uTime * 0.8 + aRandom * 6.28) * 0.15 * vHeight;
    float heightSize = 1.0 + vHeight * 1.5;
    gl_PointSize = ${CONFIG.baseSize.toFixed(1)} * heightSize * pulse * (300.0 / -mvPos.z);

    gl_Position = projectionMatrix * mvPos;

    // Fog factor
    float fogDist = length(mvPos.xyz);
    vFog = smoothstep(100.0, 450.0, fogDist);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;
  varying float vFog;
  varying float vRandom;
  uniform float uTime;
  uniform vec3 uBgColor;

  void main() {
    // Soft circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.15, 0.5, dist);

    // Color gradient: deep blue/purple at low, white/cyan glow at peaks
    vec3 colorLow = vec3(0.02, 0.02, 0.06);
    vec3 colorMid = vec3(0.08, 0.12, 0.25);
    vec3 colorHigh = vec3(0.7, 0.85, 1.0);
    vec3 colorPeak = vec3(1.0, 1.0, 1.0);

    vec3 color;
    float h = vHeight;
    if (h < 0.3) {
      color = mix(colorLow, colorMid, h / 0.3);
    } else if (h < 0.7) {
      color = mix(colorMid, colorHigh, (h - 0.3) / 0.4);
    } else {
      color = mix(colorHigh, colorPeak, (h - 0.7) / 0.3);
    }

    // Subtle shimmer on higher particles
    float shimmer = sin(uTime * 1.5 + vRandom * 40.0) * 0.5 + 0.5;
    color += shimmer * 0.08 * h;

    // Inner glow — brighter at center
    float glow = 1.0 - smoothstep(0.0, 0.4, dist);
    color += glow * 0.15 * h;

    // Apply fog
    color = mix(color, uBgColor, vFog);
    alpha *= (1.0 - vFog * 0.9);
    alpha *= 0.7 + 0.3 * h;

    gl_FragColor = vec4(color, alpha);
  }
`;

export default function MonochromeTerrain() {
  const mountRef = useRef<HTMLDivElement>(null);

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
    const bgColor = new THREE.Color(0x010108);
    scene.background = bgColor;

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
      uBgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
    };

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
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
}

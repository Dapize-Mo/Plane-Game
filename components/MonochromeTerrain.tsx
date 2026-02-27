'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createNoise2D } from 'simplex-noise';

const CONFIG = {
  gridSize: 1000,
  spacing: 0.7,
  heightScale: 90.0,
  noiseFreq: 0.018,
  particleSize: 0.08,
  seaLevel: 0.08,
  colorLow: new THREE.Color(0x050505),
  colorHigh: new THREE.Color(0xffffff),
};

export default function MonochromeTerrain() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let raf = 0;

    // Scene
    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(0x010102);
    scene.background = bgColor;
    scene.fog = new THREE.Fog(bgColor, 150, 400);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      1,
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
    controls.autoRotateSpeed = 0.15;
    controls.maxDistance = 350;

    // Terrain
    const simplex = createNoise2D();
    const count = CONFIG.gridSize * CONFIG.gridSize;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const totalSize = CONFIG.gridSize * CONFIG.spacing;
    const offset = totalSize / 2;

    let k = 0;
    for (let i = 0; i < CONFIG.gridSize; i++) {
      for (let j = 0; j < CONFIG.gridSize; j++) {
        const x = i * CONFIG.spacing - offset;
        const z = j * CONFIG.spacing - offset;

        const noiseScale = 350 / CONFIG.gridSize;
        const nx = i * CONFIG.noiseFreq * noiseScale;
        const nz = j * CONFIG.noiseFreq * noiseScale;

        let noiseVal = (simplex(nx, nz) + 1) / 2;
        noiseVal += simplex(nx * 2, nz * 2) * 0.5;
        noiseVal += simplex(nx * 4, nz * 4) * 0.25;
        noiseVal += simplex(nx * 8, nz * 8) * 0.125;

        const yFinal = noiseVal / 1.875;

        const isWater = yFinal < CONFIG.seaLevel;
        const displayY = isWater
          ? CONFIG.seaLevel * CONFIG.heightScale
          : yFinal * CONFIG.heightScale;

        positions[k * 3] = x;
        positions[k * 3 + 1] = displayY;
        positions[k * 3 + 2] = z;

        const t = Math.pow(yFinal, 1.2);
        const pointColor = CONFIG.colorLow.clone().lerp(CONFIG.colorHigh, t);

        colors[k * 3] = pointColor.r;
        colors[k * 3 + 1] = pointColor.g;
        colors[k * 3 + 2] = pointColor.b;
        k++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: CONFIG.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      fog: true,
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
    const animate = () => {
      raf = requestAnimationFrame(animate);
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

  return <div ref={mountRef} className="absolute inset-0" />;
}

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
  particleSize: 0.08,
  seaLevel: 0.08,
  colorLow: new THREE.Color(0x050505),
  colorHigh: new THREE.Color(0xffffff),
  ballRadius: 3.0,
  ballSpeed: 0.8,
  ballFriction: 0.92,
  gravitySlope: 0.3,
};

interface MonochromeTerrainProps {
  viewMode: 'orbit' | 'ball';
  onViewModeChange?: (mode: 'orbit' | 'ball') => void;
}

export default function MonochromeTerrain({ viewMode, onViewModeChange }: MonochromeTerrainProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewModeRef = useRef(viewMode);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let raf = 0;

    // Noise setup — shared for terrain generation and height sampling
    const simplex = createNoise2D();
    const totalSize = CONFIG.gridSize * CONFIG.spacing;
    const offset = totalSize / 2;
    const noiseScale = 350 / CONFIG.gridSize;

    const mountainCenterX = 0.35;
    const mountainWidth = 0.06;
    const trenchCenterX = 0.75;
    const trenchWidth = 0.04;

    // Height function: sample terrain height at any world (x, z) coordinate
    function getHeight(worldX: number, worldZ: number): number {
      const i = (worldX + offset) / CONFIG.spacing;
      const j = (worldZ + offset) / CONFIG.spacing;

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
      if (displayY < seaFloor) {
        displayY = seaFloor * 0.3;
      }

      return displayY;
    }

    // Scene
    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(0x010102);
    scene.background = bgColor;
    scene.fog = new THREE.Fog(bgColor, 150, 400);

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

    // Controls (for orbit mode)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.15;
    controls.maxDistance = 350;

    // Generate terrain particles
    const count = CONFIG.gridSize * CONFIG.gridSize;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    let k = 0;
    for (let i = 0; i < CONFIG.gridSize; i++) {
      for (let j = 0; j < CONFIG.gridSize; j++) {
        const x = i * CONFIG.spacing - offset;
        const z = j * CONFIG.spacing - offset;
        const displayY = getHeight(x, z);

        positions[k * 3] = x;
        positions[k * 3 + 1] = displayY;
        positions[k * 3 + 2] = z;

        const maxH = CONFIG.hillHeight + CONFIG.mountainHeight;
        const t = Math.pow(Math.max(0, displayY) / maxH, 1.2);
        const pointColor = CONFIG.colorLow.clone().lerp(CONFIG.colorHigh, t);

        colors[k * 3] = pointColor.r;
        colors[k * 3 + 1] = pointColor.g;
        colors[k * 3 + 2] = pointColor.b;
        k++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
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

    // Ball
    const ballGeo = new THREE.SphereGeometry(CONFIG.ballRadius, 24, 24);
    const ballMat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      wireframe: true,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);

    // Start ball near center — embed slightly so it sits within the particle cloud
    const startY = getHeight(0, 0);
    ball.position.set(0, startY, 0);
    scene.add(ball);

    // Add a glow ring around the ball for visibility
    const ringGeo = new THREE.RingGeometry(CONFIG.ballRadius * 1.3, CONFIG.ballRadius * 1.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ball.add(ring);

    // Ball physics state
    const ballVelocity = new THREE.Vector3(0, 0, 0);
    const keys: Record<string, boolean> = {};

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      // Toggle view mode with V key
      if (e.key.toLowerCase() === 'v' && onViewModeChange) {
        onViewModeChange(viewModeRef.current === 'orbit' ? 'ball' : 'orbit');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Camera follow state for ball mode
    const cameraOffset = new THREE.Vector3(0, 15, 30);
    const cameraLookTarget = new THREE.Vector3();

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

      // Ball input
      const inputDir = new THREE.Vector3(0, 0, 0);
      if (keys['w'] || keys['arrowup']) inputDir.z -= 1;
      if (keys['s'] || keys['arrowdown']) inputDir.z += 1;
      if (keys['a'] || keys['arrowleft']) inputDir.x -= 1;
      if (keys['d'] || keys['arrowright']) inputDir.x += 1;

      if (inputDir.length() > 0) {
        inputDir.normalize();

        // In ball mode, move relative to camera direction
        if (viewModeRef.current === 'ball') {
          const camForward = new THREE.Vector3();
          camera.getWorldDirection(camForward);
          camForward.y = 0;
          camForward.normalize();
          const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();
          const worldDir = new THREE.Vector3()
            .addScaledVector(camRight, inputDir.x)
            .addScaledVector(camForward, -inputDir.z);
          worldDir.normalize();
          ballVelocity.x += worldDir.x * CONFIG.ballSpeed;
          ballVelocity.z += worldDir.z * CONFIG.ballSpeed;
        } else {
          ballVelocity.x += inputDir.x * CONFIG.ballSpeed;
          ballVelocity.z += inputDir.z * CONFIG.ballSpeed;
        }
      }

      // Terrain slope gravity
      const sampleDist = 1.0;
      const hCenter = getHeight(ball.position.x, ball.position.z);
      const hLeft = getHeight(ball.position.x - sampleDist, ball.position.z);
      const hRight = getHeight(ball.position.x + sampleDist, ball.position.z);
      const hFront = getHeight(ball.position.x, ball.position.z - sampleDist);
      const hBack = getHeight(ball.position.x, ball.position.z + sampleDist);

      const slopeX = (hLeft - hRight) / (2 * sampleDist);
      const slopeZ = (hFront - hBack) / (2 * sampleDist);

      ballVelocity.x += slopeX * CONFIG.gravitySlope;
      ballVelocity.z += slopeZ * CONFIG.gravitySlope;

      // Friction
      ballVelocity.x *= CONFIG.ballFriction;
      ballVelocity.z *= CONFIG.ballFriction;

      // Speed cap
      const speed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.z * ballVelocity.z);
      const maxSpeed = 5.0;
      if (speed > maxSpeed) {
        ballVelocity.x = (ballVelocity.x / speed) * maxSpeed;
        ballVelocity.z = (ballVelocity.z / speed) * maxSpeed;
      }

      // Move ball
      ball.position.x += ballVelocity.x;
      ball.position.z += ballVelocity.z;

      // Clamp to terrain bounds
      const halfSize = totalSize / 2 - 5;
      ball.position.x = Math.max(-halfSize, Math.min(halfSize, ball.position.x));
      ball.position.z = Math.max(-halfSize, Math.min(halfSize, ball.position.z));

      // Snap to terrain surface — sit within particle cloud, not on top
      const terrainY = getHeight(ball.position.x, ball.position.z);
      ball.position.y = terrainY;

      // Roll rotation
      if (speed > 0.01) {
        const rollAxis = new THREE.Vector3(-ballVelocity.z, 0, ballVelocity.x).normalize();
        const rollAngle = speed / CONFIG.ballRadius;
        ball.rotateOnWorldAxis(rollAxis, rollAngle);
      }

      // Camera modes
      if (viewModeRef.current === 'ball') {
        controls.enabled = false;
        controls.autoRotate = false;

        cameraLookTarget.lerp(ball.position, 0.1);
        const desiredCamPos = ball.position.clone().add(cameraOffset);
        desiredCamPos.y = Math.max(desiredCamPos.y, terrainY + 8);
        camera.position.lerp(desiredCamPos, 0.05);
        camera.lookAt(cameraLookTarget);
      } else {
        controls.enabled = true;
        controls.autoRotate = true;
        controls.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      ballGeo.dispose();
      ballMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
}

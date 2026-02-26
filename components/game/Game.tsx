'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

// ── Seeded PRNG for consistent terrain across reloads ────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── World config (matches your HTML reference) ───────────────────
const GRID_SIZE = 500;
const SPACING = 0.1;
const WORLD_HALF = (GRID_SIZE * SPACING) / 2; // 25
const HEIGHT_SCALE = 9.0;
const SEA_LEVEL = 0.08;
const NOISE_FREQ = 0.02;
const NOISE_SCALE = 350 / GRID_SIZE;
const NOISE_FACTOR = (NOISE_FREQ * NOISE_SCALE) / SPACING;
const PARTICLE_SIZE = 0.012;

// ── Runways ──────────────────────────────────────────────────────
const RUNWAYS = [
  { cx: -8, cz: 0, halfLength: 4, halfWidth: 0.6 },
  { cx: 10, cz: 2, halfLength: 4, halfWidth: 0.6 },
];

// ── Noise ────────────────────────────────────────────────────────
const noise2D = createNoise2D(mulberry32(42));

function fbm(nx: number, nz: number): number {
  let v = (noise2D(nx, nz) + 1) / 2;
  v += noise2D(nx * 2, nz * 2) * 0.5;
  v += noise2D(nx * 4, nz * 4) * 0.25;
  v += noise2D(nx * 8, nz * 8) * 0.125;
  return v / 1.875;
}

function getRawHeight(x: number, z: number): number {
  const nx = (x + WORLD_HALF) * NOISE_FACTOR;
  const nz = (z + WORLD_HALF) * NOISE_FACTOR;
  const h = fbm(nx, nz);
  const dist = Math.sqrt(x * x + z * z);
  const mask = Math.pow(Math.max(0, 1 - dist / WORLD_HALF), 2);
  return h * mask;
}

function isOnRunway(x: number, z: number): boolean {
  return RUNWAYS.some(
    (r) => Math.abs(x - r.cx) <= r.halfWidth && Math.abs(z - r.cz) <= r.halfLength
  );
}

/** Get display height at world position (with runway flattening + sea floor) */
function getHeight(x: number, z: number): number {
  let h = getRawHeight(x, z);

  // Smooth flatten around runways
  for (const r of RUNWAYS) {
    const dx = Math.abs(x - r.cx);
    const dz = Math.abs(z - r.cz);
    const blendW = r.halfWidth * 3;
    const blendL = r.halfLength * 1.8;
    if (dx < blendW && dz < blendL) {
      const tx = Math.max(0, (dx - r.halfWidth) / (blendW - r.halfWidth));
      const tz = Math.max(0, (dz - r.halfLength) / (blendL - r.halfLength));
      const t = Math.max(tx, tz);
      const s = t * t * (3 - 2 * t); // smoothstep
      const rh = getRawHeight(r.cx, r.cz);
      h = h * s + rh * (1 - s);
    }
  }

  return h < SEA_LEVEL ? SEA_LEVEL * HEIGHT_SCALE : h * HEIGHT_SCALE;
}

// ── Component ────────────────────────────────────────────────────
export default function Game() {
  const mountRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const thrRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let raf = 0;

    // ── Scene ──────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010102);

    const camera = new THREE.PerspectiveCamera(
      55,
      el.clientWidth / el.clientHeight,
      0.05,
      200
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // ── Terrain particles ──────────────────────────────────────
    const count = GRID_SIZE * GRID_SIZE;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorLow = new THREE.Color(0x050505);
    const colorHigh = new THREE.Color(0xffffff);

    let idx = 0;
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = i * SPACING - WORLD_HALF;
        const z = j * SPACING - WORLD_HALF;
        const y = getHeight(x, z);

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        if (isOnRunway(x, z)) {
          // Runway: slightly brighter uniform grey
          colors[idx * 3] = 0.3;
          colors[idx * 3 + 1] = 0.3;
          colors[idx * 3 + 2] = 0.32;
        } else {
          const raw = getRawHeight(x, z);
          const t = Math.pow(raw, 1.2);
          const c = colorLow.clone().lerp(colorHigh, t);
          colors[idx * 3] = c.r;
          colors[idx * 3 + 1] = c.g;
          colors[idx * 3 + 2] = c.b;
        }
        idx++;
      }
    }

    const terrainGeo = new THREE.BufferGeometry();
    terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    scene.add(new THREE.Points(terrainGeo, terrainMat));

    // ── Plane model ────────────────────────────────────────────
    const planeGroup = new THREE.Group();
    const planeMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });

    // Fuselage
    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.09, 0.9, 8),
      planeMat
    );
    fuselage.rotation.x = Math.PI / 2;
    planeGroup.add(fuselage);

    // Nose
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.3, 6),
      planeMat
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -0.6;
    planeGroup.add(nose);

    // Wings
    const wings = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.02, 0.25),
      planeMat
    );
    wings.position.y = -0.02;
    planeGroup.add(wings);

    // Horizontal stabilizer
    const hStab = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.015, 0.15),
      planeMat
    );
    hStab.position.set(0, 0.02, 0.5);
    planeGroup.add(hStab);

    // Vertical stabilizer
    const vStab = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.3, 0.15),
      planeMat
    );
    vStab.position.set(0, 0.16, 0.45);
    planeGroup.add(vStab);

    scene.add(planeGroup);

    // ── Flight state ───────────────────────────────────────────
    const rwy = RUNWAYS[0];
    const spawnY = getHeight(rwy.cx, rwy.cz - rwy.halfLength + 1) + 0.12;

    const flight = {
      x: rwy.cx,
      y: spawnY,
      z: rwy.cz - rwy.halfLength + 1,
      speed: 0,
      throttle: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
      grounded: true,
    };

    // ── Input ──────────────────────────────────────────────────
    const keys: Record<string, boolean> = {};

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(
          e.key.toLowerCase()
        )
      ) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── Camera ─────────────────────────────────────────────────
    const camPos = new THREE.Vector3(flight.x, flight.y + 1.5, flight.z + 5);
    const camLook = new THREE.Vector3(flight.x, flight.y, flight.z);
    let frameCount = 0;

    // ── Resize ─────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // ── Game loop ──────────────────────────────────────────────
    const clock = new THREE.Clock();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      frameCount++;

      // -- Input processing --
      if (keys['w']) flight.throttle = Math.min(1, flight.throttle + dt * 0.5);
      if (keys['s']) flight.throttle = Math.max(0, flight.throttle - dt * 0.8);
      if (keys['arrowup']) flight.pitch -= 1.5 * dt;
      if (keys['arrowdown']) flight.pitch += 1.5 * dt;
      if (keys['arrowleft']) flight.roll -= 2.0 * dt;
      if (keys['arrowright']) flight.roll += 2.0 * dt;
      if (keys['a']) flight.yaw += 1.0 * dt;
      if (keys['d']) flight.yaw -= 1.0 * dt;
      if (keys[' '] && flight.grounded) {
        flight.speed = Math.max(0, flight.speed - 8 * dt);
      }

      // Auto-level when no input
      if (!keys['arrowleft'] && !keys['arrowright']) flight.roll *= 0.93;
      if (!keys['arrowup'] && !keys['arrowdown']) flight.pitch *= 0.97;

      // Bank turns (roll causes yaw)
      flight.yaw += flight.roll * 0.6 * dt;

      // -- Speed --
      const thrust = flight.throttle * 15;
      const drag = flight.speed * flight.speed * 0.015;
      flight.speed = Math.max(
        0,
        Math.min(20, flight.speed + (thrust - drag) * dt)
      );

      // -- Movement --
      const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(flight.pitch, flight.yaw, flight.roll, 'YXZ')
      );
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);

      flight.x += forward.x * flight.speed * dt;
      flight.z += forward.z * flight.speed * dt;

      // -- Vertical physics --
      const groundH = getHeight(flight.x, flight.z) + 0.12;
      const liftoffSpeed = 5;

      if (flight.speed > liftoffSpeed) {
        // Airborne
        flight.y += forward.y * flight.speed * dt;

        // Gravity
        flight.y -= 2.5 * dt;

        // Lift (counteracts gravity when fast enough)
        const liftFactor = Math.min(1, (flight.speed - liftoffSpeed) / 6);
        flight.y += 2.5 * liftFactor * dt;

        if (flight.y < groundH) {
          flight.y = groundH;
          flight.grounded = true;
          // Hard landing = crash
          if (forward.y < -0.3) {
            flight.speed = 0;
            flight.throttle = 0;
          }
        } else {
          flight.grounded = false;
        }
      } else {
        // On ground
        flight.y = groundH;
        flight.grounded = true;
        flight.pitch *= 0.9;
        flight.roll *= 0.9;
      }

      // Clamp pitch
      flight.pitch = Math.max(-0.8, Math.min(0.6, flight.pitch));

      // -- Update plane mesh --
      planeGroup.position.set(flight.x, flight.y, flight.z);
      planeGroup.rotation.set(
        flight.pitch,
        flight.yaw,
        flight.roll,
        'YXZ'
      );

      // -- Chase camera --
      const camOffset = new THREE.Vector3(0, 1.5, 5).applyQuaternion(quat);
      const targetCamPos = new THREE.Vector3(
        flight.x + camOffset.x,
        flight.y + camOffset.y,
        flight.z + camOffset.z
      );

      const lookAhead = new THREE.Vector3(0, 0, -5).applyQuaternion(quat);
      const targetLook = new THREE.Vector3(
        flight.x + lookAhead.x,
        flight.y + lookAhead.y + 0.3,
        flight.z + lookAhead.z
      );

      // Snap camera for first few frames, then smooth follow
      if (frameCount < 5) {
        camPos.copy(targetCamPos);
        camLook.copy(targetLook);
      } else {
        camPos.lerp(targetCamPos, 0.06);
        camLook.lerp(targetLook, 0.06);
      }

      camera.position.copy(camPos);
      camera.lookAt(camLook);

      // -- HUD updates --
      if (speedRef.current)
        speedRef.current.textContent = Math.round(flight.speed * 10).toString();
      if (altRef.current)
        altRef.current.textContent = Math.round(
          (flight.y - SEA_LEVEL * HEIGHT_SCALE) * 20
        ).toString();
      if (thrRef.current)
        thrRef.current.style.width = `${flight.throttle * 100}%`;
      if (statusRef.current)
        statusRef.current.textContent = flight.grounded ? 'GND' : 'AIR';

      renderer.render(scene, camera);
    };

    loop();

    // ── Cleanup ────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#010102]">
      <div ref={mountRef} className="w-full h-full" />

      {/* HUD overlay */}
      <div className="absolute inset-x-0 top-0 p-5 flex justify-between items-start pointer-events-none">
        <div className="font-mono text-white/40 text-xs tracking-wider">
          <span className="text-[10px] uppercase opacity-50">SPD</span>
          <br />
          <span ref={speedRef} className="text-white/60 text-xl">
            0
          </span>
        </div>
        <div className="text-white/20 text-[10px] tracking-[0.4em] uppercase pt-1">
          PARTICLE FLIGHT
        </div>
        <div className="font-mono text-white/40 text-xs tracking-wider text-right">
          <span className="text-[10px] uppercase opacity-50">ALT</span>
          <br />
          <span ref={altRef} className="text-white/60 text-xl">
            0
          </span>
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-5 left-5 pointer-events-none">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-white/20 text-[10px] tracking-wider uppercase mb-1">
              THR
            </div>
            <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                ref={thrRef}
                className="h-full bg-white/40 rounded-full"
                style={{ width: '0%' }}
              />
            </div>
          </div>
          <span
            ref={statusRef}
            className="text-white/30 text-[10px] tracking-wider font-mono"
          >
            GND
          </span>
        </div>
      </div>

      <div className="absolute bottom-5 right-5 text-white/15 text-[9px] tracking-wider uppercase leading-relaxed text-right pointer-events-none">
        W/S Throttle &middot; &uarr;&darr; Pitch &middot; &larr;&rarr; Roll
        <br />
        A/D Yaw &middot; Space Brake &middot; ESC Exit
      </div>
    </div>
  );
}

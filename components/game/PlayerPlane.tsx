'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  FlightState,
  InputState,
  createInitialState,
  updateFlightPhysics,
} from '@/lib/flight-physics';
import { getPlane, PlaneConfig } from '@/lib/planes';
import { airports, getSpawnPosition } from '@/lib/airports';
import { GameSettings, defaultSettings } from '@/lib/settings';

interface PlayerPlaneProps {
  playerPosition: React.MutableRefObject<{ x: number; y: number; z: number }>;
  flightData: React.MutableRefObject<{
    speed: number;
    throttle: number;
    altitude: number;
    agl: number;
    heading: number;
    pitch: number;
    roll: number;
    isGrounded: boolean;
    fuel: number;
    fuelEmpty: boolean;
  }>;
  settings?: GameSettings;
  spaceView?: boolean;
  planeId?: string;
}

export default function PlayerPlane({
  playerPosition,
  flightData,
  settings = defaultSettings,
  spaceView = false,
  planeId = 'cessna',
}: PlayerPlaneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planeConfig = useRef<PlaneConfig>(getPlane(planeId));
  const { camera } = useThree();

  const spawn = getSpawnPosition(airports[0]);
  const state = useRef<FlightState>(
    createInitialState(spawn.x, spawn.y, spawn.z, spawn.heading, settings.fuelCapacity)
  );

  const input = useRef<InputState>({
    throttleUp: false,
    throttleDown: false,
    pitchUp: false,
    pitchDown: false,
    rollLeft: false,
    rollRight: false,
    yawLeft: false,
    yawRight: false,
    brake: false,
    analogPitch: 0,
    analogRoll: 0,
    analogYaw: 0,
    analogThrottle: 0,
  });

  // Camera starts at correct position behind plane
  const initQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, spawn.heading, 0, 'YXZ')
  );
  const initCamOffset = new THREE.Vector3(0, 8, 25);
  initCamOffset.applyQuaternion(initQuat);

  const cameraPos = useRef(
    new THREE.Vector3(
      spawn.x + initCamOffset.x,
      spawn.y + initCamOffset.y,
      spawn.z + initCamOffset.z
    )
  );
  const cameraLookAt = useRef(new THREE.Vector3(spawn.x, spawn.y, spawn.z));
  const frameCount = useRef(0);

  const handleKey = useCallback((e: KeyboardEvent, pressed: boolean) => {
    switch (e.key.toLowerCase()) {
      case 'w':
        input.current.throttleUp = pressed;
        break;
      case 's':
        input.current.throttleDown = pressed;
        break;
      case 'arrowup':
        input.current.pitchUp = pressed;
        e.preventDefault();
        break;
      case 'arrowdown':
        input.current.pitchDown = pressed;
        e.preventDefault();
        break;
      case 'arrowleft':
        input.current.rollLeft = pressed;
        e.preventDefault();
        break;
      case 'arrowright':
        input.current.rollRight = pressed;
        e.preventDefault();
        break;
      case 'a':
        input.current.yawLeft = pressed;
        break;
      case 'd':
        input.current.yawRight = pressed;
        break;
      case ' ':
        input.current.brake = pressed;
        e.preventDefault();
        break;
    }
  }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => handleKey(e, true);
    const onUp = (e: KeyboardEvent) => handleKey(e, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [handleKey]);

  const pollGamepad = useCallback(() => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (!gp) continue;

      const deadzone = 0.15;
      const applyDeadzone = (v: number) => (Math.abs(v) < deadzone ? 0 : v);

      if (gp.axes.length >= 2) {
        input.current.analogRoll = applyDeadzone(gp.axes[0]);
        input.current.analogPitch = applyDeadzone(gp.axes[1]);
      }
      if (gp.axes.length >= 4) {
        input.current.analogYaw = applyDeadzone(gp.axes[2]);
      }

      if (gp.buttons.length > 7) {
        const rt = gp.buttons[7]?.value || 0;
        const lt = gp.buttons[6]?.value || 0;
        input.current.analogThrottle = rt - lt;
        input.current.brake = lt > 0.5;
      }

      if (gp.buttons.length > 1) {
        if (gp.buttons[0]?.pressed) input.current.throttleUp = true;
        if (gp.buttons[1]?.pressed) input.current.brake = true;
      }

      if (gp.buttons.length > 15) {
        input.current.pitchUp = gp.buttons[12]?.pressed || false;
        input.current.pitchDown = gp.buttons[13]?.pressed || false;
        input.current.yawLeft = gp.buttons[14]?.pressed || false;
        input.current.yawRight = gp.buttons[15]?.pressed || false;
      }

      break;
    }
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    frameCount.current++;

    pollGamepad();

    state.current = updateFlightPhysics(
      state.current,
      input.current,
      planeConfig.current,
      delta,
      settings
    );

    const s = state.current;

    const euler = new THREE.Euler(s.pitch, s.yaw, s.roll, 'YXZ');
    groupRef.current.position.set(s.posX, s.posY, s.posZ);
    groupRef.current.setRotationFromEuler(euler);

    playerPosition.current.x = s.posX;
    playerPosition.current.y = s.posY;
    playerPosition.current.z = s.posZ;

    flightData.current.speed = s.speed;
    flightData.current.throttle = s.throttle;
    flightData.current.altitude = s.altitude;
    flightData.current.agl = s.agl;
    flightData.current.heading = s.yaw;
    flightData.current.pitch = s.pitch;
    flightData.current.roll = s.roll;
    flightData.current.isGrounded = s.isGrounded;
    flightData.current.fuel = s.fuel;
    flightData.current.fuelEmpty = s.fuelEmpty;

    // Update camera far plane dynamically for space view toggle
    const perspCam = camera as THREE.PerspectiveCamera;
    const targetFar = spaceView ? 20000 : (settings.renderDistance || 500) + 200;
    if (Math.abs(perspCam.far - targetFar) > 1) {
      perspCam.far = targetFar;
      perspCam.updateProjectionMatrix();
    }

    if (!spaceView) {
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      const camDist = settings.cameraDistance || 22;
      const camHeight = settings.cameraHeight || 8;
      const camSmooth = settings.cameraSmoothness || 0.04;

      const cameraOffset = new THREE.Vector3(0, camHeight, camDist);
      cameraOffset.applyQuaternion(quaternion);
      cameraOffset.add(new THREE.Vector3(s.posX, s.posY, s.posZ));

      const lookTarget = new THREE.Vector3(s.posX, s.posY + 1, s.posZ);
      const lookAhead = new THREE.Vector3(0, 0, -20);
      lookAhead.applyQuaternion(quaternion);
      lookTarget.add(lookAhead);

      // SNAP camera on first few frames so player immediately sees the plane
      if (frameCount.current < 5) {
        cameraPos.current.copy(cameraOffset);
        cameraLookAt.current.copy(lookTarget);
      } else {
        cameraPos.current.lerp(cameraOffset, camSmooth);
        cameraLookAt.current.lerp(lookTarget, camSmooth);
      }

      camera.position.copy(cameraPos.current);
      camera.lookAt(cameraLookAt.current);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage - white so it stands out against dark bg */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.55, 5, 8]} />
        <meshBasicMaterial color="#cccccc" />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 0, -3]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.35, 1.2, 8]} />
        <meshBasicMaterial color="#dddddd" />
      </mesh>
      {/* Main wings */}
      <mesh position={[0, -0.1, 0.2]}>
        <boxGeometry args={[10, 0.12, 1.5]} />
        <meshBasicMaterial color="#bbbbbb" />
      </mesh>
      {/* Horizontal stabilizer */}
      <mesh position={[0, 0.15, 2.5]}>
        <boxGeometry args={[4, 0.08, 0.8]} />
        <meshBasicMaterial color="#bbbbbb" />
      </mesh>
      {/* Vertical stabilizer */}
      <mesh position={[0, 0.8, 2.3]}>
        <boxGeometry args={[0.08, 1.5, 0.9]} />
        <meshBasicMaterial color="#bbbbbb" />
      </mesh>
      {/* Wing tip lights */}
      <pointLight position={[-5, -0.1, 0.2]} color="#ff0000" intensity={1} distance={6} />
      <pointLight position={[5, -0.1, 0.2]} color="#00ff00" intensity={1} distance={6} />
      {/* Nose light */}
      <pointLight position={[0, 0, -3.5]} color="#ffffff" intensity={1} distance={10} />
    </group>
  );
}

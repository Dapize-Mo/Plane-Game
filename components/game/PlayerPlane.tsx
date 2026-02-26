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

  const cameraPos = useRef(new THREE.Vector3(spawn.x, spawn.y + 15, spawn.z + 30));
  const cameraLookAt = useRef(new THREE.Vector3(spawn.x, spawn.y, spawn.z));

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
    const targetFar = spaceView ? 20000 : (settings.fogDistance || 600) + 200;
    if (Math.abs(perspCam.far - targetFar) > 1) {
      perspCam.far = targetFar;
      perspCam.updateProjectionMatrix();
    }

    if (!spaceView) {
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      const camDist = settings.cameraDistance || 22;
      const camHeight = settings.cameraHeight || 6;
      const camSmooth = settings.cameraSmoothness || 0.04;

      const cameraOffset = new THREE.Vector3(0, camHeight, camDist);
      cameraOffset.applyQuaternion(quaternion);
      cameraOffset.add(new THREE.Vector3(s.posX, s.posY, s.posZ));

      const lookTarget = new THREE.Vector3(s.posX, s.posY, s.posZ);
      const lookAhead = new THREE.Vector3(0, 0, -30);
      lookAhead.applyQuaternion(quaternion);
      lookTarget.add(lookAhead);

      cameraPos.current.lerp(cameraOffset, camSmooth);
      cameraLookAt.current.lerp(lookTarget, camSmooth);

      camera.position.copy(cameraPos.current);
      camera.lookAt(cameraLookAt.current);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 4.5, 6]} />
        <meshStandardMaterial
          color={planeConfig.current.color}
          emissive="#444444"
          emissiveIntensity={0.3}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0, -2.8]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.3, 1.0, 6]} />
        <meshStandardMaterial color="#cccccc" emissive="#333333" emissiveIntensity={0.2} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[9, 0.08, 1.3]} />
        <meshStandardMaterial color="#d0d0d0" emissive="#333333" emissiveIntensity={0.2} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.1, 2.2]}>
        <boxGeometry args={[3.5, 0.06, 0.7]} />
        <meshStandardMaterial color="#c8c8c8" emissive="#333333" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0.7, 2.0]}>
        <boxGeometry args={[0.06, 1.3, 0.8]} />
        <meshStandardMaterial color="#c8c8c8" emissive="#333333" emissiveIntensity={0.2} />
      </mesh>
      <pointLight position={[0, 0, 2.5]} color={planeConfig.current.engineColor} intensity={2} distance={8} />
      <pointLight position={[-4.5, -0.1, 0]} color="#ff0000" intensity={0.5} distance={5} />
      <pointLight position={[4.5, -0.1, 0]} color="#00ff00" intensity={0.5} distance={5} />
      <pointLight position={[0, 0, -3]} color="#ffffff" intensity={0.8} distance={8} />
    </group>
  );
}

'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';  // used for camera calc
import ParticleTerrain from './ParticleTerrain';
import PlayerPlane from './PlayerPlane';
import EngineTrail from './EngineTrail';
import SpaceView from './SpaceView';
import FlightHUD from './FlightHUD';
import { loadSettings, GameSettings, defaultSettings } from '@/lib/settings';
import { airports, getSpawnPosition } from '@/lib/airports';

function LoadingScreen() {
  return (
    <div className="w-full h-full bg-[#000811] flex flex-col items-center justify-center">
      <div className="text-green-400 hud-text text-xl animate-pulse">
        INITIALIZING PARTICLE WORLD...
      </div>
      <div className="mt-4 w-48 h-1 bg-green-900/30 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full animate-[loading_2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.5} color="#556677" />
      <directionalLight position={[200, 300, 100]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-100, 200, -200]} intensity={0.3} color="#4488ff" />
      <hemisphereLight args={['#334466', '#112233', 0.3]} />
    </>
  );
}

// Calculate initial camera position from spawn data
const spawn = getSpawnPosition(airports[0]);
const spawnQuat = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(0, spawn.heading, 0, 'YXZ')
);
const initialCamOffset = new THREE.Vector3(0, 8, 25);
initialCamOffset.applyQuaternion(spawnQuat);
const initialCamPos: [number, number, number] = [
  spawn.x + initialCamOffset.x,
  spawn.y + initialCamOffset.y,
  spawn.z + initialCamOffset.z,
];

export default function GameScene() {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [spaceView, setSpaceView] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v') {
        setSpaceView((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Initialize playerPosition at the actual spawn point so terrain renders there
  const playerPosition = useRef({ x: spawn.x, y: spawn.y, z: spawn.z });
  const flightData = useRef({
    speed: 0,
    throttle: 0,
    altitude: spawn.y,
    agl: 2,
    heading: spawn.heading,
    pitch: 0,
    roll: 0,
    isGrounded: true,
    fuel: settings.fuelCapacity,
    fuelEmpty: false,
  });

  const renderFar = (settings.renderDistance || 500) + 200;

  return (
    <div className="w-full h-screen relative bg-[#000811]">
      <Suspense fallback={<LoadingScreen />}>
        <Canvas
          camera={{
            fov: 65,
            near: 0.5,
            far: renderFar,
            position: initialCamPos,
          }}
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={[0x000811]} />
          <SceneLighting />
          {spaceView ? (
            <SpaceView settings={settings} playerPosition={playerPosition} />
          ) : (
            <ParticleTerrain playerPosition={playerPosition} settings={settings} />
          )}
          <PlayerPlane
            playerPosition={playerPosition}
            flightData={flightData}
            settings={settings}
            spaceView={spaceView}
          />
          {!spaceView && (
            <EngineTrail playerPosition={playerPosition} flightData={flightData} />
          )}
        </Canvas>
      </Suspense>
      <FlightHUD flightData={flightData} settings={settings} />
    </div>
  );
}

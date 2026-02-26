'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import ParticleTerrain from './ParticleTerrain';
import PlayerPlane from './PlayerPlane';
import SpaceView from './SpaceView';
import FlightHUD from './FlightHUD';
import { loadSettings, GameSettings, defaultSettings } from '@/lib/settings';

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
      <ambientLight intensity={0.25} color="#334455" />
      <directionalLight position={[200, 300, 100]} intensity={0.6} color="#ffffff" />
      <directionalLight position={[-100, 200, -200]} intensity={0.2} color="#4488ff" />
    </>
  );
}

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

  const playerPosition = useRef({ x: 0, y: 10, z: 0 });
  const flightData = useRef({
    speed: 0,
    throttle: 0,
    altitude: 10,
    agl: 2,
    heading: 0,
    pitch: 0,
    roll: 0,
    isGrounded: true,
    fuel: settings.fuelCapacity,
    fuelEmpty: false,
  });

  const fogFar = settings.fogDistance || 600;
  const fogNear = fogFar * 0.17;

  return (
    <div className="w-full h-screen relative bg-[#000811]">
      <Suspense fallback={<LoadingScreen />}>
        <Canvas
          camera={{
            fov: 65,
            near: 0.5,
            far: spaceView ? 20000 : fogFar + 200,
            position: [0, 25, 30],
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
          {!spaceView && (
            <fog attach="fog" args={[new THREE.Color(0x000811), fogNear, fogFar]} />
          )}
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
        </Canvas>
      </Suspense>
      <FlightHUD flightData={flightData} settings={settings} />
    </div>
  );
}

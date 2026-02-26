'use client';

import { useRef, useEffect } from 'react';
import { GameSettings, defaultSettings } from '@/lib/settings';

interface FlightHUDProps {
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
}

export default function FlightHUD({ flightData, settings = defaultSettings }: FlightHUDProps) {
  const speedRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const throttleRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLSpanElement>(null);
  const aglRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);
  const fuelBarRef = useRef<HTMLDivElement>(null);
  const fuelTextRef = useRef<HTMLSpanElement>(null);
  const fuelWarningRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;

    const update = () => {
      const d = flightData.current;

      if (speedRef.current)
        speedRef.current.textContent = Math.round(d.speed).toString();
      if (altRef.current)
        altRef.current.textContent = Math.round(d.altitude).toString();
      if (aglRef.current)
        aglRef.current.textContent = Math.round(d.agl).toString();
      if (headingRef.current) {
        const deg = ((d.heading * 180) / Math.PI + 360) % 360;
        headingRef.current.textContent = Math.round(deg).toString().padStart(3, '0');
      }
      if (throttleRef.current) {
        throttleRef.current.style.width = `${d.throttle * 100}%`;
      }
      if (statusRef.current) {
        statusRef.current.textContent = d.isGrounded ? 'GND' : 'AIR';
        statusRef.current.style.color = d.isGrounded ? '#888' : '#00ff88';
      }
      if (pitchRef.current) {
        const pitchDeg = (d.pitch * 180) / Math.PI;
        pitchRef.current.style.transform = `translateY(${pitchDeg * 1.5}px)`;
      }
      if (rollRef.current) {
        const rollDeg = (d.roll * 180) / Math.PI;
        rollRef.current.style.transform = `rotate(${-rollDeg}deg)`;
      }

      if (settings.fuelEnabled) {
        const fuelPct = (d.fuel / settings.fuelCapacity) * 100;
        if (fuelBarRef.current) {
          fuelBarRef.current.style.width = `${fuelPct}%`;
          fuelBarRef.current.style.backgroundColor =
            fuelPct < 20 ? '#ff4444' : fuelPct < 50 ? '#ffaa00' : '#00cc66';
        }
        if (fuelTextRef.current) {
          fuelTextRef.current.textContent = Math.round(d.fuel).toString();
        }
        if (fuelWarningRef.current) {
          fuelWarningRef.current.style.display = d.fuelEmpty ? 'block' : 'none';
        }
      }

      rafId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(rafId);
  }, [flightData, settings]);

  return (
    <>
      {/* Game title */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <div className="hud-text text-green-400/40 text-xs tracking-[0.4em] uppercase">
          PARTICLE FLIGHT
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute top-10 left-0 right-0 flex justify-between px-6 pointer-events-none">
        <div className="hud-text text-green-400 text-sm">
          <div className="opacity-60 text-xs">SPD</div>
          <span ref={speedRef} className="text-2xl font-bold">0</span>
          <span className="text-xs ml-1 opacity-60">kt</span>
        </div>
        <div className="hud-text text-green-400 text-sm text-center">
          <div className="opacity-60 text-xs">HDG</div>
          <span ref={headingRef} className="text-2xl font-bold">000</span>
          <span className="text-xs ml-1 opacity-60">&deg;</span>
        </div>
        <div className="hud-text text-green-400 text-sm text-right">
          <div className="opacity-60 text-xs">ALT</div>
          <span ref={altRef} className="text-2xl font-bold">0</span>
          <span className="text-xs ml-1 opacity-60">ft</span>
        </div>
      </div>

      {/* Fuel warning */}
      {settings.fuelEnabled && (
        <div
          ref={fuelWarningRef}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ display: 'none' }}
        >
          <div className="text-red-500 hud-text text-lg font-bold animate-pulse">
            FUEL EMPTY - LAND IMMEDIATELY
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between pointer-events-none">
        <div className="hud-text text-green-400">
          <div className="text-xs opacity-60 mb-1">THR</div>
          <div className="w-24 h-2 bg-green-900/50 rounded-full overflow-hidden">
            <div
              ref={throttleRef}
              className="h-full bg-green-500 rounded-full transition-[width] duration-100"
              style={{ width: '0%' }}
            />
          </div>
          {settings.fuelEnabled && (
            <div className="mt-2">
              <div className="text-xs opacity-60 mb-1">
                FUEL <span ref={fuelTextRef}>100</span>
                <span className="opacity-40">/{settings.fuelCapacity}</span>
              </div>
              <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  ref={fuelBarRef}
                  className="h-full rounded-full transition-[width] duration-200"
                  style={{ width: '100%', backgroundColor: '#00cc66' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center">
          <div
            ref={rollRef}
            className="w-16 h-16 border border-green-500/30 rounded-full flex items-center justify-center relative overflow-hidden"
          >
            <div className="w-12 h-[1px] bg-green-500/50" />
            <div ref={pitchRef} className="absolute w-12 h-[1px] bg-green-400" />
            <div className="absolute w-1 h-1 bg-green-400 rounded-full" />
          </div>
        </div>

        <div className="hud-text text-right text-green-400">
          <div className="text-xs opacity-60 mb-1">AGL</div>
          <span ref={aglRef} className="text-lg">0</span>
          <span className="text-xs ml-1 opacity-60">ft</span>
          <div className="mt-1">
            <span
              ref={statusRef}
              className="text-xs font-bold px-2 py-0.5 border border-current rounded"
            >
              GND
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 hud-text text-green-400/30 text-xs text-center">
        W/S: Throttle | &uarr;&darr;: Pitch | &larr;&rarr;: Roll | A/D: Yaw | Space: Brake | V: Space View
        <br />
        Gamepad supported
      </div>
    </>
  );
}

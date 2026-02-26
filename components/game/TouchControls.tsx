'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface TouchControlsProps {
  onInput: (input: {
    throttleUp: boolean;
    throttleDown: boolean;
    pitchUp: boolean;
    pitchDown: boolean;
    rollLeft: boolean;
    rollRight: boolean;
    yawLeft: boolean;
    yawRight: boolean;
  }) => void;
}

export default function TouchControls({ onInput }: TouchControlsProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const leftStick = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 });
  const rightStick = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 });
  const throttleTouch = useRef({ active: false, startY: 0, dy: 0 });

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, zone: 'left' | 'right' | 'throttle') => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (zone === 'left') {
      leftStick.current = { active: true, startX: touch.clientX, startY: touch.clientY, dx: 0, dy: 0 };
    } else if (zone === 'right') {
      rightStick.current = { active: true, startX: touch.clientX, startY: touch.clientY, dx: 0, dy: 0 };
    } else {
      throttleTouch.current = { active: true, startY: touch.clientY, dy: 0 };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent, zone: 'left' | 'right' | 'throttle') => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const deadzone = 15;
    const maxDist = 60;

    if (zone === 'left' && leftStick.current.active) {
      const dx = (touch.clientX - leftStick.current.startX) / maxDist;
      const dy = (touch.clientY - leftStick.current.startY) / maxDist;
      leftStick.current.dx = Math.abs(dx * maxDist) > deadzone ? dx : 0;
      leftStick.current.dy = Math.abs(dy * maxDist) > deadzone ? dy : 0;
    } else if (zone === 'right' && rightStick.current.active) {
      const dx = (touch.clientX - rightStick.current.startX) / maxDist;
      const dy = (touch.clientY - rightStick.current.startY) / maxDist;
      rightStick.current.dx = Math.abs(dx * maxDist) > deadzone ? dx : 0;
      rightStick.current.dy = Math.abs(dy * maxDist) > deadzone ? dy : 0;
    } else if (zone === 'throttle' && throttleTouch.current.active) {
      throttleTouch.current.dy = (throttleTouch.current.startY - touch.clientY) / maxDist;
    }

    updateInput();
  }, []);

  const handleTouchEnd = useCallback((zone: 'left' | 'right' | 'throttle') => {
    if (zone === 'left') {
      leftStick.current = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
    } else if (zone === 'right') {
      rightStick.current = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
    } else {
      throttleTouch.current = { active: false, startY: 0, dy: 0 };
    }
    updateInput();
  }, []);

  const updateInput = useCallback(() => {
    const l = leftStick.current;
    const r = rightStick.current;
    const t = throttleTouch.current;

    onInput({
      // Left stick: yaw (horizontal) + pitch (vertical)
      yawLeft: l.dx < -0.3,
      yawRight: l.dx > 0.3,
      pitchUp: l.dy < -0.3,
      pitchDown: l.dy > 0.3,
      // Right stick: roll
      rollLeft: r.dx < -0.3,
      rollRight: r.dx > 0.3,
      // Throttle zone: vertical swipe
      throttleUp: t.dy > 0.3,
      throttleDown: t.dy < -0.3,
    });
  }, [onInput]);

  if (!isTouchDevice) return null;

  const stickStyle = 'absolute rounded-full border-2 border-green-500/20 bg-green-900/10 flex items-center justify-center';

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      {/* Left virtual stick - Pitch & Yaw */}
      <div
        className={`${stickStyle} bottom-24 left-6 w-28 h-28 pointer-events-auto`}
        onTouchStart={(e) => handleTouchStart(e, 'left')}
        onTouchMove={(e) => handleTouchMove(e, 'left')}
        onTouchEnd={() => handleTouchEnd('left')}
      >
        <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40"
          style={{
            transform: `translate(${leftStick.current.dx * 20}px, ${leftStick.current.dy * 20}px)`,
          }}
        />
        <div className="absolute -top-5 text-green-500/30 text-[10px] tracking-wider">YAW / PITCH</div>
      </div>

      {/* Right virtual stick - Roll */}
      <div
        className={`${stickStyle} bottom-24 right-6 w-28 h-28 pointer-events-auto`}
        onTouchStart={(e) => handleTouchStart(e, 'right')}
        onTouchMove={(e) => handleTouchMove(e, 'right')}
        onTouchEnd={() => handleTouchEnd('right')}
      >
        <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40"
          style={{
            transform: `translate(${rightStick.current.dx * 20}px, ${rightStick.current.dy * 20}px)`,
          }}
        />
        <div className="absolute -top-5 text-green-500/30 text-[10px] tracking-wider">ROLL</div>
      </div>

      {/* Throttle zone - center bottom */}
      <div
        className="absolute bottom-24 left-1/2 -translate-x-1/2 w-16 h-28 rounded-lg border-2 border-green-500/20 bg-green-900/10 pointer-events-auto flex items-center justify-center"
        onTouchStart={(e) => handleTouchStart(e, 'throttle')}
        onTouchMove={(e) => handleTouchMove(e, 'throttle')}
        onTouchEnd={() => handleTouchEnd('throttle')}
      >
        <div className="text-green-500/30 text-[10px] tracking-wider rotate-90">THR</div>
      </div>
    </div>
  );
}

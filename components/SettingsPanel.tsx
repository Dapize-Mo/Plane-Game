'use client';

import { useState, useRef, useEffect } from 'react';

export interface ParticleSettings {
  theme: string;
  brightness: number;
  particleSize: number;
  animSpeed: number;
  fogNear: number;
  fogFar: number;
  autoRotateSpeed: number;
}

const THEMES: Record<string, { label: string; colorLow: [number, number, number]; colorMid: [number, number, number]; colorHigh: [number, number, number]; colorPeak: [number, number, number]; bg: [number, number, number] }> = {
  arctic: {
    label: 'Arctic',
    colorLow: [0.02, 0.02, 0.06],
    colorMid: [0.08, 0.12, 0.25],
    colorHigh: [0.7, 0.85, 1.0],
    colorPeak: [1.0, 1.0, 1.0],
    bg: [0.004, 0.004, 0.03],
  },
  ember: {
    label: 'Ember',
    colorLow: [0.06, 0.01, 0.01],
    colorMid: [0.3, 0.06, 0.02],
    colorHigh: [1.0, 0.4, 0.08],
    colorPeak: [1.0, 0.9, 0.6],
    bg: [0.02, 0.005, 0.005],
  },
  toxic: {
    label: 'Toxic',
    colorLow: [0.01, 0.04, 0.02],
    colorMid: [0.04, 0.18, 0.06],
    colorHigh: [0.2, 0.9, 0.3],
    colorPeak: [0.7, 1.0, 0.8],
    bg: [0.005, 0.015, 0.005],
  },
  violet: {
    label: 'Violet',
    colorLow: [0.04, 0.01, 0.06],
    colorMid: [0.15, 0.04, 0.25],
    colorHigh: [0.6, 0.3, 1.0],
    colorPeak: [0.9, 0.8, 1.0],
    bg: [0.01, 0.005, 0.02],
  },
  mono: {
    label: 'Mono',
    colorLow: [0.03, 0.03, 0.03],
    colorMid: [0.12, 0.12, 0.12],
    colorHigh: [0.6, 0.6, 0.6],
    colorPeak: [1.0, 1.0, 1.0],
    bg: [0.008, 0.008, 0.008],
  },
  aurora: {
    label: 'Aurora',
    colorLow: [0.01, 0.03, 0.05],
    colorMid: [0.05, 0.2, 0.15],
    colorHigh: [0.3, 0.8, 0.6],
    colorPeak: [0.9, 0.5, 1.0],
    bg: [0.005, 0.01, 0.015],
  },
};

export { THEMES };

const DEFAULTS: ParticleSettings = {
  theme: 'arctic',
  brightness: 1.0,
  particleSize: 1.0,
  animSpeed: 1.0,
  fogNear: 100,
  fogFar: 450,
  autoRotateSpeed: 0.12,
};

interface Props {
  settings: ParticleSettings;
  onChange: (s: ParticleSettings) => void;
}

export default function SettingsPanel({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const set = <K extends keyof ParticleSettings>(key: K, val: ParticleSettings[K]) => {
    onChange({ ...settings, [key]: val });
  };

  return (
    <div ref={panelRef} className="absolute top-5 right-5 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          text-white/40 text-xs hover:text-white/70 transition-all
          border bg-black/30 px-3 py-1.5 rounded backdrop-blur-sm
          ${open ? 'border-white/25 text-white/60' : 'border-white/10 hover:border-white/30'}
        `}
      >
        Settings
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-10 right-0 mt-1 w-72 border border-white/10 bg-black/70 backdrop-blur-md rounded-lg p-4 space-y-4 shadow-2xl">
          {/* Theme selector */}
          <div>
            <label className="text-white/40 text-[10px] font-medium tracking-[0.15em] uppercase block mb-2">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => set('theme', key)}
                  className={`
                    text-[10px] py-1.5 px-2 rounded transition-all
                    ${settings.theme === key
                      ? 'bg-white/15 text-white/80 border border-white/25'
                      : 'bg-white/5 text-white/30 border border-transparent hover:bg-white/10 hover:text-white/50'
                    }
                  `}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                    style={{
                      backgroundColor: `rgb(${t.colorHigh.map(c => Math.round(c * 255)).join(',')})`,
                    }}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <Slider label="Brightness" value={settings.brightness} min={0.2} max={2.0} step={0.05} onChange={v => set('brightness', v)} />
          <Slider label="Particle Size" value={settings.particleSize} min={0.3} max={3.0} step={0.1} onChange={v => set('particleSize', v)} />
          <Slider label="Anim Speed" value={settings.animSpeed} min={0} max={3.0} step={0.1} onChange={v => set('animSpeed', v)} />
          <Slider label="Fog Near" value={settings.fogNear} min={30} max={300} step={5} onChange={v => set('fogNear', v)} />
          <Slider label="Fog Far" value={settings.fogFar} min={200} max={800} step={10} onChange={v => set('fogFar', v)} />
          <Slider label="Rotate Speed" value={settings.autoRotateSpeed} min={0} max={1.0} step={0.02} onChange={v => set('autoRotateSpeed', v)} />

          {/* Reset */}
          <button
            onClick={() => onChange({ ...DEFAULTS })}
            className="w-full text-[10px] text-white/25 hover:text-white/50 transition-colors py-1.5 border border-white/5 hover:border-white/15 rounded"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-white/30 text-[10px]">{label}</span>
        <span className="text-white/20 text-[10px] tabular-nums">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 appearance-none bg-white/10 rounded-full outline-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/50 [&::-webkit-slider-thumb]:hover:bg-white/70
          [&::-webkit-slider-thumb]:transition-colors
          [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white/50 [&::-moz-range-thumb]:border-0"
      />
    </div>
  );
}

export { DEFAULTS };

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
  theme: 'mono',
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
    <div ref={panelRef} style={{ position: 'absolute', top: 20, right: 20, zIndex: 50 }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          color: open ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)',
          fontSize: 12,
          border: `1px solid ${open ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`,
          background: 'rgba(0,0,0,0.3)',
          padding: '6px 12px',
          borderRadius: 4,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          fontFamily: 'inherit',
        }}
      >
        Settings
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 40,
          right: 0,
          width: 288,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(12px)',
          borderRadius: 8,
          padding: 16,
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}>
          {/* Theme selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 500,
              letterSpacing: '0.15em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 8,
            }}>
              Theme
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => set('theme', key)}
                  style={{
                    fontSize: 10,
                    padding: '6px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    border: settings.theme === key ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                    background: settings.theme === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                    color: settings.theme === key ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: `rgb(${t.colorHigh.map(c => Math.round(c * 255)).join(',')})`,
                    flexShrink: 0,
                  }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Slider label="Brightness" value={settings.brightness} min={0.2} max={2.0} step={0.05} onChange={v => set('brightness', v)} />
            <Slider label="Particle Size" value={settings.particleSize} min={0.3} max={3.0} step={0.1} onChange={v => set('particleSize', v)} />
            <Slider label="Anim Speed" value={settings.animSpeed} min={0} max={3.0} step={0.1} onChange={v => set('animSpeed', v)} />
            <Slider label="Fog Near" value={settings.fogNear} min={30} max={300} step={5} onChange={v => set('fogNear', v)} />
            <Slider label="Fog Far" value={settings.fogFar} min={200} max={800} step={10} onChange={v => set('fogFar', v)} />
            <Slider label="Rotate Speed" value={settings.autoRotateSpeed} min={0} max={1.0} step={0.02} onChange={v => set('autoRotateSpeed', v)} />
          </div>

          {/* Reset */}
          <button
            onClick={() => onChange({ ...DEFAULTS })}
            style={{
              width: '100%', fontSize: 10, color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
              padding: '6px 0', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4,
              background: 'transparent', marginTop: 12, fontFamily: 'inherit',
            }}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{label}</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', height: 4, cursor: 'pointer', accentColor: 'rgba(255,255,255,0.5)' }}
      />
    </div>
  );
}

export { DEFAULTS };

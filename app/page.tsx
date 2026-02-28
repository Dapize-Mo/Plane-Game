'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import SettingsPanel, { DEFAULTS, THEMES, type ParticleSettings } from '@/components/SettingsPanel';

const MonochromeTerrain = dynamic(
  () => import('@/components/MonochromeTerrain'),
  { ssr: false }
);

const STORAGE_KEY = 'particle-settings';

function loadSettings(): ParticleSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    // Validate all keys exist with correct types
    const result = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS) as (keyof ParticleSettings)[]) {
      if (key in parsed && typeof parsed[key] === typeof DEFAULTS[key]) {
        result[key] = parsed[key];
      }
    }
    // Validate theme exists
    if (!(result.theme in THEMES)) result.theme = DEFAULTS.theme;
    return result;
  } catch {
    return { ...DEFAULTS };
  }
}

export default function Home() {
  const [settings, setSettings] = useState<ParticleSettings>(() => loadSettings());
  const [showFps, setShowFps] = useState(false);
  const [fps, setFps] = useState(0);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* quota exceeded, ignore */ }
  }, [settings]);

  // FPS counter
  useEffect(() => {
    if (!showFps) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showFps]);

  // Keyboard shortcuts
  const themeKeys = Object.keys(THEMES);
  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.key.toLowerCase()) {
      case 'r':
        setSettings({ ...DEFAULTS });
        break;
      case 't': {
        setSettings(prev => {
          const idx = themeKeys.indexOf(prev.theme);
          const next = themeKeys[(idx + 1) % themeKeys.length];
          return { ...prev, theme: next };
        });
        break;
      }
      case ' ':
        e.preventDefault();
        setSettings(prev => ({
          ...prev,
          autoRotateSpeed: prev.autoRotateSpeed > 0 ? 0 : DEFAULTS.autoRotateSpeed,
        }));
        break;
      case 'f':
        setShowFps(prev => !prev);
        break;
    }
  }, [themeKeys]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100vh', background: '#010108', overflow: 'hidden' }}
    >
      <MonochromeTerrain settings={settings} />

      {/* Title overlay — top left */}
      <div
        style={{ position: 'absolute', top: 20, left: 20, pointerEvents: 'none', zIndex: 50 }}
      >
        <h1
          style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}
        >
          Particle Thing
        </h1>
        <p
          style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, marginTop: 8, lineHeight: 1.6 }}
        >
          1,000,000 Particles
          <br />
          Left Click: Rotate &bull; Right Click: Pan &bull; Scroll: Zoom
        </p>
        <p
          style={{ color: 'rgba(255,255,255,0.1)', fontSize: 9, marginTop: 6, lineHeight: 1.5 }}
        >
          T: Cycle Theme &bull; R: Reset &bull; Space: Pause Rotation &bull; F: FPS
        </p>
      </div>

      {/* FPS counter — top left below title */}
      {showFps && (
        <div
          style={{
            position: 'absolute', top: 90, left: 20, zIndex: 50,
            color: 'rgba(255,255,255,0.3)', fontSize: 10,
            fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace',
          }}
        >
          {fps} FPS
        </div>
      )}

      {/* Nav links — top right, before settings button */}
      <div
        style={{ position: 'absolute', top: 20, right: 100, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <Link
          href="/profile"
          style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
            padding: '6px 12px', borderRadius: 4,
          }}
        >
          Profile
        </Link>
        <Link
          href="/about"
          style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
            padding: '6px 12px', borderRadius: 4,
          }}
        >
          About
        </Link>
      </div>

      {/* Settings panel — top right */}
      <SettingsPanel settings={settings} onChange={setSettings} />

      {/* Credit — bottom left */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 50 }}>
        <a
          href="https://x.com/taylor_sntx"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, textDecoration: 'none' }}
        >
          Inspired by @taylor_sntx
        </a>
      </div>
    </div>
  );
}

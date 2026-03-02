'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import SettingsPanel, { DEFAULTS, THEMES, type ParticleSettings, type Quality } from '@/components/SettingsPanel';

const MonochromeTerrain = dynamic(() => import('@/components/MonochromeTerrain'), { ssr: false });
const OceanMountain     = dynamic(() => import('@/components/OceanMountain'),     { ssr: false });
const ParticleBall      = dynamic(() => import('@/components/ParticleBall'),      { ssr: false });
const Galaxy            = dynamic(() => import('@/components/Galaxy'),            { ssr: false });
const Vortex            = dynamic(() => import('@/components/Vortex'),            { ssr: false });

const SCENES = [
  { id: 'terrain', label: 'Terrain', desc: 'Mountains, trench, rolling hills' },
  { id: 'ocean',   label: 'Ocean',   desc: 'Island mountain rising from the sea' },
  { id: 'ball',    label: 'Ball',    desc: 'Glowing particle sphere with electric rings' },
  { id: 'galaxy',  label: 'Galaxy',  desc: '4-arm spiral galaxy with core bulge' },
  { id: 'vortex',  label: 'Vortex',  desc: 'Funnel vortex with lightning streamers' },
] as const;

type SceneId = (typeof SCENES)[number]['id'];

const STORAGE_KEY = 'particle-settings';
const SCENE_KEY   = 'particle-scene';

/** Guess a good default quality based on device signals. Only used on first visit. */
function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'high';
  const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
  if (isMobile) return 'low';
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  if (nav.deviceMemory && nav.deviceMemory <= 2) return 'low';
  if (nav.deviceMemory && nav.deviceMemory <= 4) return 'medium';
  if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) return 'low';
  return 'high';
}

function loadSettings(): ParticleSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS, quality: detectQuality() };
    const parsed = JSON.parse(raw);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS)) {
      if (key in parsed && typeof parsed[key] === typeof result[key]) {
        result[key] = parsed[key];
      }
    }
    if (!(result.theme in THEMES)) result.theme = DEFAULTS.theme;
    if (!['low', 'medium', 'high'].includes(result.quality)) result.quality = DEFAULTS.quality;
    return result as ParticleSettings;
  } catch {
    return { ...DEFAULTS };
  }
}

function loadScene(): SceneId {
  if (typeof window === 'undefined') return 'terrain';
  const stored = localStorage.getItem(SCENE_KEY);
  const valid = SCENES.map(s => s.id) as string[];
  if (stored && valid.includes(stored)) return stored as SceneId;
  return 'terrain';
}

// Approx particle counts per scene + quality for the info overlay
const PARTICLE_COUNTS: Record<SceneId, Record<Quality, string>> = {
  terrain: { low: '250,000', medium: '562,500', high: '1,000,000' },
  ocean:   { low: '250,000', medium: '562,500', high: '1,000,000' },
  ball:    { low: '90,000',  medium: '163,000', high: '270,000'   },
  galaxy:  { low: '160,000', medium: '360,000', high: '610,000'   },
  vortex:  { low: '82,000',  medium: '153,000', high: '250,000'   },
};

export default function Home() {
  const [settings, setSettings] = useState<ParticleSettings>(() => loadSettings());
  const [scene, setScene]       = useState<SceneId>(() => loadScene());
  const [showFps, setShowFps]   = useState(false);
  const [fps, setFps]           = useState(0);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }, [settings]);

  useEffect(() => {
    try { localStorage.setItem(SCENE_KEY, scene); } catch {}
  }, [scene]);

  useEffect(() => {
    if (!showFps) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) { setFps(frames); frames = 0; last = now; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showFps]);

  const sceneIds = SCENES.map(s => s.id);
  const themeKeys = Object.keys(THEMES);

  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    switch (e.key.toLowerCase()) {
      case 'r':
        setSettings(prev => ({ ...DEFAULTS, quality: prev.quality }));
        break;
      case 't':
        setSettings(prev => {
          const idx  = themeKeys.indexOf(prev.theme);
          const next = themeKeys[(idx + 1) % themeKeys.length];
          return { ...prev, theme: next };
        });
        break;
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
      case 'tab':
        e.preventDefault();
        setScene(prev => {
          const idx = sceneIds.indexOf(prev);
          return sceneIds[(idx + 1) % sceneIds.length];
        });
        break;
    }
  }, [themeKeys, sceneIds]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  const currentScene = SCENES.find(s => s.id === scene)!;
  const particleCount = PARTICLE_COUNTS[scene][settings.quality];

  // key includes quality so the scene component remounts (and re-initialises geometry)
  // when quality changes. Other setting changes update via uniforms without remounting.
  const sceneKey = `${scene}-${settings.quality}`;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#010108', overflow: 'hidden' }}>

      {/* Active scene — key forces remount on quality change */}
      {scene === 'terrain' && <MonochromeTerrain key={sceneKey} settings={settings} />}
      {scene === 'ocean'   && <OceanMountain     key={sceneKey} settings={settings} />}
      {scene === 'ball'    && <ParticleBall       key={sceneKey} settings={settings} />}
      {scene === 'galaxy'  && <Galaxy             key={sceneKey} settings={settings} />}
      {scene === 'vortex'  && <Vortex             key={sceneKey} settings={settings} />}

      {/* Title — top left */}
      <div style={{ position: 'absolute', top: 20, left: 20, pointerEvents: 'none', zIndex: 50 }}>
        <h1 style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>
          Particle Thing
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
          {particleCount} Particles &bull; {currentScene.desc}
          <br />
          Left Click: Rotate &bull; Right Click: Pan &bull; Scroll: Zoom
        </p>
        <p style={{ color: 'rgba(255,255,255,0.1)', fontSize: 9, marginTop: 6, lineHeight: 1.5 }}>
          T: Theme &bull; R: Reset &bull; Space: Pause &bull; F: FPS &bull; Tab: Next Scene
        </p>
      </div>

      {/* FPS counter */}
      {showFps && (
        <div style={{
          position: 'absolute', top: 100, left: 20, zIndex: 50,
          color: 'rgba(255,255,255,0.3)', fontSize: 10,
          fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace',
        }}>
          {fps} FPS
        </div>
      )}

      {/* Scene selector — bottom center; scrollable so it fits on narrow screens */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 50, maxWidth: 'calc(100vw - 32px)',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', padding: 3,
      }}>
        <div style={{ display: 'flex', gap: 4, whiteSpace: 'nowrap' }}>
          {SCENES.map(s => (
            <button
              key={s.id}
              onClick={() => setScene(s.id)}
              title={s.desc}
              style={{
                fontSize: 11, padding: '6px 14px', borderRadius: 4,
                cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: scene === s.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: scene === s.id ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nav links */}
      <div style={{ position: 'absolute', top: 20, right: 100, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/profile" style={{
          color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
          padding: '6px 12px', borderRadius: 4,
        }}>
          Profile
        </Link>
        <Link href="/about" style={{
          color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
          padding: '6px 12px', borderRadius: 4,
        }}>
          About
        </Link>
      </div>

      {/* Settings */}
      <SettingsPanel settings={settings} onChange={setSettings} />

      {/* Credit */}
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

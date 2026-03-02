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
  { id: 'ocean',   label: 'Ocean',   desc: 'Flat sea with scattered island peaks' },
  { id: 'ball',    label: 'Ball',    desc: 'Physics ball — drag and throw' },
  { id: 'galaxy',  label: 'Galaxy',  desc: 'Spiral galaxy with orbiting planets' },
  { id: 'vortex',  label: 'Vortex',  desc: 'Funnel vortex with lightning streamers' },
] as const;

type SceneId = (typeof SCENES)[number]['id'];

// Per-scene storage keys
const SCENE_STORAGE_KEY = (id: string) => `particle-settings-v2-${id}`;
const SCENE_KEY = 'particle-scene-v2';

// Per-scene initial overrides (applied on first visit before any saved settings)
const SCENE_INIT: Partial<Record<SceneId, Partial<ParticleSettings>>> = {
  terrain: {},
  ocean:   { fogNear: 80,  fogFar: 620,  islandCount: 4 },
  ball:    { fogNear: 40,  fogFar: 320 },
  galaxy:  { fogNear: 200, fogFar: 950, autoRotateSpeed: 0.08, planetCount: 3 },
  vortex:  { fogNear: 80,  fogFar: 520 },
};

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

function loadSceneSettings(sceneId: SceneId): ParticleSettings {
  const base: ParticleSettings = { ...DEFAULTS, ...(SCENE_INIT[sceneId] || {}) };
  if (typeof window === 'undefined') return base;
  if (!base.quality || base.quality === DEFAULTS.quality) {
    base.quality = detectQuality();
  }
  try {
    const raw = localStorage.getItem(SCENE_STORAGE_KEY(sceneId));
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = { ...base };
    for (const key of Object.keys(base)) {
      if (key in parsed && typeof parsed[key] === typeof result[key]) {
        result[key] = parsed[key];
      }
    }
    if (!(result.theme in THEMES)) result.theme = DEFAULTS.theme;
    if (!(['low', 'medium', 'high'] as string[]).includes(result.quality)) result.quality = base.quality;
    return result as ParticleSettings;
  } catch {
    return base;
  }
}

function loadAllSceneSettings(): Record<SceneId, ParticleSettings> {
  const result = {} as Record<SceneId, ParticleSettings>;
  for (const s of SCENES) {
    result[s.id] = loadSceneSettings(s.id);
  }
  return result;
}

function loadScene(): SceneId {
  if (typeof window === 'undefined') return 'terrain';
  const stored = localStorage.getItem(SCENE_KEY);
  const valid  = SCENES.map(s => s.id) as string[];
  if (stored && valid.includes(stored)) return stored as SceneId;
  return 'terrain';
}

// Scene key: forces remount when quality or scene-specific reload params change
function getSceneKey(scene: SceneId, settings: ParticleSettings): string {
  let key = `${scene}-${settings.quality}`;
  if (scene === 'ocean')  key += `-${settings.islandCount}`;
  if (scene === 'galaxy') key += `-${settings.planetCount}`;
  return key;
}

// Approx particle counts per scene + quality
const PARTICLE_COUNTS: Record<SceneId, Record<Quality, string>> = {
  terrain: { low: '250,000', medium: '562,500', high: '1,000,000' },
  ocean:   { low: '250,000', medium: '562,500', high: '1,000,000' },
  ball:    { low: '29,000',  medium: '73,000',  high: '144,000'   },
  galaxy:  { low: '160,000', medium: '360,000', high: '610,000'   },
  vortex:  { low: '82,000',  medium: '153,000', high: '250,000'   },
};

export default function Home() {
  const [allSettings, setAllSettings] = useState<Record<SceneId, ParticleSettings>>(
    () => loadAllSceneSettings()
  );
  const [scene, setScene] = useState<SceneId>(() => loadScene());
  const [showFps, setShowFps] = useState(false);
  const [fps, setFps] = useState(0);

  // Active settings for the current scene
  const settings = allSettings[scene];

  // Persist each scene's settings whenever they change
  useEffect(() => {
    try {
      for (const [id, s] of Object.entries(allSettings)) {
        localStorage.setItem(SCENE_STORAGE_KEY(id), JSON.stringify(s));
      }
    } catch {}
  }, [allSettings]);

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

  const handleSettingsChange = useCallback((newSettings: ParticleSettings) => {
    setAllSettings((prev: Record<SceneId, ParticleSettings>) => ({ ...prev, [scene]: newSettings }));
  }, [scene]);

  const handleCopyToAll = useCallback(() => {
    const current = allSettings[scene];
    setAllSettings((prev: Record<SceneId, ParticleSettings>) => {
      const next = { ...prev };
      for (const s of SCENES) {
        next[s.id] = { ...prev[s.id], ...current };
      }
      return next;
    });
  }, [allSettings, scene]);

  const sceneIds  = SCENES.map(s => s.id);
  const themeKeys = Object.keys(THEMES);

  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const s = scene as SceneId;
    switch (e.key.toLowerCase()) {
      case 'r': {
        const init = (SCENE_INIT as Record<string, Partial<ParticleSettings>>)[s] || {};
        setAllSettings((prev: Record<SceneId, ParticleSettings>) =>
          ({ ...prev, [s]: { ...DEFAULTS, ...init, quality: prev[s].quality } } as Record<SceneId, ParticleSettings>)
        );
        break;
      }
      case 't': {
        setAllSettings((prev: Record<SceneId, ParticleSettings>) => {
          const idx = themeKeys.indexOf(prev[s].theme);
          return { ...prev, [s]: { ...prev[s], theme: themeKeys[(idx + 1) % themeKeys.length] } } as Record<SceneId, ParticleSettings>;
        });
        break;
      }
      case ' ': {
        e.preventDefault();
        setAllSettings((prev: Record<SceneId, ParticleSettings>) =>
          ({ ...prev, [s]: { ...prev[s], autoRotateSpeed: prev[s].autoRotateSpeed > 0 ? 0 : DEFAULTS.autoRotateSpeed } } as Record<SceneId, ParticleSettings>)
        );
        break;
      }
      case 'f':
        setShowFps((prev: boolean) => !prev);
        break;
      case 'tab':
        e.preventDefault();
        setScene((prev: SceneId) => {
          const idx = sceneIds.indexOf(prev);
          return sceneIds[(idx + 1) % sceneIds.length];
        });
        break;
    }
  }, [scene, themeKeys, sceneIds]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  const currentScene  = SCENES.find(s => s.id === scene)!;
  const particleCount = (PARTICLE_COUNTS as Record<string, Record<string, string>>)[scene][settings.quality];
  const sceneKey      = getSceneKey(scene, settings);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#010108', overflow: 'hidden' }}>

      {/* Active scene */}
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
          {scene === 'ball'
            ? 'Click &amp; drag the ball to throw it'
            : 'Left Click: Rotate \u2022 Right Click: Pan \u2022 Scroll: Zoom'}
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

      {/* Scene selector — bottom center */}
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

      {/* Settings — passes sceneId so panel shows scene-specific controls */}
      <SettingsPanel
        settings={settings}
        onChange={handleSettingsChange}
        sceneId={scene}
        onCopyToAll={handleCopyToAll}
      />

      {/* Credit — more prominent */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 50 }}>
        <a
          href="https://x.com/taylor_sntx"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 12,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)',
            padding: '5px 10px',
            borderRadius: 4,
            transition: 'color 0.2s',
          }}
        >
          <span style={{ fontSize: 14 }}>𝕏</span>
          <span>Inspired by <strong style={{ color: 'rgba(255,255,255,0.8)' }}>@taylor_sntx</strong></span>
        </a>
      </div>
    </div>
  );
}

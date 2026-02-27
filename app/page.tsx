'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import SettingsPanel, { DEFAULTS, type ParticleSettings } from '@/components/SettingsPanel';

const MonochromeTerrain = dynamic(
  () => import('@/components/MonochromeTerrain'),
  { ssr: false }
);

export default function Home() {
  const [settings, setSettings] = useState<ParticleSettings>({ ...DEFAULTS });

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
      </div>

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

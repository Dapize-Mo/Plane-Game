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
    <div className="relative w-full h-screen bg-[#010108] overflow-hidden">
      <MonochromeTerrain settings={settings} />

      <div className="absolute top-5 left-5 pointer-events-none z-50">
        <h1 className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase">
          Particle Thing
        </h1>
        <p className="text-white/15 text-[10px] mt-2 leading-relaxed">
          1,000,000 Particles
          <br />
          Left Click: Rotate &bull; Right Click: Pan &bull; Scroll: Zoom
        </p>
      </div>

      <SettingsPanel settings={settings} onChange={setSettings} />

      <div className="absolute top-5 right-24 pointer-events-auto z-50 flex items-center gap-2">
        <Link
          href="/profile"
          className="text-white/40 text-xs hover:text-white/70 transition-colors border border-white/10 bg-black/30 px-3 py-1.5 rounded hover:border-white/30 backdrop-blur-sm"
        >
          Profile
        </Link>
        <Link
          href="/about"
          className="text-white/40 text-xs hover:text-white/70 transition-colors border border-white/10 bg-black/30 px-3 py-1.5 rounded hover:border-white/30 backdrop-blur-sm"
        >
          About
        </Link>
      </div>

      <div className="absolute bottom-5 left-5 pointer-events-auto z-50">
        <a
          href="https://x.com/taylor_sntx"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/20 text-[10px] hover:text-white/50 transition-colors"
        >
          Inspired by @taylor_sntx
        </a>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const MonochromeTerrain = dynamic(
  () => import('@/components/MonochromeTerrain'),
  { ssr: false }
);

export default function Home() {
  const [viewMode, setViewMode] = useState<'orbit' | 'ball'>('orbit');

  return (
    <div className="relative w-full h-screen bg-[#010102] overflow-hidden">
      <MonochromeTerrain viewMode={viewMode} onViewModeChange={setViewMode} />

      <div className="absolute top-5 left-5 pointer-events-none z-10">
        <h1 className="text-white/40 text-xs font-medium tracking-[0.3em] uppercase">
          Monochrome Terrain
        </h1>
        <p className="text-white/20 text-[10px] mt-2 leading-relaxed">
          1,000,000 Particles &bull; Expanded World
          <br />
          {viewMode === 'orbit'
            ? 'Left Click: Rotate \u2022 Right Click: Pan \u2022 Scroll: Zoom'
            : 'WASD / Arrows: Roll Ball'}
          <br />
          Press V to toggle view
        </p>
      </div>

      {/* View toggle + nav */}
      <div className="absolute top-5 right-5 pointer-events-auto z-10 flex items-center gap-2">
        <button
          onClick={() => setViewMode(viewMode === 'orbit' ? 'ball' : 'orbit')}
          className="text-white/30 text-xs hover:text-white/60 transition-colors border border-white/10 px-3 py-1.5 rounded hover:border-white/30"
        >
          {viewMode === 'orbit' ? 'Ball View' : 'Orbit View'}
        </button>
        <Link
          href="/profile"
          className="text-white/30 text-xs hover:text-white/60 transition-colors border border-white/10 px-3 py-1.5 rounded hover:border-white/30"
        >
          Profile
        </Link>
        <Link
          href="/about"
          className="text-white/30 text-xs hover:text-white/60 transition-colors border border-white/10 px-3 py-1.5 rounded hover:border-white/30"
        >
          About
        </Link>
      </div>

      <div className="absolute bottom-5 left-5 pointer-events-auto z-10">
        <a
          href="https://x.com/taylor_sntx"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/30 text-[10px] hover:text-white/60 transition-colors"
        >
          Inspired by @taylor_sntx
        </a>
      </div>
    </div>
  );
}

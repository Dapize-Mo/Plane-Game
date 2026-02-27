'use client';

import dynamic from 'next/dynamic';

const MonochromeTerrain = dynamic(
  () => import('@/components/MonochromeTerrain'),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="relative w-full h-screen bg-[#010102]">
      <MonochromeTerrain />

      <div className="absolute top-5 left-5 pointer-events-none z-10">
        <h1 className="text-white/40 text-xs font-medium tracking-[0.3em] uppercase">
          Monochrome Terrain
        </h1>
        <p className="text-white/20 text-[10px] mt-2 leading-relaxed">
          1,000,000 Particles &bull; Expanded World
          <br />
          Left Click: Rotate &bull; Right Click: Pan &bull; Scroll: Zoom
        </p>
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

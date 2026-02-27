'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#010102] flex flex-col items-center px-4 py-12">
      {/* Back navigation */}
      <div className="w-full max-w-lg mb-8">
        <Link
          href="/"
          className="text-white/30 text-xs hover:text-white/60 transition-colors"
        >
          &larr; Back to Terrain
        </Link>
      </div>

      {/* About content */}
      <div className="w-full max-w-lg">
        <h1 className="text-white/60 text-lg font-medium tracking-[0.2em] uppercase mb-6">
          About
        </h1>

        <div className="space-y-6 text-white/40 text-sm leading-relaxed">
          <p>
            Monochrome Terrain is a procedural particle world built with 1,000,000
            points. The landscape features rolling hills, a mountain range, and a
            deep trench — all generated from layered simplex noise.
          </p>

          <div className="border border-white/10 rounded-lg p-5 space-y-3">
            <h2 className="text-white/50 text-xs font-medium tracking-[0.15em] uppercase">
              Controls
            </h2>
            <div className="space-y-2 text-xs text-white/30">
              <div className="flex justify-between">
                <span>Orbit Mode</span>
                <span>Left Click: Rotate / Right Click: Pan / Scroll: Zoom</span>
              </div>
              <div className="flex justify-between">
                <span>Ball Mode</span>
                <span>WASD or Arrow Keys to roll</span>
              </div>
              <div className="flex justify-between">
                <span>Toggle View</span>
                <span>Press V or click the button</span>
              </div>
            </div>
          </div>

          <div className="border border-white/10 rounded-lg p-5 space-y-3">
            <h2 className="text-white/50 text-xs font-medium tracking-[0.15em] uppercase">
              Tech Stack
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs text-white/30">
              <span>Framework</span><span>Next.js 14</span>
              <span>3D Engine</span><span>Three.js</span>
              <span>Noise</span><span>Simplex Noise (FBM)</span>
              <span>Styling</span><span>Tailwind CSS</span>
              <span>Language</span><span>TypeScript</span>
            </div>
          </div>

          <div className="border border-white/10 rounded-lg p-5 space-y-3">
            <h2 className="text-white/50 text-xs font-medium tracking-[0.15em] uppercase">
              Terrain Features
            </h2>
            <ul className="space-y-1 text-xs text-white/30">
              <li>Rolling hills across the entire landscape</li>
              <li>One mountain range with natural waviness</li>
              <li>One deep trench cutting through the terrain</li>
              <li>4-octave fractal noise for natural detail</li>
              <li>A controllable ball with terrain-following physics</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5">
          <a
            href="https://x.com/taylor_sntx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 text-[10px] hover:text-white/40 transition-colors"
          >
            Inspired by @taylor_sntx
          </a>
        </div>
      </div>
    </div>
  );
}

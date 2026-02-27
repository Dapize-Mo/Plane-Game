'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#010108] flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg mb-8">
        <Link
          href="/"
          className="text-white/30 text-xs hover:text-white/60 transition-colors"
        >
          &larr; Back
        </Link>
      </div>

      <div className="w-full max-w-lg">
        <h1 className="text-white/50 text-lg font-medium tracking-[0.2em] uppercase mb-6">
          About
        </h1>

        <div className="space-y-6 text-white/35 text-sm leading-relaxed">
          <p>
            Particle Thing is a procedural landscape made of 1,000,000 glowing
            particles. The terrain is sculpted from layered simplex noise with a
            mountain range, a deep trench, and rolling hills — all rendered with
            custom shaders and additive blending.
          </p>

          <div className="border border-white/8 rounded-lg p-5 space-y-3">
            <h2 className="text-white/45 text-xs font-medium tracking-[0.15em] uppercase">
              Controls
            </h2>
            <div className="space-y-2 text-xs text-white/25">
              <div className="flex justify-between">
                <span>Rotate</span>
                <span>Left Click + Drag</span>
              </div>
              <div className="flex justify-between">
                <span>Pan</span>
                <span>Right Click + Drag</span>
              </div>
              <div className="flex justify-between">
                <span>Zoom</span>
                <span>Scroll</span>
              </div>
            </div>
          </div>

          <div className="border border-white/8 rounded-lg p-5 space-y-3">
            <h2 className="text-white/45 text-xs font-medium tracking-[0.15em] uppercase">
              Tech
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs text-white/25">
              <span>Framework</span><span>Next.js 14</span>
              <span>3D</span><span>Three.js</span>
              <span>Shaders</span><span>Custom GLSL</span>
              <span>Noise</span><span>Simplex (4-octave FBM)</span>
              <span>Blending</span><span>Additive</span>
              <span>Styling</span><span>Tailwind CSS</span>
            </div>
          </div>

          <div className="border border-white/8 rounded-lg p-5 space-y-3">
            <h2 className="text-white/45 text-xs font-medium tracking-[0.15em] uppercase">
              Visual Effects
            </h2>
            <ul className="space-y-1 text-xs text-white/25">
              <li>Soft circular particles with inner glow</li>
              <li>Additive blending for luminous peaks</li>
              <li>Height-based color gradient (deep blue to white)</li>
              <li>Subtle breathing animation on particles</li>
              <li>Per-particle shimmer at higher elevations</li>
              <li>Distance-based fog dissolve</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5">
          <a
            href="https://x.com/taylor_sntx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/15 text-[10px] hover:text-white/35 transition-colors"
          >
            Inspired by @taylor_sntx
          </a>
        </div>
      </div>
    </div>
  );
}

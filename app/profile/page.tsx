'use client';

import Link from 'next/link';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#010108] flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md mb-8">
        <Link
          href="/"
          className="text-white/30 text-xs hover:text-white/60 transition-colors"
        >
          &larr; Back
        </Link>
      </div>

      <div className="w-full max-w-md border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/30 text-2xl font-light">
            O
          </div>
          <div>
            <h1 className="text-white/70 text-lg font-medium">Observer</h1>
            <p className="text-white/25 text-xs">Particle Gazer</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-white/8 rounded p-3 text-center">
            <p className="text-white/50 text-lg font-medium">1M</p>
            <p className="text-white/20 text-[10px] uppercase tracking-wider">Particles</p>
          </div>
          <div className="border border-white/8 rounded p-3 text-center">
            <p className="text-white/50 text-lg font-medium">4</p>
            <p className="text-white/20 text-[10px] uppercase tracking-wider">Octaves</p>
          </div>
          <div className="border border-white/8 rounded p-3 text-center">
            <p className="text-white/50 text-lg font-medium">GLSL</p>
            <p className="text-white/20 text-[10px] uppercase tracking-wider">Shaders</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-white/25 text-xs">Grid</span>
            <span className="text-white/40 text-xs">1000 x 1000</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-white/25 text-xs">Blending</span>
            <span className="text-white/40 text-xs">Additive</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-white/25 text-xs">Features</span>
            <span className="text-white/40 text-xs">Mountains, Trench, Hills</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-white/25 text-xs">Palette</span>
            <span className="text-white/40 text-xs">Deep Blue to White</span>
          </div>
        </div>
      </div>
    </div>
  );
}

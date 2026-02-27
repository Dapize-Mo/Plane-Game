'use client';

import Link from 'next/link';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#010102] flex flex-col items-center px-4 py-12">
      {/* Back navigation */}
      <div className="w-full max-w-md mb-8">
        <Link
          href="/"
          className="text-white/30 text-xs hover:text-white/60 transition-colors"
        >
          &larr; Back to Terrain
        </Link>
      </div>

      {/* Profile card */}
      <div className="w-full max-w-md border border-white/10 rounded-lg p-6">
        {/* Avatar and name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-2xl font-light">
            P
          </div>
          <div>
            <h1 className="text-white/80 text-lg font-medium">Pilot</h1>
            <p className="text-white/30 text-xs">Explorer</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-white/10 rounded p-3 text-center">
            <p className="text-white/60 text-lg font-medium">0</p>
            <p className="text-white/25 text-[10px] uppercase tracking-wider">Flights</p>
          </div>
          <div className="border border-white/10 rounded p-3 text-center">
            <p className="text-white/60 text-lg font-medium">0</p>
            <p className="text-white/25 text-[10px] uppercase tracking-wider">Distance</p>
          </div>
          <div className="border border-white/10 rounded p-3 text-center">
            <p className="text-white/60 text-lg font-medium">0</p>
            <p className="text-white/25 text-[10px] uppercase tracking-wider">Max Alt</p>
          </div>
        </div>

        {/* Info section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-white/30 text-xs">Rank</span>
            <span className="text-white/50 text-xs">Novice</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-white/30 text-xs">Terrain Explored</span>
            <span className="text-white/50 text-xs">0%</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-white/30 text-xs">Worlds Visited</span>
            <span className="text-white/50 text-xs">1</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-white/30 text-xs">Joined</span>
            <span className="text-white/50 text-xs">Today</span>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="w-full max-w-md mt-6 border border-white/10 rounded-lg p-6">
        <h2 className="text-white/40 text-xs font-medium tracking-[0.2em] uppercase mb-4">
          Achievements
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-white/20 text-sm">
              ?
            </div>
            <div>
              <p className="text-white/40 text-xs">First Flight</p>
              <p className="text-white/15 text-[10px]">Take to the skies for the first time</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-white/20 text-sm">
              ?
            </div>
            <div>
              <p className="text-white/40 text-xs">Peak Explorer</p>
              <p className="text-white/15 text-[10px]">Fly over the mountain range</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-white/20 text-sm">
              ?
            </div>
            <div>
              <p className="text-white/40 text-xs">Into the Abyss</p>
              <p className="text-white/15 text-[10px]">Descend into the trench</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

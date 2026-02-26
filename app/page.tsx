'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const ParticleBackground = dynamic(
  () => import('@/components/landing/ParticleBackground'),
  { ssr: false }
);

export default function HomePage() {
  const router = useRouter();
  const [zooming, setZooming] = useState(false);

  const handlePlay = useCallback(() => {
    setZooming(true);
    setTimeout(() => router.push('/game'), 700);
  }, [router]);

  return (
    <div className="relative w-full h-screen bg-[#0a0a0a] overflow-hidden select-none">
      <ParticleBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase">
          v0.1 Alpha
        </div>
        <button className="w-9 h-9 rounded-full border border-neutral-700 flex items-center justify-center hover:border-neutral-500 transition-colors">
          <svg
            className="w-4 h-4 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center h-[calc(100vh-140px)]">
        {/* Title */}
        <h1
          className={`text-5xl md:text-7xl font-bold tracking-[0.2em] text-white mb-2 transition-all duration-700 ${
            zooming ? 'opacity-0 -translate-y-10' : ''
          }`}
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          PARTICLE
          <span className="block text-neutral-500 text-3xl md:text-5xl tracking-[0.4em]">
            FLIGHT
          </span>
        </h1>

        {/* Game Preview / Play Button */}
        <div
          className={`game-preview-container mt-8 cursor-pointer group ${
            zooming ? 'zooming' : ''
          }`}
          onClick={handlePlay}
        >
          <div className="relative w-72 h-44 md:w-96 md:h-56 rounded-lg border border-neutral-800 overflow-hidden bg-[#000811]/80 backdrop-blur-sm">
            {/* Animated preview particles */}
            <div className="absolute inset-0 opacity-40 group-hover:opacity-70 transition-opacity duration-500">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    left: `${(i * 17.3) % 100}%`,
                    top: `${(i * 23.7) % 100}%`,
                    backgroundColor:
                      i % 5 === 0
                        ? '#3388ff'
                        : i % 3 === 0
                        ? '#888888'
                        : '#22cc55',
                    opacity: 0.3 + (i % 4) * 0.15,
                    animation: `float ${2 + (i % 3)}s ease-in-out ${
                      (i * 0.2) % 2
                    }s infinite alternate`,
                  }}
                />
              ))}
            </div>

            {/* Play text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-neutral-500 group-hover:text-neutral-300 transition-colors text-sm tracking-[0.3em] uppercase">
                [ Click to Fly ]
              </div>
            </div>

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-neutral-600" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-neutral-600" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-neutral-600" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-neutral-600" />
          </div>
        </div>

        {/* Subtitle */}
        <p
          className={`mt-6 text-neutral-600 text-xs tracking-[0.2em] uppercase transition-all duration-500 ${
            zooming ? 'opacity-0' : ''
          }`}
        >
          A world made of particles
        </p>
      </main>

      {/* Footer */}
      <footer
        className={`absolute bottom-0 left-0 right-0 z-10 px-6 py-4 flex items-center justify-between text-xs text-neutral-600 transition-opacity duration-500 ${
          zooming ? 'opacity-0' : ''
        }`}
      >
        <div className="flex gap-6">
          <a
            href="/admin"
            className="hover:text-neutral-400 transition-colors tracking-wider uppercase"
          >
            Admin
          </a>
          <span className="text-neutral-800">|</span>
          <span className="tracking-wider uppercase">Settings</span>
        </div>
        <div className="tracking-wider">
          Particle Flight &copy; 2025
        </div>
      </footer>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          from {
            transform: translateY(0px) scale(1);
          }
          to {
            transform: translateY(-8px) scale(1.3);
          }
        }
      `}</style>

      {/* Full-screen flash overlay during zoom transition */}
      {zooming && (
        <div
          className="fixed inset-0 z-50 bg-[#000811] pointer-events-none"
          style={{
            animation: 'fadeIn 0.6s ease-in 0.3s forwards',
            opacity: 0,
          }}
        />
      )}
      <style jsx>{`
        @keyframes fadeIn {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

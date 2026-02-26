'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const GameScene = dynamic(() => import('@/components/game/GameScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-[#000811] flex flex-col items-center justify-center">
      <div className="text-green-400 text-xl animate-pulse" style={{ fontFamily: "'Courier New', monospace", textShadow: '0 0 10px rgba(0,255,100,0.5)' }}>
        LOADING PARTICLE WORLD...
      </div>
      <div className="mt-4 w-48 h-1 bg-green-900/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full"
          style={{
            animation: 'loading 1.5s ease-in-out infinite',
            width: '30%',
          }}
        />
      </div>
      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  ),
});

export default function GamePage() {
  const router = useRouter();

  return (
    <div className="relative w-full h-screen">
      <GameScene />

      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 z-50 text-green-400/30 hover:text-green-400/70 transition-colors text-xs tracking-widest uppercase"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        [ESC] Exit
      </button>
    </div>
  );
}

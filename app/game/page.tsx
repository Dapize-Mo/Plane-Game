'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const Game = dynamic(() => import('@/components/game/Game'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-[#010102] flex items-center justify-center">
      <div className="text-white/20 text-[11px] tracking-[0.4em] uppercase animate-pulse">
        Loading...
      </div>
    </div>
  ),
});

export default function GamePage() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return <Game />;
}

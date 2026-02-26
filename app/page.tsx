import Link from 'next/link';

export default function Home() {
  return (
    <div className="h-screen bg-[#010102] flex flex-col items-center justify-center">
      <h1 className="text-white/20 text-[11px] tracking-[0.5em] uppercase mb-16">
        Particle Flight
      </h1>

      <Link
        href="/game"
        className="group relative px-12 py-4 border border-white/10 hover:border-white/25 transition-all duration-500"
      >
        <span className="text-white/40 group-hover:text-white/70 text-xs tracking-[0.3em] uppercase transition-colors duration-500">
          Fly
        </span>
      </Link>

      <p className="text-white/10 text-[10px] tracking-wider mt-16">
        2 Runways &middot; Monochrome World &middot; 250k Particles
      </p>

      <div className="absolute bottom-6 text-white/[0.08] text-[9px] tracking-wider">
        W/S Throttle &middot; Arrows Pitch/Roll &middot; A/D Yaw &middot;
        Space Brake
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';

const stats = [
  { value: '5', label: 'Worlds' },
  { value: '3.1M', label: 'Particles' },
  { value: 'GLSL', label: 'Shaders' },
];

const details = [
  { key: 'Blending',    value: 'Additive' },
  { key: 'Noise',       value: 'Simplex 4-octave FBM' },
  { key: 'Themes',      value: '6 color palettes' },
  { key: 'Terrain',     value: 'Mountains, trench, hills' },
  { key: 'Ocean',       value: 'Waves, island peak, seafloor' },
  { key: 'Ball',        value: 'Sphere, inner shell, rings' },
  { key: 'Galaxy',      value: '4-arm spiral + bulge + halo' },
  { key: 'Vortex',      value: 'Funnel, debris, streamers' },
];

const scenes = [
  {
    num: '01',
    title: 'Terrain',
    desc: 'Mountain range with deep trench and rolling hills. 4-octave FBM noise sculpts the landscape.',
  },
  {
    num: '02',
    title: 'Ocean',
    desc: 'Island mountain rising from an animated ocean. Waves roll across a million water particles.',
  },
  {
    num: '03',
    title: 'Ball',
    desc: 'Glowing particle sphere with electric arc shimmer, inner shell, and three tilted orbital rings.',
  },
  {
    num: '04',
    title: 'Galaxy',
    desc: '4-arm logarithmic spiral galaxy with dense core bulge, differential rotation, and sparse halo.',
  },
  {
    num: '05',
    title: 'Vortex',
    desc: 'Funnel-shaped vortex with upward particle drift, orbiting debris field, and lightning streamers.',
  },
];

export default function ProfilePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#010108', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px' }}>
      {/* Back link */}
      <div style={{ width: '100%', maxWidth: 480, marginBottom: 32 }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecoration: 'none' }}>
          &larr; Back
        </Link>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 480,
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
        padding: 28, background: 'rgba(255,255,255,0.02)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.25)', fontSize: 24, fontWeight: 300,
          }}>
            O
          </div>
          <div>
            <h1 style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 500, margin: 0 }}>Observer</h1>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Particle Gazer</p>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6,
              padding: '14px 8px', textAlign: 'center',
              background: 'rgba(255,255,255,0.015)',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: 500, margin: 0 }}>{s.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Details list */}
        <div>
          {details.map((d, i) => (
            <div key={d.key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < details.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>{d.key}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scenes preview grid */}
      <div style={{
        width: '100%', maxWidth: 480, marginTop: 20,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        {scenes.map(s => (
          <div key={s.num} style={{
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
            padding: 16, background: 'rgba(255,255,255,0.015)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Scene {s.num}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 500 }}>{s.title}</p>
            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, marginTop: 6, lineHeight: 1.5 }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

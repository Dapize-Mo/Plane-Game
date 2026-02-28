'use client';

import Link from 'next/link';

const sectionStyle = {
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8,
  padding: 20,
  background: 'rgba(255,255,255,0.015)',
  marginBottom: 16,
};

const headingStyle = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: 10,
  fontWeight: 500 as const,
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  marginBottom: 12,
};

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '6px 0',
  fontSize: 12,
};

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#010108', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px' }}>
      {/* Back link */}
      <div style={{ width: '100%', maxWidth: 520, marginBottom: 32 }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecoration: 'none' }}>
          &larr; Back
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: 520 }}>
        <h1 style={{
          color: 'rgba(255,255,255,0.45)', fontSize: 18, fontWeight: 500,
          letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          About
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, lineHeight: 1.7, marginBottom: 28 }}>
          Particle Thing is a collection of procedural particle landscapes. Each world is built from 1,000,000
          glowing particles shaped by layered simplex noise, rendered with custom GLSL shaders and additive blending.
        </p>

        {/* Scenes */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Worlds</h2>
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Terrain</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, lineHeight: 1.6 }}>
              A sweeping landscape with a central mountain range, a deep sinusoidal trench, and rolling noise-driven hills.
              Particles breathe vertically and shimmer at elevation.
            </p>
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Ocean</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, lineHeight: 1.6 }}>
              An island mountain rises from an animated ocean. Water particles undulate with layered sine waves while
              the mountain peak uses Gaussian falloff with angular noise for an organic silhouette. A secondary smaller
              peak adds depth.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Controls</h2>
          {[
            ['Rotate', 'Left Click + Drag'],
            ['Pan', 'Right Click + Drag'],
            ['Zoom', 'Scroll Wheel'],
          ].map(([action, input]) => (
            <div key={action} style={rowStyle}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>{action}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>{input}</span>
            </div>
          ))}
        </div>

        {/* Keyboard shortcuts */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Keyboard Shortcuts</h2>
          {[
            ['T', 'Cycle color theme'],
            ['R', 'Reset to default settings'],
            ['Space', 'Toggle auto-rotation'],
            ['F', 'Toggle FPS counter'],
            ['Tab', 'Switch between worlds'],
          ].map(([key, desc]) => (
            <div key={key} style={rowStyle}>
              <span style={{
                color: 'rgba(255,255,255,0.35)', fontSize: 11,
                background: 'rgba(255,255,255,0.06)', padding: '2px 8px',
                borderRadius: 3, fontFamily: 'monospace',
              }}>{key}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Tech */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Tech Stack</h2>
          {[
            ['Framework', 'Next.js 14'],
            ['3D', 'Three.js'],
            ['Shaders', 'Custom GLSL (vertex + fragment)'],
            ['Noise', 'Simplex 4-octave FBM'],
            ['Blending', 'Additive'],
            ['Language', 'TypeScript'],
          ].map(([key, val]) => (
            <div key={key} style={rowStyle}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>{key}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Visual effects */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Visual Effects</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            {[
              'Soft circular particles',
              'Inner glow at center',
              'Additive luminous blending',
              'Height-based color gradients',
              'Particle breathing animation',
              'Per-particle shimmer',
              'Distance fog dissolve',
              'Ocean wave simulation',
              'Water specular highlights',
              'Gaussian mountain peaks',
              '6 real-time color themes',
              'Settings persistence',
            ].map(effect => (
              <p key={effect} style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, padding: '3px 0' }}>
                {effect}
              </p>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <a
            href="https://x.com/taylor_sntx"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, textDecoration: 'none' }}
          >
            Inspired by @taylor_sntx
          </a>
        </div>
      </div>
    </div>
  );
}

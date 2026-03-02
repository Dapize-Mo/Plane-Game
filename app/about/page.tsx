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
          Particle Thing is a collection of five procedural particle worlds, each built with custom GLSL shaders,
          additive blending, and real-time animation. Switch between them with Tab or the buttons at the bottom.
        </p>

        {/* Worlds */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Worlds</h2>

          {[
            {
              title: 'Terrain',
              body: 'A sweeping landscape with a central mountain range, a deep sinusoidal trench, and rolling noise-driven hills. Particles breathe vertically and shimmer at elevation. Built from a 1000×1000 Fibonacci grid with 4-octave simplex FBM.',
            },
            {
              title: 'Ocean',
              body: 'An island mountain rises from an animated ocean. Water particles undulate with three layered sine waves while the mountain peak uses Gaussian falloff with angular noise. A secondary smaller peak adds depth.',
            },
            {
              title: 'Ball',
              body: 'A glowing particle sphere: 180k particles on a Fibonacci surface lattice, 60k in an inner shell, and 30k spread across three tilted orbital rings. The surface pulses with radial breathing; electric arc shimmer races across the face; the rings precess slowly.',
            },
            {
              title: 'Galaxy',
              body: 'A 4-arm logarithmic spiral galaxy with 480k arm particles distributed in log-density (denser near center), 80k in a flattened core bulge, and 50k sparse halo stars. Arms rotate with differential speed — inner faster than outer.',
            },
            {
              title: 'Vortex',
              body: 'A funnel-shaped vortex with 150k spiral particles that drift upward and accelerate as they ascend, 80k debris particles flung outward in slow orbits, and 20k white-hot lightning streamers that flicker along the central axis.',
            },
          ].map(({ title, body }, i, arr) => (
            <div key={title} style={{ marginBottom: i < arr.length - 1 ? 16 : 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{title}</p>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
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
            ['Tab', 'Next world'],
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
              'Electric arc surface shimmer',
              'Tilted orbital ring precession',
              'Differential galaxy rotation',
              'Rare bright star flash',
              'Vortex upward drift loop',
              'Lightning streamer flicker',
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

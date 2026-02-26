'use client';

import { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const particles: Particle[] = [];
    let mouseX = -1;
    let mouseY = -1;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const count = Math.min(300, Math.floor((canvas.width * canvas.height) / 5000));
    for (let i = 0; i < count; i++) {
      const baseAlpha = Math.random() * 0.3 + 0.05;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: Math.random() * 0.8 + 0.2,
        size: Math.random() * 2 + 0.5,
        alpha: baseAlpha,
        baseAlpha,
      });
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', onMouseMove);

    let animId: number;
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Mouse interaction
        if (mouseX >= 0) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const force = (1 - dist / 100) * 0.5;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
            p.alpha = Math.min(0.6, p.baseAlpha + (1 - dist / 100) * 0.3);
          } else {
            p.alpha += (p.baseAlpha - p.alpha) * 0.02;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        // Damping
        p.vx *= 0.99;
        p.vy = p.vy * 0.99 + 0.1;

        // Wrap around
        if (p.y > canvas.height + 10) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
          p.vy = Math.random() * 0.8 + 0.2;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160, 160, 170, ${p.alpha})`;
        ctx.fill();

        // Glow effect for brighter particles
        if (p.alpha > 0.15) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(160, 160, 170, ${p.alpha * 0.15})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

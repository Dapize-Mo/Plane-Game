// Value noise with fractal Brownian motion for terrain generation

function hash2d(ix: number, iy: number): number {
  let h = (ix * 374761393 + iy * 668265263) | 0;
  h = (((h >> 13) ^ h) * 1274126177) | 0;
  h = ((h >> 16) ^ h) | 0;
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function noise2d(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const sx = smoothstep(fx);
  const sy = smoothstep(fy);

  const n00 = hash2d(ix, iy);
  const n10 = hash2d(ix + 1, iy);
  const n01 = hash2d(ix, iy + 1);
  const n11 = hash2d(ix + 1, iy + 1);

  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
}

export function fbm(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2d(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}

// Ridged noise for mountain ridges
export function ridgedNoise(x: number, y: number, octaves: number = 3): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    let n = noise2d(x * frequency, y * frequency);
    n = 1 - Math.abs(n * 2 - 1); // Ridge
    value += amplitude * n * n;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}

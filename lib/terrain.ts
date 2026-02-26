// Terrain generation using noise functions

import { fbm, ridgedNoise } from './noise';
import { airports, isOnRunway, isRunwayEdge } from './airports';
import { worldConfig } from './world-config';

const { terrainScale, terrainAmplitude, seaLevel } = worldConfig;

// Get terrain height at a world coordinate
export function getTerrainHeight(x: number, z: number): number {
  // Base terrain from fractal noise
  let height = fbm(x * terrainScale, z * terrainScale, 4) * terrainAmplitude - 20;

  // Add ridged mountains for visual interest
  const ridge = ridgedNoise(
    x * terrainScale * 0.5 + 3.7,
    z * terrainScale * 0.5 + 7.1,
    3
  );
  height += ridge * 30 * Math.max(0, fbm(x * terrainScale * 0.3, z * terrainScale * 0.3, 2) - 0.3);

  // Ensure land near airports
  for (const airport of airports) {
    const dx = x - airport.position[0];
    const dz = z - airport.position[1];
    const dist = Math.sqrt(dx * dx + dz * dz);
    const landRadius = 350;

    if (dist < landRadius) {
      const influence = 1 - dist / landRadius;
      const landHeight = airport.elevation + 5;
      height = Math.max(height, influence * influence * landHeight);
    }
  }

  // Flatten near airports for runways
  for (const airport of airports) {
    const dx = x - airport.position[0];
    const dz = z - airport.position[1];
    const dist = Math.sqrt(dx * dx + dz * dz);
    const flatRadius = Math.max(airport.runwayLength, airport.runwayWidth) * 0.7;
    const blendRadius = flatRadius * 2;

    if (dist < blendRadius) {
      const t = Math.max(0, (dist - flatRadius) / (blendRadius - flatRadius));
      const blend = t * t * (3 - 2 * t); // smoothstep
      height = height * blend + airport.elevation * (1 - blend);
    }
  }

  return height;
}

// Get the visual height for rendering (water at sea level)
export function getVisualHeight(x: number, z: number): number {
  const h = getTerrainHeight(x, z);
  return h < seaLevel ? seaLevel - 0.5 : h;
}

// Get terrain color as [r, g, b] based on height and features
// Colors are vivid for additive blending on dark background
export function getTerrainColor(
  x: number,
  z: number,
  height: number
): [number, number, number] {
  // Check for runway
  if (isOnRunway(x, z)) {
    return [0.6, 0.6, 0.65]; // Bright grey runway
  }

  // Check for runway edge lights
  if (isRunwayEdge(x, z)) {
    return [1.0, 0.85, 0.2]; // Amber lights
  }

  // Water - blue dots at sea level
  if (height < seaLevel) {
    const depth = Math.min(1, (seaLevel - height) / 30);
    return [
      0.05 + (1 - depth) * 0.1,
      0.2 + (1 - depth) * 0.3,
      0.6 + (1 - depth) * 0.35,
    ];
  }

  // Land - gradient from green lowland to grey/white mountains
  const normalizedHeight = Math.min(1, Math.max(0, height / terrainAmplitude));

  if (normalizedHeight > 0.7) {
    // Mountain/snow - white-grey dots
    const t = (normalizedHeight - 0.7) / 0.3;
    return [0.5 + t * 0.4, 0.55 + t * 0.35, 0.5 + t * 0.4];
  }

  if (normalizedHeight > 0.4) {
    // Forest/highland - darker green dots
    const t = (normalizedHeight - 0.4) / 0.3;
    return [0.08 + t * 0.2, 0.5 - t * 0.05, 0.15 + t * 0.15];
  }

  // Lowland grass - bright green dots
  return [0.1, 0.65, 0.2];
}

// Quick check if a position is water
export function isWater(x: number, z: number): boolean {
  return getTerrainHeight(x, z) < seaLevel;
}

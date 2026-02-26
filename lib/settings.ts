// Game settings - modifiable from admin panel, persisted to localStorage

export interface GameSettings {
  // World
  worldRadius: number;
  sphericalWorld: boolean; // Wrap-around world (fly straight → return to start)
  terrainAmplitude: number;
  seaLevel: number;

  // Rendering
  particleSpacing: number;
  renderDistance: number;
  fogDistance: number;
  particleSize: number;

  // Gameplay
  fuelEnabled: boolean; // Beta feature
  fuelCapacity: number; // Max fuel
  fuelConsumptionRate: number; // Fuel per second at full throttle
  fuelRegenOnGround: boolean; // Refuel when on ground at airport

  // Camera
  cameraDistance: number;
  cameraHeight: number;
  cameraSmoothness: number;
}

export const defaultSettings: GameSettings = {
  worldRadius: 1500,
  sphericalWorld: true,
  terrainAmplitude: 80,
  seaLevel: 0,

  particleSpacing: 8,
  renderDistance: 500,
  fogDistance: 600,
  particleSize: 4.0,

  fuelEnabled: false,
  fuelCapacity: 100,
  fuelConsumptionRate: 2,
  fuelRegenOnGround: true,

  cameraDistance: 22,
  cameraHeight: 6,
  cameraSmoothness: 0.04,
};

const STORAGE_KEY = 'particle-flight-settings';

export function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...defaultSettings };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultSettings, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }

  return { ...defaultSettings };
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function resetSettings(): GameSettings {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { ...defaultSettings };
}

// Plane definitions - add new planes here to expand the fleet

export interface PlaneConfig {
  id: string;
  name: string;
  // Performance
  maxSpeed: number;
  acceleration: number;
  liftoffSpeed: number; // Speed needed to take off
  // Control rates (radians/second)
  pitchRate: number;
  rollRate: number;
  yawRate: number;
  // Aerodynamics
  dragCoefficient: number;
  liftMultiplier: number;
  stallAngle: number; // Max pitch angle in radians
  // Ground handling
  groundDrag: number;
  brakeForce: number;
  // Visual
  color: string;
  engineColor: string;
  scale: number;
}

// ============================================================
// MODULAR PLANE REGISTRY
// To add a new plane, just add an entry to this record.
// ============================================================
export const planes: Record<string, PlaneConfig> = {
  cessna: {
    id: 'cessna',
    name: 'Cessna 172 Skyhawk',
    maxSpeed: 160,
    acceleration: 35,
    liftoffSpeed: 30,
    pitchRate: 1.8,
    rollRate: 2.5,
    yawRate: 1.0,
    dragCoefficient: 0.015,
    liftMultiplier: 1.4,
    stallAngle: Math.PI / 2.5,
    groundDrag: 0.04,
    brakeForce: 40,
    color: '#e8e8e8',
    engineColor: '#ff6600',
    scale: 1.0,
  },
};

// Get a plane config by id (defaults to cessna)
export function getPlane(id: string = 'cessna'): PlaneConfig {
  return planes[id] || planes.cessna;
}

// List all available planes
export function getPlaneList(): PlaneConfig[] {
  return Object.values(planes);
}

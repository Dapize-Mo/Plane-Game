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
    maxSpeed: 140,
    acceleration: 25,
    liftoffSpeed: 35,
    pitchRate: 1.5,
    rollRate: 2.0,
    yawRate: 0.8,
    dragCoefficient: 0.02,
    liftMultiplier: 1.2,
    stallAngle: Math.PI / 3,
    groundDrag: 0.05,
    brakeForce: 30,
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

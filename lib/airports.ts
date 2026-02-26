// Airport definitions - add new airports here to expand the world

export interface Airport {
  id: string;
  name: string;
  position: [number, number]; // [x, z] world coordinates
  heading: number; // runway heading in radians (0 = north/south)
  runwayLength: number;
  runwayWidth: number;
  elevation: number;
  // Taxiway and apron areas
  apronOffset?: [number, number]; // offset from runway center
  apronSize?: [number, number]; // width, depth
}

// ============================================================
// MODULAR AIRPORT REGISTRY
// To add a new airport, just add an entry to this array.
// The terrain will automatically flatten around it.
// ============================================================
export const airports: Airport[] = [
  {
    id: 'KPRT',
    name: 'Central Particle International',
    position: [0, 0],
    heading: 0, // North-South runway
    runwayLength: 250,
    runwayWidth: 22,
    elevation: 8,
    apronOffset: [40, 0],
    apronSize: [30, 50],
  },
  {
    id: 'KNWP',
    name: 'Northwest Point Regional',
    position: [-600, -500],
    heading: Math.PI / 4, // Northeast-Southwest
    runwayLength: 180,
    runwayWidth: 18,
    elevation: 15,
    apronOffset: [30, -20],
    apronSize: [25, 40],
  },
  {
    id: 'KSEA',
    name: 'Southeast Archipelago Field',
    position: [500, 450],
    heading: Math.PI / 2, // East-West
    runwayLength: 200,
    runwayWidth: 20,
    elevation: 5,
    apronOffset: [-10, 35],
    apronSize: [35, 30],
  },
];

// Check if a world coordinate is on any runway
export function isOnRunway(x: number, z: number): boolean {
  for (const airport of airports) {
    if (isPointOnRunway(x, z, airport)) return true;
    if (airport.apronOffset && airport.apronSize) {
      if (isPointOnApron(x, z, airport)) return true;
    }
  }
  return false;
}

function isPointOnRunway(x: number, z: number, airport: Airport): boolean {
  const dx = x - airport.position[0];
  const dz = z - airport.position[1];
  const cos = Math.cos(-airport.heading);
  const sin = Math.sin(-airport.heading);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;

  return (
    Math.abs(localX) < airport.runwayWidth / 2 &&
    Math.abs(localZ) < airport.runwayLength / 2
  );
}

function isPointOnApron(x: number, z: number, airport: Airport): boolean {
  if (!airport.apronOffset || !airport.apronSize) return false;

  const apronCenterX = airport.position[0] + airport.apronOffset[0];
  const apronCenterZ = airport.position[1] + airport.apronOffset[1];

  return (
    Math.abs(x - apronCenterX) < airport.apronSize[0] / 2 &&
    Math.abs(z - apronCenterZ) < airport.apronSize[1] / 2
  );
}

// Check if near runway edge (for runway lights)
export function isRunwayEdge(x: number, z: number): boolean {
  for (const airport of airports) {
    const dx = x - airport.position[0];
    const dz = z - airport.position[1];
    const cos = Math.cos(-airport.heading);
    const sin = Math.sin(-airport.heading);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;

    const onEdge =
      Math.abs(localZ) < airport.runwayLength / 2 &&
      Math.abs(Math.abs(localX) - airport.runwayWidth / 2) < 3;

    if (onEdge) return true;
  }
  return false;
}

// Get the nearest airport to a position
export function getNearestAirport(x: number, z: number): Airport {
  let nearest = airports[0];
  let minDist = Infinity;

  for (const airport of airports) {
    const dx = x - airport.position[0];
    const dz = z - airport.position[1];
    const dist = dx * dx + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      nearest = airport;
    }
  }

  return nearest;
}

// Get spawn position for a given airport
export function getSpawnPosition(airport: Airport): {
  x: number;
  y: number;
  z: number;
  heading: number;
} {
  const sin = Math.sin(airport.heading);
  const cos = Math.cos(airport.heading);
  return {
    x: airport.position[0] - sin * airport.runwayLength * 0.35,
    y: airport.elevation + 2,
    z: airport.position[1] - cos * airport.runwayLength * 0.35,
    heading: airport.heading,
  };
}

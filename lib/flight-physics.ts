// Flight physics engine

import { PlaneConfig } from './planes';
import { getTerrainHeight } from './terrain';
import { worldConfig } from './world-config';
import { GameSettings, defaultSettings } from './settings';
import { isOnRunway } from './airports';

export interface FlightState {
  // Position and movement
  posX: number;
  posY: number;
  posZ: number;
  velX: number;
  velY: number;
  velZ: number;
  // Rotation (radians)
  pitch: number; // nose up/down
  yaw: number; // heading
  roll: number; // banking
  // Engine
  speed: number;
  throttle: number; // 0-1
  // State
  isGrounded: boolean;
  altitude: number;
  agl: number; // above ground level
  // Fuel (beta)
  fuel: number;
  fuelEmpty: boolean;
}

export interface InputState {
  throttleUp: boolean;
  throttleDown: boolean;
  pitchUp: boolean;
  pitchDown: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  yawLeft: boolean;
  yawRight: boolean;
  brake: boolean;
  // Analog inputs (gamepad)
  analogPitch: number; // -1 to 1
  analogRoll: number; // -1 to 1
  analogYaw: number; // -1 to 1
  analogThrottle: number; // -1 to 1
}

export function createInitialState(
  x: number,
  y: number,
  z: number,
  heading: number,
  fuelCapacity: number = 100
): FlightState {
  return {
    posX: x,
    posY: y,
    posZ: z,
    velX: 0,
    velY: 0,
    velZ: 0,
    pitch: 0,
    yaw: heading,
    roll: 0,
    speed: 0,
    throttle: 0,
    isGrounded: true,
    altitude: y,
    agl: 2,
    fuel: fuelCapacity,
    fuelEmpty: false,
  };
}

export function updateFlightPhysics(
  state: FlightState,
  input: InputState,
  plane: PlaneConfig,
  dt: number,
  settings: GameSettings = defaultSettings
): FlightState {
  // Clamp dt to avoid physics explosions
  dt = Math.min(dt, 0.05);

  const next = { ...state };

  // --- Fuel system (beta) ---
  if (settings.fuelEnabled) {
    // Consume fuel based on throttle
    if (next.throttle > 0 && next.fuel > 0) {
      next.fuel -= settings.fuelConsumptionRate * next.throttle * dt;
      next.fuel = Math.max(0, next.fuel);
    }

    // Refuel on ground at airport
    if (settings.fuelRegenOnGround && next.isGrounded && isOnRunway(next.posX, next.posZ)) {
      next.fuel = Math.min(settings.fuelCapacity, next.fuel + 10 * dt);
    }

    next.fuelEmpty = next.fuel <= 0;

    // If out of fuel, can't throttle up
    if (next.fuelEmpty) {
      next.throttle = Math.max(0, next.throttle - 0.3 * dt);
    }
  }

  // --- Throttle ---
  const throttleRate = 0.5; // Faster throttle response
  if (!next.fuelEmpty) {
    if (input.throttleUp || input.analogThrottle > 0.1) {
      const amount = input.analogThrottle > 0.1 ? input.analogThrottle : 1;
      next.throttle = Math.min(1, next.throttle + throttleRate * amount * dt);
    }
  }
  if (input.throttleDown || input.analogThrottle < -0.1) {
    const amount = input.analogThrottle < -0.1 ? -input.analogThrottle : 1;
    next.throttle = Math.max(0, next.throttle - throttleRate * amount * dt);
  }

  // --- Rotation ---
  let pitchInput = 0;
  let rollInput = 0;
  let yawInput = 0;

  // Digital inputs
  if (input.pitchUp) pitchInput -= 1;
  if (input.pitchDown) pitchInput += 1;
  if (input.rollLeft) rollInput += 1;
  if (input.rollRight) rollInput -= 1;
  if (input.yawLeft) yawInput += 1;
  if (input.yawRight) yawInput -= 1;

  // Analog inputs override digital
  if (Math.abs(input.analogPitch) > 0.1) pitchInput = -input.analogPitch;
  if (Math.abs(input.analogRoll) > 0.1) rollInput = -input.analogRoll;
  if (Math.abs(input.analogYaw) > 0.1) yawInput = input.analogYaw;

  if (next.isGrounded) {
    // On ground: limited controls, yaw steers
    next.yaw += yawInput * plane.yawRate * 0.5 * dt;
    // Only allow pitch up for takeoff
    if (pitchInput < 0 && next.speed > plane.liftoffSpeed * 0.7) {
      next.pitch += pitchInput * plane.pitchRate * 0.5 * dt;
    }
    next.roll *= 0.9; // Auto-level roll on ground
    next.pitch = Math.max(-0.15, Math.min(0.05, next.pitch));
  } else {
    // In air: full controls
    next.pitch += pitchInput * plane.pitchRate * dt;
    next.roll += rollInput * plane.rollRate * dt;
    next.yaw += yawInput * plane.yawRate * dt;

    // Banking turn: roll causes yaw
    next.yaw += Math.sin(next.roll) * 0.8 * dt;

    // Clamp pitch
    next.pitch = Math.max(-plane.stallAngle, Math.min(plane.stallAngle, next.pitch));

    // Auto-level roll gently
    next.roll *= 0.995;
  }

  // --- Speed and thrust ---
  const targetSpeed = next.throttle * plane.maxSpeed;
  const speedDiff = targetSpeed - next.speed;
  next.speed += speedDiff * (plane.acceleration / plane.maxSpeed) * dt;

  // Drag
  const drag = next.isGrounded ? plane.groundDrag : plane.dragCoefficient;
  next.speed *= 1 - drag * dt;

  // Braking on ground
  if (input.brake && next.isGrounded) {
    next.speed *= 1 - plane.brakeForce * dt * 0.01;
    next.speed = Math.max(0, next.speed);
  }

  // Ensure speed doesn't go negative
  next.speed = Math.max(0, next.speed);

  // --- Forward vector from rotation ---
  const cosPitch = Math.cos(next.pitch);
  const sinPitch = Math.sin(next.pitch);
  const cosYaw = Math.cos(next.yaw);
  const sinYaw = Math.sin(next.yaw);

  const forwardX = -sinYaw * cosPitch;
  const forwardY = -sinPitch;
  const forwardZ = -cosYaw * cosPitch;

  // --- Velocity ---
  next.velX = forwardX * next.speed;
  next.velY = forwardY * next.speed;
  next.velZ = forwardZ * next.speed;

  // --- Gravity and lift ---
  const liftFactor = Math.min(1, (next.speed / plane.liftoffSpeed) * plane.liftMultiplier);
  const gravityEffect = worldConfig.gravity * (1 - liftFactor * liftFactor);

  if (!next.isGrounded) {
    next.velY -= gravityEffect * dt;
  }

  // --- Update position ---
  next.posX += next.velX * dt;
  next.posY += next.velY * dt;
  next.posZ += next.velZ * dt;

  // --- Spherical world wrapping ---
  if (settings.sphericalWorld) {
    const r = settings.worldRadius;
    if (next.posX > r) next.posX -= r * 2;
    if (next.posX < -r) next.posX += r * 2;
    if (next.posZ > r) next.posZ -= r * 2;
    if (next.posZ < -r) next.posZ += r * 2;
  }

  // --- Ground collision ---
  const groundHeight = getTerrainHeight(next.posX, next.posZ);
  next.altitude = next.posY;
  next.agl = next.posY - groundHeight;

  if (next.posY <= groundHeight + 1.5) {
    next.posY = groundHeight + 1.5;
    next.velY = Math.max(0, next.velY);
    next.isGrounded = true;
    next.agl = 1.5;

    // Crash detection: hitting ground too fast
    if (state.velY < -20 && !state.isGrounded) {
      // Hard landing - slow down significantly
      next.speed *= 0.3;
    }
  } else {
    // Takeoff detection
    if (next.agl > 3) {
      next.isGrounded = false;
    }
  }

  return next;
}

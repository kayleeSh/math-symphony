// GLSL mirror of src/math/generators/*.ts — see those files for the derivation
// and comments. Kept structurally identical (same constants, same formulas) so
// the CPU (unit-tested) and GPU (100k-particle) versions describe the same math.

uniform float uOrbitRadius;
uniform float uLayerHeight;
uniform float uSpiralPosition;
uniform float uAngularVelocity;
uniform float uOscillationFrequency;
uniform float uPhaseRotation;
uniform float uTime;
uniform int uTopology; // 0 symmetric, 1 organic, 2 broken, 3 expanding, 4 neutral
uniform float uRoughness;
uniform int uAttractorKind; // 0 lorenz, 1 thomas, 2 aizawa

const float TWO_PI = 6.28318530718;

vec3 polarHarmonicTarget(float seed) {
  float theta = seed * TWO_PI * 3.0 + uPhaseRotation + uAngularVelocity * uTime;

  float k;
  float radiusGrowth = 0.0;
  float asymmetry = 0.0;

  if (uTopology == 0) {
    k = 3.0;
  } else if (uTopology == 1) {
    k = 3.5;
  } else if (uTopology == 2) {
    k = 4.0;
    asymmetry = 0.35 * uRoughness;
  } else if (uTopology == 3) {
    k = 2.0;
    radiusGrowth = 0.35;
  } else {
    k = 0.0;
  }

  float rose = cos(k * theta) + asymmetry * sin(5.0 * theta + seed * TWO_PI);
  float radius = uOrbitRadius * (1.0 + 0.5 * rose) * (1.0 + radiusGrowth * (theta / TWO_PI - 1.5));

  float x = radius * cos(theta);
  float y = radius * sin(theta);
  float z = uLayerHeight * sin(uOscillationFrequency * uTime + seed * TWO_PI);
  return vec3(x, y, z);
}

vec3 goldenSpiralTarget(float seed) {
  const float GOLDEN_ANGLE = 2.39996322973; // pi * (3 - sqrt(5))
  const float TURN_DENSITY = 4000.0;

  float index = seed * TURN_DENSITY;
  float angle = index * GOLDEN_ANGLE + uPhaseRotation + uAngularVelocity * uTime * 0.15;
  float radius = uOrbitRadius * sqrt(seed) * (1.0 + 0.12 * sin(uOscillationFrequency * uTime));

  float x = radius * cos(angle);
  float y = radius * sin(angle);
  float z = uLayerHeight * sin(seed * TWO_PI + uSpiralPosition + uAngularVelocity * uTime * 0.2);
  return vec3(x, y, z);
}

vec3 attractorDerivative(vec3 p) {
  if (uAttractorKind == 0) {
    float sigma = 10.0;
    float rho = 28.0;
    float beta = 8.0 / 3.0;
    return vec3(sigma * (p.y - p.x), p.x * (rho - p.z) - p.y, p.x * p.y - beta * p.z);
  } else if (uAttractorKind == 1) {
    float b = 0.19;
    return vec3(sin(p.y) - b * p.x, sin(p.z) - b * p.y, sin(p.x) - b * p.z);
  } else {
    float a = 0.95;
    float b = 0.7;
    float c = 0.6;
    float d = 3.5;
    float e = 0.25;
    float f = 0.1;
    return vec3(
      (p.z - b) * p.x - d * p.y,
      d * p.x + (p.z - b) * p.y,
      c + a * p.z - (p.z * p.z * p.z) / 3.0 - (p.x * p.x + p.y * p.y) * (1.0 + e * p.z) + f * p.z * p.x * p.x * p.x
    );
  }
}

vec3 attractorAcceleration(vec3 position) {
  float worldScale = uAttractorKind == 0 ? 0.22 : (uAttractorKind == 1 ? 1.6 : 4.5);
  vec3 attractorSpace = position / (uOrbitRadius * worldScale);
  vec3 derivative = attractorDerivative(attractorSpace);
  vec3 accel = derivative * (worldScale * uOrbitRadius * 0.3);

  float mag = length(accel);
  float maxAccel = 40.0;
  if (mag > maxAccel) accel = accel * (maxAccel / mag);

  vec3 centering = position * -0.15;
  return accel + centering;
}

vec3 springAcceleration(vec3 target, vec3 position, float stiffness) {
  return (target - position) * stiffness;
}

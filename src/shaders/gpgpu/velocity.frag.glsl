// texturePosition / textureVelocity samplers are auto-injected by
// GPUComputationRenderer based on setVariableDependencies — do not redeclare them.

uniform float uDt;
uniform int uActiveSystem; // 0 polar-harmonic, 1 golden-spiral, 2 curl-noise, 3 attractor
uniform float uCurlOverlayWeight;
uniform float uEnergy;
uniform float uNoiseAmount;
uniform float uTimeScale;

vec3 curlField(vec3 position) {
  float noiseScale = 0.15 + 0.35 * uNoiseAmount;
  float advection = uTime * (0.05 + 0.1 * uTimeScale);
  vec3 sampled = curlNoise(position * noiseScale + vec3(advection, 0.0, advection), 0.1);
  return sampled * (4.0 * (0.4 + uEnergy));
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 posData = texture2D(texturePosition, uv);
  vec4 velData = texture2D(textureVelocity, uv);
  vec3 position = posData.xyz;
  float seed = posData.w;
  vec3 velocity = velData.xyz;

  vec3 acceleration;
  if (uActiveSystem == 0) {
    acceleration = springAcceleration(polarHarmonicTarget(seed), position, 6.0);
  } else if (uActiveSystem == 1) {
    acceleration = springAcceleration(goldenSpiralTarget(seed), position, 5.0);
  } else if (uActiveSystem == 2) {
    acceleration = curlField(position);
  } else {
    acceleration = attractorAcceleration(position);
  }

  if (uActiveSystem != 2 && uCurlOverlayWeight > 0.0) {
    acceleration += curlField(position) * uCurlOverlayWeight;
  }

  // Viscous drag (0.9 retained per step) keeps the spring/field system stable
  // instead of accumulating energy indefinitely.
  vec3 newVelocity = (velocity + acceleration * uDt) * 0.9;
  gl_FragColor = vec4(newVelocity, 0.0);
}

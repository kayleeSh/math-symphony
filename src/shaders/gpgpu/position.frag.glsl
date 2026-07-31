// texturePosition / textureVelocity samplers are auto-injected by
// GPUComputationRenderer based on setVariableDependencies — do not redeclare them.

uniform float uDt;
uniform float uTimeScale;
uniform float uShockwaveStrength;
uniform float uShockwaveRadius;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 posData = texture2D(texturePosition, uv);
  vec4 velData = texture2D(textureVelocity, uv);
  vec3 position = posData.xyz;
  float seed = posData.w;
  vec3 velocity = velData.xyz;

  vec3 newPosition = position + velocity * uDt * uTimeScale;

  // Beat shockwave: a radial impulse strongest exactly at the current shockwave
  // radius (a literal expanding ring, see MathTranslationEngine's shockwave
  // envelope), decaying with distance from that ring.
  float dist = length(newPosition);
  float ringFalloff = 1.0 - clamp(abs(dist - uShockwaveRadius) / 2.5, 0.0, 1.0);
  vec3 outward = dist > 0.0001 ? newPosition / dist : vec3(0.0, 1.0, 0.0);
  newPosition += outward * uShockwaveStrength * ringFalloff * 0.6;

  gl_FragColor = vec4(newPosition, seed);
}

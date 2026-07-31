uniform vec3 uColor;
uniform float uBrightness;
uniform float uOpacity;
uniform float uEdgeSoftness;

varying float vSeed;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float dist = length(centered) * 2.0;
  if (dist > 1.0) discard;

  // Radial falloff (bright core, soft glow edge) rather than a flat disc — with
  // tens of thousands of additively-blended points, a flat disc's uniform alpha
  // stacks into a blown-out wash; a real falloff keeps individual particles
  // legible and leaves genuine highlight-picking to Bloom instead of the source.
  float core = 1.0 - smoothstep(0.0, 1.0, dist);
  float alpha = pow(core, mix(3.2, 1.0, uEdgeSoftness));
  if (alpha <= 0.004) discard;

  // Tiny per-particle brightness variation from the stable seed, so the swarm
  // reads as many individual points rather than one flat wash of color.
  float twinkle = 0.85 + 0.15 * fract(sin(vSeed * 43758.5453) * 12.9898);
  vec3 color = uColor * (0.35 + uBrightness * 0.55) * twinkle;

  // With tens of thousands of additively-blended points, per-particle alpha must
  // stay low enough that only genuinely dense regions read as bright — otherwise
  // any moderately populated area saturates to a flat white disc.
  gl_FragColor = vec4(color, alpha * uOpacity * 0.35);
}

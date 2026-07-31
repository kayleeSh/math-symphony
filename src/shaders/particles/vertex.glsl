uniform sampler2D texturePosition;
uniform float uParticleSize;
uniform float uPixelRatio;

attribute vec2 particleUv;

varying float vSeed;

void main() {
  vec4 posData = texture2D(texturePosition, particleUv);
  vec3 pos = posData.xyz;
  vSeed = posData.w;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = uParticleSize * uPixelRatio * (60.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}

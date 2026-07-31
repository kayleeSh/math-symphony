/**
 * Ken Perlin's "Improved Noise" (2002), public domain reference algorithm,
 * ported to TypeScript. A fixed permutation table means this is a pure,
 * deterministic function of (x, y, z) — never Math.random() at call time.
 */
const PERM_BASE = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69,
  142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219,
  203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230,
  220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
  132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186,
  3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59,
  227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70,
  221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178,
  185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81,
  51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115,
  121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195,
  78, 66, 215, 61, 156, 180,
]

const PERM = new Uint8Array(512)
for (let i = 0; i < 512; i++) PERM[i] = PERM_BASE[i & 255]

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z
  return (h & 1 ? -u : u) + (h & 2 ? -v : v)
}

/** Classic 3D Perlin noise, output range approximately [-1, 1]. */
export function perlin3(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  const Z = Math.floor(z) & 255
  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)
  const zf = z - Math.floor(z)
  const u = fade(xf)
  const v = fade(yf)
  const w = fade(zf)

  const a = PERM[X] + Y
  const aa = PERM[a] + Z
  const ab = PERM[a + 1] + Z
  const b = PERM[X + 1] + Y
  const ba = PERM[b] + Z
  const bb = PERM[b + 1] + Z

  const lerp = (t: number, p: number, q: number) => p + t * (q - p)

  return lerp(
    w,
    lerp(
      v,
      lerp(u, grad(PERM[aa], xf, yf, zf), grad(PERM[ba], xf - 1, yf, zf)),
      lerp(u, grad(PERM[ab], xf, yf - 1, zf), grad(PERM[bb], xf - 1, yf - 1, zf)),
    ),
    lerp(
      v,
      lerp(u, grad(PERM[aa + 1], xf, yf, zf - 1), grad(PERM[ba + 1], xf - 1, yf, zf - 1)),
      lerp(
        u,
        grad(PERM[ab + 1], xf, yf - 1, zf - 1),
        grad(PERM[bb + 1], xf - 1, yf - 1, zf - 1),
      ),
    ),
  )
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * Curl of a vector potential built from three offset Perlin fields. The curl of any
 * vector field is divergence-free by construction, which is why curl noise produces
 * smooth, incompressible-looking flow instead of particles clumping/voiding like raw
 * gradient noise would.
 */
export function curlNoise3(p: Vec3, epsilon = 1e-3): Vec3 {
  const dx = { x: epsilon, y: 0, z: 0 }
  const dy = { x: 0, y: epsilon, z: 0 }
  const dz = { x: 0, y: 0, z: epsilon }

  // Potential field channels, each offset in noise-space so they're decorrelated.
  const potX = (v: Vec3) => perlin3(v.x, v.y + 31.7, v.z + 7.1)
  const potY = (v: Vec3) => perlin3(v.x + 13.3, v.y, v.z + 91.9)
  const potZ = (v: Vec3) => perlin3(v.x + 47.2, v.y + 5.3, v.z)

  const x1 = { x: p.x - dy.x, y: p.y - dy.y, z: p.z - dy.z }
  const x2 = { x: p.x + dy.x, y: p.y + dy.y, z: p.z + dy.z }
  const y1 = { x: p.x - dz.x, y: p.y - dz.y, z: p.z - dz.z }
  const y2 = { x: p.x + dz.x, y: p.y + dz.y, z: p.z + dz.z }
  const z1 = { x: p.x - dx.x, y: p.y - dx.y, z: p.z - dx.z }
  const z2 = { x: p.x + dx.x, y: p.y + dx.y, z: p.z + dx.z }

  const curlX = (potZ(x2) - potZ(x1)) / (2 * epsilon) - (potY(y2) - potY(y1)) / (2 * epsilon)
  const curlY = (potX(y2) - potX(y1)) / (2 * epsilon) - (potZ(z2) - potZ(z1)) / (2 * epsilon)
  const curlZ = (potY(z2) - potY(z1)) / (2 * epsilon) - (potX(x2) - potX(x1)) / (2 * epsilon)

  return { x: curlX, y: curlY, z: curlZ }
}

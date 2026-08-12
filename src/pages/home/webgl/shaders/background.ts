// Fullscreen-triangle vertex shader — OGL's Triangle geometry already covers
// clip space (-1..3) so no camera/projection matrix is needed here.
export const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Flowing light glow: large, soft-edged blurred color blobs (matching the
// reference's out-of-focus orange/blue glow) with continuously animated,
// liquid-soft edges and slow brightness breathing — always at least
// partially visible, never hard on/off (that read as a strobe flash) and
// never sliding as a whole across the frame (that read as a carousel).
// Heavy film grain on top.
export const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uOctaves;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Cheap continuous "liquid" distortion — a sum of a few offset sine waves
  // is enough to make a blob's edge ripple organically over time without a
  // full noise/fbm implementation.
  float flow(vec2 p, float t) {
    float n = sin(p.x * 2.6 + t * 0.5);
    n += sin(p.y * 3.1 - t * 0.4);
    n += sin((p.x + p.y) * 1.8 + t * 0.3);
    n += sin((p.x - p.y) * 2.3 - t * 0.25);
    return n * 0.25;
  }

  // Large, heavily-feathered radial glow, edge distorted by flow() for a
  // slowly rippling liquid boundary — no hard edge, reads as an out-of-focus
  // light source, not a shape with a fixed boundary.
  float blob(vec2 uv, vec2 center, float radius, float t) {
    float d = distance(uv, center);
    d += flow(uv * 1.4, t) * 0.16;
    return 1.0 - smoothstep(0.0, radius, d);
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspectUv = uv;
    aspectUv.x *= uResolution.x / uResolution.y;
    float aspect = uResolution.x / uResolution.y;

    float t = uTime;

    // Mouse gives each blob a small, gentle static offset — not continuous
    // drift — so it feels reactive without ever reading as motion/travel.
    vec2 mouseOffset = (uMouse - 0.5) * 0.1;

    // Each center also drifts in a small, slow orbit — organic life without
    // ever traveling far enough to read as sliding across the frame.
    vec2 orbitA = vec2(cos(t * 0.11), sin(t * 0.09)) * 0.05;
    vec2 orbitB = vec2(cos(t * 0.08 + 2.0), sin(t * 0.12 + 1.0)) * 0.05;
    vec2 orbitC = vec2(cos(t * 0.13 + 4.0), sin(t * 0.07 + 3.0)) * 0.04;

    // Fixed blob layout loosely matching the reference: a large warm blob
    // low-left, a cooler blob upper-right, both big enough to overlap and
    // blend near center.
    vec2 centerA = vec2(0.32 * aspect, 0.38) + mouseOffset + orbitA;
    vec2 centerB = vec2(0.78 * aspect, 0.68) - mouseOffset + orbitB;
    vec2 centerC = vec2(0.58 * aspect, 0.22) + mouseOffset * 0.5 + orbitC;

    float glowA = blob(aspectUv, centerA, 0.62, t);
    float glowB = blob(aspectUv, centerB, 0.58, t + 10.0);
    float glowC = blob(aspectUv, centerC, 0.42, t + 20.0);

    // Slow continuous brightness breathing — always visible, no dark gaps —
    // rather than a discrete strobe flash.
    float flashA = 0.55 + 0.35 * sin(t * 0.35);
    float flashB = 0.55 + 0.35 * sin(t * 0.3 + 2.1);
    float flashC = 0.5 + 0.3 * sin(t * 0.4 + 4.2);

    vec3 color = vec3(0.0);
    color += glowA * flashA * uColor2; // orange — the one warm blob
    color += glowB * flashB * uColor4; // Aqua Mist
    color += glowC * flashC * uColor1 * 0.8; // Aqua Mist again — two cool blobs balance the single warm one

    // Near-black base; glow adds on top (screen-like), never fully replaces it.
    vec3 bgColor = vec3(0.02, 0.018, 0.022);
    color = bgColor + color * (1.0 - bgColor);
    color = clamp(color, 0.0, 1.0);

    // Vignette — corners fall back to black, containing the glow centrally.
    float dist = length(uv - 0.5);
    float vignette = 1.0 - smoothstep(0.15, 0.68, dist);
    color = mix(bgColor, color, vignette);

    // Film grain — animated per-pixel hash noise, applied multiplicatively so
    // it textures the lit glow areas without adding flat white/gray noise on
    // top of the near-black background (which read as flickering white static).
    vec2 grainUv = gl_FragCoord.xy + fract(uTime) * 137.0;
    float grain = hash(grainUv);
    color *= 1.0 + (grain - 0.5) * 0.5;
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

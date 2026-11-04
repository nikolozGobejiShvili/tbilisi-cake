/**
 * The cake, built entirely in code, so no 3D files need to be downloaded and it stays sharp at any size.
 * Details come from the real feed: a wooden stand with a white board, raspberries, wavy gold candles,
 * a piped pearl border. It is an illustration, not a specific cake.
 *
 * Realism comes from imperfection and from dark where things touch: the coat is hand-spread rather than
 * a perfect cylinder, drips are rounded and heavy at the tip, each raspberry darkens between its
 * drupelets, and soft contact shadows sit under the cake and every berry.
 *
 * Every part is split into a main body and a wedge, so the wedge can slide out and show real layers.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const TWO_PI = Math.PI * 2;
export const WEDGE_ANGLE = 1.02;
const MAIN_START = WEDGE_ANGLE / 2;
const MAIN_LENGTH = TWO_PI - WEDGE_ANGLE;
const WEDGE_START = -WEDGE_ANGLE / 2;

const SPONGE_HEIGHT = 0.25;
const CREAM_HEIGHT = 0.05;
const BERRY_HEIGHT = 0.028;
export const CORE_HEIGHT = SPONGE_HEIGHT * 3 + (CREAM_HEIGHT + BERRY_HEIGHT) * 2;
export const COAT_TOP = CORE_HEIGHT + 0.05;
const COAT_RADIUS = 1.05;
const GLAZE_TOP = COAT_TOP + 0.012;

const STACK: { kind: "sponge" | "cream" | "berry"; height: number }[] = [
  { kind: "sponge", height: SPONGE_HEIGHT },
  { kind: "cream", height: CREAM_HEIGHT },
  { kind: "berry", height: BERRY_HEIGHT },
  { kind: "sponge", height: SPONGE_HEIGHT },
  { kind: "cream", height: CREAM_HEIGHT },
  { kind: "berry", height: BERRY_HEIGHT },
  { kind: "sponge", height: SPONGE_HEIGHT },
];

export type Quality = { segments: number; berries: number; berryDetail: number; pearls: number; shadows: boolean; richMaterials: boolean; textureSize: number };

export const HIGH_QUALITY: Quality = { segments: 144, berries: 58, berryDetail: 1, pearls: 92, shadows: true, richMaterials: true, textureSize: 1024 };
export const LOW_QUALITY: Quality = { segments: 72, berries: 40, berryDetail: 0, pearls: 60, shadows: false, richMaterials: false, textureSize: 512 };

/** A seeded generator, so the cake looks the same on every visit. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth, organic variation in about -1..1, for the unevenness of things made by hand. */
function wobble(x: number, y: number, z: number): number {
  return (Math.sin(x * 3.1 + y * 1.7 + 1.3) + Math.sin(y * 4.3 - z * 2.9 + 0.7) * 0.7 + Math.sin(z * 5.7 + x * 2.3 + 2.1) * 0.5 + Math.sin((x + z) * 9.1 + y * 7.3) * 0.25) / 2.45;
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/* ---------- textures ---------- */

function canvas(width: number, height = width): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return [element, element.getContext("2d")!];
}

function toTexture(element: HTMLCanvasElement, colour: boolean): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(element);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  if (colour) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Sponge crumb, painted onto given colour and height canvases: air pockets of many sizes. */
function paintCrumb(colour: CanvasRenderingContext2D, bump: CanvasRenderingContext2D, x0: number, y0: number, width: number, height: number, density: number, seed: number) {
  const random = seeded(seed);
  const count = Math.round((width * height * density) / 1000);
  for (let i = 0; i < count; i += 1) {
    const x = x0 + random() * width;
    const y = y0 + random() * height;
    const large = random() > 0.93;
    const rx = large ? 2.5 + random() * 4.5 : 0.5 + random() * random() * 3.2;
    const ry = rx * (0.55 + random() * 0.6);
    const angle = random() * Math.PI;
    const hole = random() > 0.4;
    colour.fillStyle = hole ? `rgba(170,122,62,${0.14 + random() * (large ? 0.46 : 0.26)})` : `rgba(252,230,176,${0.14 + random() * 0.32})`;
    colour.beginPath();
    colour.ellipse(x, y, rx, ry, angle, 0, TWO_PI);
    colour.fill();
    bump.fillStyle = hole ? `rgba(20,20,20,${0.35 + random() * 0.5})` : `rgba(245,245,245,${0.2 + random() * 0.4})`;
    bump.beginPath();
    bump.ellipse(x, y, rx, ry, angle, 0, TWO_PI);
    bump.fill();
  }
}

function crumbMaps(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const [colourCanvas, colour] = canvas(512);
  const [bumpCanvas, bump] = canvas(512);
  colour.fillStyle = "#efd59c";
  colour.fillRect(0, 0, 512, 512);
  bump.fillStyle = "#b0b0b0";
  bump.fillRect(0, 0, 512, 512);
  paintCrumb(colour, bump, 0, 0, 512, 512, 20, 7);
  return { map: toTexture(colourCanvas, true), bump: toTexture(bumpCanvas, false) };
}

/**
 * What a slice really looks like: crumb with air pockets, darker where the sponge met the tin, wavy cream
 * with no straight edges, and berry filling that bleeds slightly into the sponge. u runs from the centre
 * to the outer edge, and v from the board to the top of the core.
 */
function sliceMaps(size: number): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture } {
  const [colourCanvas, colour] = canvas(size);
  const [bumpCanvas, bump] = canvas(size);
  const [roughCanvas, rough] = canvas(size);
  const toY = (v: number) => size * (1 - v / CORE_HEIGHT);

  colour.fillStyle = "#eed39a";
  colour.fillRect(0, 0, size, size);
  bump.fillStyle = "#a8a8a8";
  bump.fillRect(0, 0, size, size);
  rough.fillStyle = "rgb(0,240,0)";
  rough.fillRect(0, 0, size, size);

  /** Fills a band between two wavy edges, in all three maps. */
  const band = (from: number, to: number, seed: number, amplitude: number, paint: (ctx: CanvasRenderingContext2D, which: number) => void) => {
    const trace = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      for (let x = 0; x <= size; x += 6) {
        const u = x / size;
        const y = toY(to + amplitude * wobble(u * 5 + seed, seed, u * 3));
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let x = size; x >= 0; x -= 6) {
        const u = x / size;
        ctx.lineTo(x, toY(from + amplitude * wobble(u * 6 - seed, seed * 2, u * 4)));
      }
      ctx.closePath();
    };
    [colour, bump, rough].forEach((ctx, which) => {
      trace(ctx);
      paint(ctx, which);
      ctx.fill();
    });
  };

  // Crumb first, then a soft browner tone along the top and bottom of each sponge.
  paintCrumb(colour, bump, 0, 0, size, size, size > 600 ? 14 : 24, 41);
  let y = 0;
  for (const part of STACK) {
    if (part.kind === "sponge") {
      for (const [edge, direction] of [[y, 1], [y + part.height, -1]] as const) {
        const top = toY(edge);
        const reach = size * 0.03 * direction;
        const gradient = colour.createLinearGradient(0, top, 0, top - reach);
        gradient.addColorStop(0, "rgba(150,92,36,0.5)");
        gradient.addColorStop(1, "rgba(150,92,36,0)");
        colour.fillStyle = gradient;
        colour.fillRect(0, Math.min(top, top - reach), size, Math.abs(reach));
      }
    }
    y += part.height;
  }
  // Berry filling soaks a little into the sponge above and below it.
  y = 0;
  STACK.forEach((part, index) => {
    if (part.kind === "cream") {
      band(y, y + part.height, 1.3 + index, 0.007, (ctx, which) => {
        ctx.fillStyle = which === 0 ? "#fbf1e2" : which === 1 ? "#c4c4c4" : "rgb(0,130,0)";
      });
    }
    if (part.kind === "berry") {
      band(y - 0.008, y + part.height + 0.008, 2.1 + index, 0.008, (ctx, which) => {
        ctx.fillStyle = which === 0 ? "rgba(150,40,50,0.28)" : which === 1 ? "rgba(90,90,90,0.5)" : "rgba(0,170,0,0.5)";
      });
      band(y, y + part.height, 2.7 + index, 0.006, (ctx, which) => {
        ctx.fillStyle = which === 0 ? "#7d0d20" : which === 1 ? "#7a7a7a" : "rgb(0,60,0)";
      });
      // Seeds and fruit pieces in the filling.
      const random = seeded(90 + index);
      for (let i = 0; i < size / 9; i += 1) {
        const px = random() * size;
        const py = toY(y + random() * part.height);
        colour.fillStyle = random() > 0.5 ? "rgba(214,60,70,0.75)" : "rgba(58,4,12,0.8)";
        colour.beginPath();
        colour.ellipse(px, py, 1 + random() * 3, 0.8 + random() * 1.6, random() * Math.PI, 0, TWO_PI);
        colour.fill();
      }
    }
    y += part.height;
  });

  const map = toTexture(colourCanvas, true);
  const bumpMap = toTexture(bumpCanvas, false);
  const roughness = toTexture(roughCanvas, false);
  return { map, bump: bumpMap, roughness };
}

/** Soft marks of a palette knife, with fine grain over them, for a coat of real buttercream. */
function knifeMarks(): THREE.CanvasTexture {
  const random = seeded(21);
  const [element, context] = canvas(512);
  context.fillStyle = "#808080";
  context.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 120; i += 1) {
    const y = random() * 512;
    const height = 2 + random() * 26;
    const light = random() > 0.5;
    const gradient = context.createLinearGradient(0, y, 0, y + height);
    const tone = light ? "255,255,255" : "0,0,0";
    gradient.addColorStop(0, `rgba(${tone},0)`);
    gradient.addColorStop(0.5, `rgba(${tone},${0.05 + random() * 0.12})`);
    gradient.addColorStop(1, `rgba(${tone},0)`);
    context.fillStyle = gradient;
    context.fillRect(0, y, 512, height);
  }
  for (let i = 0; i < 9000; i += 1) {
    context.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    context.fillRect(random() * 512, random() * 512, 1.5, 1.5);
  }
  return toTexture(element, false);
}

/** Very slow swells, so that reflections on the glaze waver as they do on a poured surface. */
function pouredSwell(): THREE.CanvasTexture {
  const random = seeded(61);
  const [element, context] = canvas(256);
  context.fillStyle = "#808080";
  context.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i += 1) {
    const x = random() * 256;
    const y = random() * 256;
    const r = 18 + random() * 50;
    const gradient = context.createRadialGradient(x, y, 0, x, y, r);
    const tone = random() > 0.5 ? "255,255,255" : "0,0,0";
    gradient.addColorStop(0, `rgba(${tone},0.14)`);
    gradient.addColorStop(1, `rgba(${tone},0)`);
    context.fillStyle = gradient;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return toTexture(element, false);
}

/** Walnut grain, for the wooden stand in the real photographs. */
function woodMap(): THREE.CanvasTexture {
  const random = seeded(33);
  const [element, context] = canvas(512);
  context.fillStyle = "#4e2c18";
  context.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i += 1) {
    const x = random() * 512;
    const width = 0.5 + random() * 3;
    context.strokeStyle = random() > 0.5 ? `rgba(30,14,6,${0.1 + random() * 0.24})` : `rgba(122,76,44,${0.06 + random() * 0.16})`;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(x + random() * 20 - 10, 170, x + random() * 20 - 10, 340, x + random() * 8 - 4, 512);
    context.stroke();
  }
  return toTexture(element, true);
}

export function flameTexture(): THREE.CanvasTexture {
  const [element, context] = canvas(128);
  const gradient = context.createRadialGradient(64, 76, 2, 64, 64, 62);
  gradient.addColorStop(0, "rgba(255,248,224,1)");
  gradient.addColorStop(0.18, "rgba(255,214,140,0.9)");
  gradient.addColorStop(0.45, "rgba(255,150,70,0.28)");
  gradient.addColorStop(1, "rgba(255,110,40,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A pool of warm light on the floor, dark right under the stand, so it sits on something. */
function floorGlow(): THREE.CanvasTexture {
  const [element, context] = canvas(512);
  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, "rgba(6,2,1,0.92)");
  gradient.addColorStop(0.13, "rgba(6,2,1,0.82)");
  gradient.addColorStop(0.2, "rgba(70,32,20,0.42)");
  gradient.addColorStop(0.36, "rgba(120,60,40,0.26)");
  gradient.addColorStop(1, "rgba(60,26,16,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The dark where the cake meets the board. */
function contactRing(): THREE.CanvasTexture {
  const [element, context] = canvas(512);
  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, "rgba(34,20,14,0.3)");
  gradient.addColorStop(0.76, "rgba(34,20,14,0.3)");
  gradient.addColorStop(0.795, "rgba(34,20,14,0.5)");
  gradient.addColorStop(0.85, "rgba(34,20,14,0.14)");
  gradient.addColorStop(0.97, "rgba(34,20,14,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(element);
}

/** The soft dark under a single berry. */
function softBlob(): THREE.CanvasTexture {
  const [element, context] = canvas(64);
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(20,0,2,0.78)");
  gradient.addColorStop(0.55, "rgba(20,0,2,0.42)");
  gradient.addColorStop(1, "rgba(20,0,2,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(element);
}

/* ---------- geometry helpers ---------- */

type Point = [number, number];

/** Texture coordinates from real size, so the crumb is the same scale on every surface. */
function worldUv(geometry: THREE.BufferGeometry, scale: number) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (Math.abs(normal.getY(i)) > 0.7) uv.setXY(i, x * scale, z * scale);
    else uv.setXY(i, Math.atan2(x, z) * Math.hypot(x, z) * scale, y * scale);
  }
  uv.needsUpdate = true;
}

function lathe(profile: Point[], phiStart: number, phiLength: number, segments: number, uvScale: number, shape?: (position: THREE.Vector3) => void) {
  const steps = Math.max(4, Math.round((segments * phiLength) / TWO_PI));
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), steps, phiStart, phiLength);
  if (shape) {
    const position = geometry.getAttribute("position");
    const vector = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 1) {
      vector.fromBufferAttribute(position, i);
      shape(vector);
      position.setXYZ(i, vector.x, vector.y, vector.z);
    }
    geometry.computeVertexNormals();
  }
  worldUv(geometry, uvScale);
  return geometry;
}

/** A flat face along a radius, closing the cut. `facing` says which way around the cake it looks. */
function cutFace(angle: number, r0: number, r1: number, y0: number, y1: number, facing: 1 | -1, uvScale: number, sliceUv = false) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const corner = (r: number, y: number) => [r * sin, y, r * cos];
  const normal = [cos * facing, 0, -sin * facing];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([...corner(r0, y0), ...corner(r1, y0), ...corner(r1, y1), ...corner(r0, y1)], 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute([...normal, ...normal, ...normal, ...normal], 3));
  const uv = sliceUv ? [0, 0, 1, 0, 1, 1, 0, 1] : [r0 * uvScale, y0 * uvScale, r1 * uvScale, y0 * uvScale, r1 * uvScale, y1 * uvScale, r0 * uvScale, y1 * uvScale];
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(facing === -1 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  return geometry;
}

/** The side profile of a drum with softly rounded edges and extra rings across its top, so it can be shaped. */
function drumProfile(radius: number, y0: number, y1: number, bevel: number, topRings = 0): Point[] {
  const arc = (cx: number, cy: number, from: number, to: number): Point[] =>
    Array.from({ length: 5 }, (_, i) => {
      const angle = from + ((to - from) * i) / 4;
      return [cx + Math.cos(angle) * bevel, cy + Math.sin(angle) * bevel] as Point;
    });
  const rings: Point[] = Array.from({ length: topRings }, (_, i) => [(radius - bevel - 0.001) * (1 - (i + 1) / (topRings + 1)), y1] as Point);
  return [[0, y0], [radius - bevel - 0.001, y0], ...arc(radius - bevel, y0 + bevel, -Math.PI / 2, 0), ...arc(radius - bevel, y1 - bevel, 0, Math.PI / 2), [radius - bevel - 0.001, y1], ...rings, [0, y1]];
}

/** One full-circle part as a [main, wedge] pair of solids with closed cut faces. */
function splitDrum(radius: number, y0: number, y1: number, bevel: number, segments: number, uvScale: number, topRings = 0, shape?: (position: THREE.Vector3) => void): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const profile = drumProfile(radius, y0, y1, bevel, topRings);
  const solid = (start: number, length: number) =>
    mergeGeometries([lathe(profile, start, length, segments, uvScale, shape), cutFace(start, 0, radius, y0, y1, -1, uvScale), cutFace(start + length, 0, radius, y0, y1, 1, uvScale)])!;
  return [solid(MAIN_START, MAIN_LENGTH), solid(WEDGE_START, WEDGE_ANGLE)];
}

/** Darkens where surfaces meet, stored per vertex, because real shadows there are too fine for a shadow map. */
function shade(geometry: THREE.BufferGeometry, value: (x: number, y: number, z: number) => number) {
  const position = geometry.getAttribute("position");
  const colours = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const v = value(position.getX(i), position.getY(i), position.getZ(i));
    colours[i * 3] = v;
    colours[i * 3 + 1] = v * 0.985;
    colours[i * 3 + 2] = v * 0.97;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  return geometry;
}

/** The coat of cream: hand-spread rather than a perfect cylinder. This is the cap that lifts off when the cake comes apart. */
function splitCoat(segments: number): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const inner = 1.002;
  const outer = COAT_RADIUS;
  const top = COAT_TOP;
  const wall: Point[] = [[inner, 0], [outer - 0.012, 0], [outer, 0.012]];
  for (let i = 1; i <= 26; i += 1) wall.push([outer, 0.012 + ((top - 0.042) * i) / 26]);
  wall.push([outer - 0.008, top - 0.01], [outer - 0.03, top], [0, top]);
  const hollow: Point[] = [[0, CORE_HEIGHT + 0.002], [inner, CORE_HEIGHT + 0.002], [inner, 0]];

  const handSpread = (p: THREE.Vector3) => {
    const radius = Math.hypot(p.x, p.z);
    if (radius < outer - 0.04) return;
    const angle = Math.atan2(p.x, p.z);
    const a = Math.sin(angle);
    const b = Math.cos(angle);
    // Broad unevenness of the knife, then a finer ripple running around the cake.
    const push = 0.0065 * wobble(a * 1.6, p.y * 2.2, b * 1.6) + 0.0022 * wobble(a * 6, p.y * 16, b * 6);
    p.x += a * push;
    p.z += b * push;
  };

  const solid = (start: number, length: number) =>
    shade(
      mergeGeometries([
        lathe(wall, start, length, segments, 1, handSpread),
        lathe(hollow, start, length, segments, 1),
        cutFace(start, inner, outer, 0, top, -1, 1),
        cutFace(start + length, inner, outer, 0, top, 1, 1),
        cutFace(start, 0, inner, CORE_HEIGHT + 0.002, top, -1, 1),
        cutFace(start + length, 0, inner, CORE_HEIGHT + 0.002, top, 1, 1),
      ])!,
      // Darker at the foot, where the cake meets the board, and just under the glaze.
      (_x, y) => 0.68 + 0.32 * smoothstep(0, 0.16, y) - 0.1 * smoothstep(top - 0.12, top, y),
    );
  return [solid(MAIN_START, MAIN_LENGTH), solid(WEDGE_START, WEDGE_ANGLE)];
}

/**
 * The glaze on the side: a wavering band at the rim and separate drips running down from it. A drip has
 * straight sides, flares where it leaves the band, and ends in a heavy rounded bead. Each is half a tube
 * lying on the cake, so it catches a long highlight as real glaze does. Two sets of positions are built,
 * collapsed at the rim and fully run, and the arrival animation moves between them.
 */
function buildGlazeSide(start: number, length: number, quality: Quality) {
  const random = seeded(11);
  const positions: number[] = [];
  const running: number[] = [];
  const indices: number[] = [];
  const top = COAT_TOP - 0.004;

  /** Adds one grid of vertices, where `at(row, column, flow)` gives phi, y and radius. */
  const grid = (rows: number, columns: number, at: (r: number, c: number, flow: boolean) => [number, number, number]) => {
    const offset = positions.length / 3;
    for (let r = 0; r <= rows; r += 1) {
      for (let c = 0; c <= columns; c += 1) {
        const [phi0, y0, radius0] = at(r, c, false);
        positions.push(radius0 * Math.sin(phi0), y0, radius0 * Math.cos(phi0));
        const [phi1, y1, radius1] = at(r, c, true);
        running.push(radius1 * Math.sin(phi1), y1, radius1 * Math.cos(phi1));
      }
    }
    const stride = columns + 1;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < columns; c += 1) {
        const a = offset + r * stride + c;
        indices.push(a, a + stride, a + 1, a + stride, a + stride + 1, a + 1);
      }
    }
  };

  // The band: thick at the lip, with a lower edge that wanders.
  const columns = Math.max(8, Math.round((quality.segments * 2 * length) / TWO_PI));
  grid(8, columns, (r, c, flow) => {
    const phi = start + (length * c) / columns;
    const k = r / 8;
    const edge = 0.078 + 0.032 * wobble(Math.sin(phi) * 3, 0.5, Math.cos(phi) * 3);
    const drop = (flow ? edge : 0.024) * k;
    const lip = 0.015 * Math.sqrt(Math.max(0, 1 - k ** 4));
    return [phi, top - drop, COAT_RADIUS + 0.0005 + lip];
  });

  // The drips. None sits across the cut, so the wedge pulls away cleanly.
  const count = 25;
  const halfRing = quality.richMaterials ? 8 : 6;
  const rows = quality.richMaterials ? 22 : 14;
  for (let i = 0; i < count; i += 1) {
    const phi = ((i + (random() - 0.5) * 0.62) / count) * TWO_PI;
    const span = 0.055 + Math.pow(random(), 1.6) * 0.46;
    const width = 0.027 + random() * 0.017 + span * 0.022;
    const sway = (random() - 0.5) * 0.012;
    const swayPhase = random() * TWO_PI;
    const wrapped = ((phi - start) % TWO_PI + TWO_PI) % TWO_PI;
    if (wrapped > length) continue;
    const clearance = (width * 3) / COAT_RADIUS + 0.02;
    if (wrapped < clearance || length - wrapped < clearance) continue;
    grid(rows, halfRing, (r, c, flow) => {
      const t = r / rows;
      const across = (c / halfRing) * Math.PI - Math.PI / 2;
      const closing = t > 0.9 ? Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) : 1;
      const bead = Math.exp(-(((t - 0.84) / 0.1) ** 2));
      const halfWidth = width * (1 + 1.25 * Math.exp(-t * 7) + 0.2 * bead) * closing;
      const thickness = (0.012 + 0.011 * bead + 0.004 * Math.exp(-t * 6)) * closing;
      const run = flow ? span + 0.05 : 0.018;
      const drift = flow ? sway * Math.sin(t * 5 + swayPhase) * t : 0;
      const side = Math.sin(across) * halfWidth * (flow ? 1 : 0.6);
      return [phi + (side + drift) / COAT_RADIUS, top - 0.012 - run * t, COAT_RADIUS + 0.0006 + Math.cos(across) * thickness * (flow ? 1 : 0.4)];
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const full = new THREE.BufferGeometry();
  full.setAttribute("position", new THREE.Float32BufferAttribute(running, 3));
  full.setIndex(indices);
  full.computeVertexNormals();
  geometry.morphAttributes.position = [full.getAttribute("position")];
  geometry.morphAttributes.normal = [full.getAttribute("normal")];
  geometry.morphTargetsRelative = false;
  return geometry;
}

/** The poured top: very slightly domed, as a thick liquid settles. */
function glazeCapProfile(): Point[] {
  const edge: Point[] = [[COAT_RADIUS + 0.012, COAT_TOP - 0.014], [COAT_RADIUS + 0.012, COAT_TOP - 0.003], [COAT_RADIUS + 0.004, GLAZE_TOP - 0.003], [COAT_RADIUS - 0.03, GLAZE_TOP]];
  const rings: Point[] = Array.from({ length: 6 }, (_, i) => {
    const r = (COAT_RADIUS - 0.03) * (1 - (i + 1) / 7);
    return [r, GLAZE_TOP + 0.004 * (1 - (r / COAT_RADIUS) ** 2)] as Point;
  });
  return [...edge, ...rings, [0, GLAZE_TOP + 0.004]];
}

/** One raspberry: drupelets of slightly different sizes over a dark core, deep shade between them. */
function raspberryGeometry(detail: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const count = detail > 0 ? 34 : 26;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const random = seeded(3);
  const paint = (geometry: THREE.BufferGeometry, centre: THREE.Vector3, deep: number) => {
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const colours = new Float32Array(position.count * 3);
    const outward = centre.clone().normalize();
    for (let v = 0; v < position.count; v += 1) {
      const facing = normal.getX(v) * outward.x + normal.getY(v) * outward.y + normal.getZ(v) * outward.z;
      const value = deep + (1 - deep) * smoothstep(-0.15, 0.85, facing);
      colours[v * 3] = value;
      colours[v * 3 + 1] = value;
      colours[v * 3 + 2] = value;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  };
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 1.72;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const taper = 0.66 + 0.34 * ((y + 0.72) / 1.72);
    const angle = i * golden + (random() - 0.5) * 0.25;
    const size = 0.0205 * (0.86 + random() * 0.32);
    const part = new THREE.IcosahedronGeometry(1, detail);
    part.deleteAttribute("uv");
    const position = part.getAttribute("position");
    const normals = new Float32Array(position.count * 3);
    const vector = new THREE.Vector3();
    for (let v = 0; v < position.count; v += 1) {
      vector.fromBufferAttribute(position, v).normalize();
      normals[v * 3] = vector.x;
      normals[v * 3 + 1] = vector.y;
      normals[v * 3 + 2] = vector.z;
      position.setXYZ(v, vector.x * size, vector.y * size * 1.12, vector.z * size);
    }
    part.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    const centre = new THREE.Vector3(Math.cos(angle) * ring * 0.058 * taper, y * 0.076, Math.sin(angle) * ring * 0.058 * taper);
    paint(part, centre, 0.3);
    part.translate(centre.x, centre.y, centre.z);
    parts.push(part);
  }
  const core = new THREE.IcosahedronGeometry(0.05, 1);
  core.deleteAttribute("uv");
  const position = core.getAttribute("position");
  const coreNormals = new Float32Array(position.count * 3);
  const coreColours = new Float32Array(position.count * 3).fill(0.12);
  const vector = new THREE.Vector3();
  for (let v = 0; v < position.count; v += 1) {
    vector.fromBufferAttribute(position, v).normalize();
    coreNormals.set([vector.x, vector.y, vector.z], v * 3);
  }
  core.setAttribute("normal", new THREE.BufferAttribute(coreNormals, 3));
  core.setAttribute("color", new THREE.BufferAttribute(coreColours, 3));
  parts.push(core);
  return mergeGeometries(parts)!;
}

/** A mint leaf: toothed edge, folded along its rib and curling back at the tip. */
function leafGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const teeth = 7;
  const edge = (t: number) => 0.056 * Math.sin(Math.PI * Math.pow(t, 0.72));
  shape.moveTo(0, 0);
  for (let i = 1; i <= teeth * 2; i += 1) {
    const t = i / (teeth * 2);
    shape.lineTo(edge(t) * (i % 2 === 0 ? 0.86 : 1.05), t * 0.19);
  }
  for (let i = teeth * 2 - 1; i >= 1; i -= 1) {
    const t = i / (teeth * 2);
    shape.lineTo(-edge(t) * (i % 2 === 0 ? 0.86 : 1.05), t * 0.19);
  }
  shape.lineTo(0, 0);
  const geometry = new THREE.ShapeGeometry(shape, 4);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    position.setZ(i, Math.abs(x) * 0.6 + y * y * 1.1);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A fleck of gold leaf: an irregular little polygon that catches the light. */
function goldFlakeGeometry(): THREE.BufferGeometry {
  const random = seeded(55);
  const shape = new THREE.Shape();
  const sides = 7;
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * TWO_PI;
    const radius = 0.012 + random() * 0.016;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return new THREE.ShapeGeometry(shape);
}

/* ---------- the model ---------- */

export type CakeModel = {
  root: THREE.Group;
  /** Sponge, cream and berry layers, bottom to top. Each has a main and a wedge mesh. */
  layers: { group: THREE.Group; wedge: THREE.Mesh; baseY: number; kind: "sponge" | "cream" | "berry"; centreY: number }[];
  coat: THREE.Group;
  coatWedge: THREE.Group;
  /** Cuts the coat from below during arrival, so it seems to run down over the layers. */
  coatClip: THREE.Plane;
  /** The poured top of the glaze, which spreads outward from the centre. */
  caps: THREE.Mesh[];
  drips: THREE.Mesh[];
  pearls: { mesh: THREE.InstancedMesh; total: number }[];
  berries: { mesh: THREE.InstancedMesh; items: { matrix: THREE.Matrix4; position: THREE.Vector3; rotation: THREE.Quaternion; scale: number; order: number }[] }[];
  candles: THREE.Group;
  flames: THREE.Sprite[];
  halos: THREE.Sprite[];
  flameLight: THREE.PointLight;
  /** Leaves, gold leaf and the shade under each berry, which appear once the raspberries have landed. */
  garnish: THREE.InstancedMesh[];
  /** The painted faces of the cut: shown only while the wedge is out and the layers are together. */
  sliceFaces: THREE.Mesh[];
  sliceWedge: THREE.Group;
  dispose: () => void;
};

/** Built in several short steps, handing control back to the browser between them. */
export async function buildCake(quality: Quality, breathe: () => Promise<void>): Promise<CakeModel> {
  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const crumb = crumbMaps();
  keep(crumb.map);
  keep(crumb.bump);
  await breathe();
  const slice = sliceMaps(quality.textureSize);
  keep(slice.map);
  keep(slice.bump);
  keep(slice.roughness);
  await breathe();
  const knife = keep(knifeMarks());
  const swell = keep(pouredSwell());
  const wood = keep(woodMap());
  await breathe();

  const coatClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 10);

  /** Clearcoat and sheen cost real work per pixel, so weaker devices get the plain material. */
  const surface = (physical: THREE.MeshPhysicalMaterialParameters, plain: THREE.MeshStandardMaterialParameters) =>
    keep(quality.richMaterials ? new THREE.MeshPhysicalMaterial({ ...plain, ...physical }) : new THREE.MeshStandardMaterial(plain));

  // Each distinct kind of material is one more shader to prepare on load, so only three use the costly model.
  const sponge = keep(new THREE.MeshStandardMaterial({ map: crumb.map, bumpMap: crumb.bump, bumpScale: 1.6, roughness: 0.94, envMapIntensity: 0.7 }));
  const cream = keep(new THREE.MeshStandardMaterial({ color: "#fff8ec", roughness: 0.52 }));
  const berryLayer = keep(new THREE.MeshStandardMaterial({ color: "#700a1b", roughness: 0.3, envMapIntensity: 0.5 }));
  const sliceMaterial = keep(new THREE.MeshStandardMaterial({ map: slice.map, bumpMap: slice.bump, bumpScale: 1.4, roughnessMap: slice.roughness, roughness: 1, envMapIntensity: 0.65 }));
  const coatMaterial = surface(
    { sheen: 0.7, sheenColor: new THREE.Color("#fff0e4"), sheenRoughness: 0.6 },
    { color: "#fff6ea", roughness: 0.6, bumpMap: knife, bumpScale: 0.26, vertexColors: true, clippingPlanes: [coatClip] },
  );
  const glaze = surface({ clearcoat: 1, clearcoatRoughness: 0.2, roughness: 0.32 }, { color: "#640917", roughness: 0.22, bumpMap: swell, bumpScale: 0.5, envMapIntensity: 1 });
  const berryMaterial = surface(
    { clearcoat: 0.45, clearcoatRoughness: 0.36, roughness: 0.46 },
    { color: "#ffffff", roughness: 0.36, vertexColors: true, emissive: "#3c0208", emissiveIntensity: 0.55, envMapIntensity: 0.8 },
  );
  const pearl = keep(new THREE.MeshStandardMaterial({ color: "#fff7ec", roughness: 0.42 }));
  const gold = keep(new THREE.MeshStandardMaterial({ color: "#e6ba62", metalness: 1, roughness: 0.24 }));
  const woodMaterial = keep(new THREE.MeshStandardMaterial({ map: wood, roughness: 0.5, metalness: 0, envMapIntensity: 0.9 }));
  const boardMaterial = keep(new THREE.MeshStandardMaterial({ color: "#f8f3ec", roughness: 0.66 }));
  const leafMaterial = keep(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.42, side: THREE.DoubleSide, envMapIntensity: 0.7 }));
  const flakeMaterial = keep(new THREE.MeshStandardMaterial({ color: "#f0c770", metalness: 1, roughness: 0.3, side: THREE.DoubleSide }));

  /* A pool of warm light under the stand. */
  const floorMap = keep(floorGlow());
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(9, 9)), keep(new THREE.MeshBasicMaterial({ map: floorMap, transparent: true, depthWrite: false, toneMapped: false })));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.062;
  root.add(floor);

  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, shadow = true) => {
    keep(geometry);
    const item = new THREE.Mesh(geometry, material);
    item.castShadow = shadow;
    item.receiveShadow = shadow;
    return item;
  };

  /* The wooden stand and the white board, as in the real photographs. */
  const standProfile: Point[] = [
    [0, -1.06], [0.62, -1.06], [0.655, -1.045], [0.66, -1.02], [0.62, -0.99], [0.34, -0.94], [0.16, -0.84], [0.105, -0.66], [0.09, -0.48], [0.105, -0.32], [0.17, -0.22], [0.42, -0.16],
    [1.2, -0.115], [1.4, -0.1], [1.43, -0.085], [1.42, -0.065], [1.39, -0.052], [0, -0.052],
  ];
  root.add(mesh(new THREE.LatheGeometry(standProfile.map(([r, y]) => new THREE.Vector2(r, y)), quality.segments), woodMaterial));
  root.add(mesh(new THREE.LatheGeometry(drumProfile(1.3, -0.052, 0, 0.008).map(([r, y]) => new THREE.Vector2(r, y)), quality.segments), boardMaterial));

  /* The dark where the cake meets the board. */
  const contact = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.64, 2.64)), keep(new THREE.MeshBasicMaterial({ map: keep(contactRing()), transparent: true, depthWrite: false, toneMapped: false })));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.0015;
  root.add(contact);

  /* The layers: three of sponge, with cream and a berry layer between them. */
  const cakeBody = new THREE.Group();
  root.add(cakeBody);
  let y = 0;
  const layers: CakeModel["layers"] = STACK.map(({ kind, height }) => {
    const group = new THREE.Group();
    const radius = kind === "sponge" ? 1 : kind === "cream" ? 0.992 : 0.98;
    const bevel = kind === "sponge" ? 0.016 : kind === "cream" ? 0.02 : 0.012;
    // Cream and filling are spread by hand, so their tops undulate and their edges wander.
    const shape =
      kind === "sponge"
        ? undefined
        : (p: THREE.Vector3) => {
            const amount = kind === "cream" ? 0.009 : 0.006;
            if (p.y > height * 0.5) p.y += amount * wobble(p.x * 2.4, 0.3, p.z * 2.4);
            const radial = 1 + 0.012 * wobble(p.x * 1.8, 0.8, p.z * 1.8);
            p.x *= radial;
            p.z *= radial;
          };
    const [main, wedge] = splitDrum(radius, 0, height, bevel, quality.segments, 1.15, kind === "sponge" ? 0 : 7, shape);
    const material = kind === "sponge" ? sponge : kind === "cream" ? cream : berryLayer;
    const mainMesh = mesh(main, material);
    const wedgeMesh = mesh(wedge, material);
    group.add(mainMesh, wedgeMesh);
    cakeBody.add(group);
    const layer = { group, wedge: wedgeMesh, baseY: y, kind, centreY: y + height / 2 };
    group.position.y = y;
    y += height;
    return layer;
  });

  /* The painted cut: what the eye actually reads as cake when a slice comes out. */
  const offsetCut = (angle: number, facing: 1 | -1) => {
    const face = cutFace(angle, 0, 1.001, 0, CORE_HEIGHT, facing, 1, true);
    face.translate(Math.cos(angle) * facing * 0.0022, 0, -Math.sin(angle) * facing * 0.0022);
    return face;
  };
  const sliceMain = mesh(mergeGeometries([offsetCut(MAIN_START, -1), offsetCut(MAIN_START + MAIN_LENGTH, 1)])!, sliceMaterial, false);
  sliceMain.receiveShadow = true;
  const sliceWedge = new THREE.Group();
  const slicePiece = mesh(mergeGeometries([offsetCut(WEDGE_START, -1), offsetCut(WEDGE_START + WEDGE_ANGLE, 1)])!, sliceMaterial, false);
  slicePiece.receiveShadow = true;
  sliceWedge.add(slicePiece);
  cakeBody.add(sliceMain, sliceWedge);
  await breathe();

  /* The coat: cream, glaze, pearls, raspberries and candles lift off together. */
  const coat = new THREE.Group();
  const coatWedge = new THREE.Group();
  coat.add(coatWedge);
  cakeBody.add(coat);
  const [coatMain, coatPiece] = splitCoat(quality.segments);
  coat.add(mesh(coatMain, coatMaterial));
  coatWedge.add(mesh(coatPiece, coatMaterial));

  const cap = glazeCapProfile();
  const capPart = (start: number, length: number) =>
    mesh(
      mergeGeometries([
        lathe(cap, start, length, quality.segments, 0.8),
        cutFace(start, 0, COAT_RADIUS + 0.01, COAT_TOP - 0.004, GLAZE_TOP, -1, 0.8),
        cutFace(start + length, 0, COAT_RADIUS + 0.01, COAT_TOP - 0.004, GLAZE_TOP, 1, 0.8),
      ])!,
      glaze,
    );
  const capMain = capPart(MAIN_START, MAIN_LENGTH);
  const capPiece = capPart(WEDGE_START, WEDGE_ANGLE);
  coat.add(capMain);
  coatWedge.add(capPiece);
  await breathe();
  const dripMain = mesh(buildGlazeSide(MAIN_START, MAIN_LENGTH, quality), glaze);
  const dripPiece = mesh(buildGlazeSide(WEDGE_START, WEDGE_ANGLE, quality), glaze);
  coat.add(dripMain);
  coatWedge.add(dripPiece);
  await breathe();

  /* A piped pearl border at the foot: each one a little different, flattened by its own weight. */
  const pearlGeometry = keep(new THREE.SphereGeometry(0.031, 14, 10));
  const inWedge = (phi: number) => {
    const wrapped = ((phi + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
    return Math.abs(wrapped) < WEDGE_ANGLE / 2;
  };
  const random = seeded(19);
  const pearlAngles = Array.from({ length: quality.pearls }, (_, i) => MAIN_START + (i / quality.pearls) * TWO_PI);
  const placePearls = (angles: number[], parent: THREE.Group) => {
    const instanced = new THREE.InstancedMesh(pearlGeometry, pearl, angles.length);
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    const place = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    const matrix = new THREE.Matrix4();
    angles.forEach((phi, i) => {
      const size = 0.88 + random() * 0.24;
      scale.set(size, size * 0.84, size);
      place.set(Math.sin(phi) * (COAT_RADIUS + 0.018), 0.026 * size, Math.cos(phi) * (COAT_RADIUS + 0.018));
      turn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), phi);
      instanced.setMatrixAt(i, matrix.compose(place, turn, scale));
    });
    instanced.count = 0;
    parent.add(instanced);
    keep(instanced);
    return { mesh: instanced, total: angles.length };
  };
  const pearls = [placePearls(pearlAngles.filter((a) => !inWedge(a)), coat), placePearls(pearlAngles.filter(inWedge), coatWedge)];
  await breathe();

  /* A crown of raspberries: a dense outer ring, a second ring inside it, and a low heap at the heart. */
  const berryGeometry = keep(raspberryGeometry(quality.berryDetail));
  const rings = [
    { share: 0.46, radius: 0.88, wobble: 0.025, lift: 0 },
    { share: 0.34, radius: 0.66, wobble: 0.04, lift: 0.012 },
    { share: 0.2, radius: 0.36, wobble: 0.07, lift: 0.04 },
  ];
  let placed = 0;
  const placements = rings.flatMap((ring, ringIndex) => {
    const count = ringIndex === rings.length - 1 ? quality.berries - placed : Math.round(quality.berries * ring.share);
    placed += count;
    return Array.from({ length: count }, (_, i) => {
      const phi = ((i + random() * 0.45) / count) * TWO_PI + ringIndex * 0.37;
      const radius = ring.radius + (random() - 0.5) * ring.wobble * 2;
      const size = 1.12 + random() * 0.42;
      const position = new THREE.Vector3(Math.sin(phi) * radius, GLAZE_TOP + 0.062 * size + ring.lift, Math.cos(phi) * radius);
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 1.6, random() * TWO_PI, (random() - 0.5) * 1.6));
      return { phi, position, rotation, scale: size, order: ringIndex / 3 + i / count / 3, matrix: new THREE.Matrix4() };
    });
  });
  const placeBerries = (items: typeof placements, parent: THREE.Group) => {
    const instanced = new THREE.InstancedMesh(berryGeometry, berryMaterial, items.length);
    instanced.castShadow = true;
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const colour = new THREE.Color();
    items.forEach((_, i) => {
      colour.setHSL(0.975 + random() * 0.018, 0.86 + random() * 0.1, 0.27 + random() * 0.07);
      instanced.setColorAt(i, colour);
    });
    parent.add(instanced);
    keep(instanced);
    return { mesh: instanced, items };
  };
  const berries = [placeBerries(placements.filter((p) => !inWedge(p.phi)), coat), placeBerries(placements.filter((p) => inWedge(p.phi)), coatWedge)];
  await breathe();

  /* Mint leaves between the berries, flecks of gold leaf, and the shade each berry casts on the glaze. */
  const garnish: THREE.InstancedMesh[] = [];
  const scatter = (geometry: THREE.BufferGeometry, material: THREE.Material, spots: { phi: number; matrix: THREE.Matrix4; colour?: THREE.Color }[]) => {
    for (const [wanted, parent] of [[false, coat], [true, coatWedge]] as const) {
      const chosen = spots.filter((spot) => inWedge(spot.phi) === wanted);
      if (chosen.length === 0) continue;
      const instanced = new THREE.InstancedMesh(geometry, material, chosen.length);
      chosen.forEach((spot, i) => {
        instanced.setMatrixAt(i, spot.matrix);
        if (spot.colour) instanced.setColorAt(i, spot.colour);
      });
      instanced.visible = false;
      parent.add(instanced);
      keep(instanced);
      garnish.push(instanced);
    }
  };
  const composed = (position: THREE.Vector3, euler: THREE.Euler, scale: number) =>
    new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(euler), new THREE.Vector3().setScalar(scale));

  const blobMaterial = keep(new THREE.MeshBasicMaterial({ map: keep(softBlob()), transparent: true, depthWrite: false, toneMapped: false }));
  const blobShape = keep(new THREE.PlaneGeometry(0.27, 0.27));
  scatter(
    blobShape,
    blobMaterial,
    placements.map((p) => ({ phi: p.phi, matrix: composed(new THREE.Vector3(p.position.x, GLAZE_TOP + 0.0052, p.position.z), new THREE.Euler(-Math.PI / 2, 0, 0), p.scale) })),
  );
  const leafShape = keep(leafGeometry());
  const leafCount = quality.shadows ? 11 : 7;
  scatter(
    leafShape,
    leafMaterial,
    Array.from({ length: leafCount }, (_, i) => {
      const phi = (i / leafCount) * TWO_PI + random() * 0.5;
      const radius = i % 2 === 0 ? 0.77 : 0.52;
      const tilt = -1.05 - random() * 0.35;
      return {
        phi,
        colour: new THREE.Color().setHSL(0.35 + random() * 0.04, 0.46, 0.085 + random() * 0.045),
        matrix: composed(new THREE.Vector3(Math.sin(phi) * radius, COAT_TOP + 0.105, Math.cos(phi) * radius), new THREE.Euler(tilt, phi + (random() - 0.5) * 1.4, 0, "YXZ"), 0.46 + random() * 0.26),
      };
    }),
  );
  scatter(
    keep(goldFlakeGeometry()),
    flakeMaterial,
    Array.from({ length: 56 }, () => {
      const phi = random() * TWO_PI;
      const radius = 0.15 + random() * 0.86;
      return {
        phi,
        matrix: composed(new THREE.Vector3(Math.sin(phi) * radius, GLAZE_TOP + 0.0065, Math.cos(phi) * radius), new THREE.Euler(-Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * TWO_PI), 0.45 + random() * 0.6),
      };
    }),
  );
  await breathe();

  /* Tall wavy gold candles, a signature of the real feed. */
  const candles = new THREE.Group();
  coat.add(candles);
  const flameMap = keep(flameTexture());
  const flames: THREE.Sprite[] = [];
  const halos: THREE.Sprite[] = [];
  const candleSpots = [[0.17, 2.5, 0.72], [0.27, 3.15, 0.58], [0.1, 4.1, 0.8], [0.3, 3.9, 0.5], [0.2, 1.75, 0.64]];
  candleSpots.forEach(([radius, phi, height], i) => {
    const waves = 3.4 + i * 0.3;
    const points = Array.from({ length: 24 }, (_, step) => {
      const k = step / 23;
      const sway = 0.02 + 0.018 * k;
      return new THREE.Vector3(Math.sin(k * Math.PI * waves + i) * sway, k * height, Math.cos(k * Math.PI * waves * 0.8 + i * 2) * sway);
    });
    const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 96, 0.0115, 8), gold);
    const holder = new THREE.Group();
    holder.position.set(Math.sin(phi) * radius, COAT_TOP + 0.01, Math.cos(phi) * radius);
    holder.add(tube);
    const flameMaterial = keep(new THREE.SpriteMaterial({ map: flameMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    const flame = new THREE.Sprite(flameMaterial);
    flame.position.copy(points[points.length - 1]);
    flame.position.y += 0.056;
    holder.add(flame);
    flames.push(flame);
    // A wide, faint halo, which reads as the glow a lens picks up around a candle.
    const haloMaterial = keep(new THREE.SpriteMaterial({ map: flameMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    const halo = new THREE.Sprite(haloMaterial);
    halo.position.copy(flame.position);
    halo.scale.set(0.7, 0.7, 1);
    holder.add(halo);
    halos.push(halo);
    candles.add(holder);
  });
  const flameLight = new THREE.PointLight("#ffb46e", 0, 5.2, 1.8);
  flameLight.position.set(0, COAT_TOP + 0.9, 0.05);
  coat.add(flameLight);

  return {
    root,
    layers,
    coat,
    coatWedge,
    coatClip,
    caps: [capMain, capPiece],
    drips: [dripMain, dripPiece],
    pearls,
    berries,
    candles,
    flames,
    halos,
    flameLight,
    garnish,
    sliceFaces: [sliceMain, slicePiece],
    sliceWedge,
    dispose: () => disposables.forEach((item) => item.dispose()),
  };
}

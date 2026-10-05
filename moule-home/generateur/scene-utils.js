'use strict';
// Elements de decor partages par les scenes (table en bois, chiffon, ombres de contact, primitives)
function wood(wp) {
  const x = wp[0], y = wp[1];
  const W = 145, yy = y + 2000;
  const plank = Math.floor(yy / W), ph = plank * 2.39;
  const v = yy % W;
  const seam = (v < 0.9 || v > W - 0.9) ? 0.62 : 1;
  const tone = 0.93 + 0.07 * Math.sin(ph * 3.7) + 0.035 * Math.sin(x * 0.0031 + ph);
  const ring = 0.5 + 0.5 * Math.sin(y * 0.42 + 3.2 * Math.sin(x * 0.0058 + ph) + 1.4 * Math.sin(x * 0.019 + ph * 2.1));
  const g = tone * (1 - 0.13 * Math.pow(ring, 14)) * seam;
  return [0.74 * g, 0.57 * g, 0.40 * g];
}
function cloth(wp) {
  const g = 0.94 + 0.035 * Math.sin(wp[0] * 1.6) * Math.sin(wp[1] * 1.6) + 0.025 * Math.sin(wp[0] * 0.08 + wp[1] * 0.05);
  return [0.80 * g, 0.83 * g, 0.86 * g];
}
function table(x0, y0, x1, y1) {
  const t = [], n = 50;
  const sx = (x1 - x0) / Math.ceil((x1 - x0) / n), sy = (y1 - y0) / Math.ceil((y1 - y0) / n);
  for (let x = x0; x < x1 - 1e-6; x += sx) for (let y = y0; y < y1 - 1e-6; y += sy) {
    const a = x + sx, b = y + sy;
    t.push(x, y, 0, a, y, 0, a, b, 0, x, y, 0, a, b, 0, x, b, 0);
  }
  return { tris: new Float64Array(t), color: [0.7, 0.55, 0.4], colorFn: wood, spec: 0.04, noCast: true, twoSided: true, isTable: true };
}
function boxTris(x0, y0, z0, x1, y1, z1) {
  const P = (x, y, z) => [x, y, z];
  const q = [
    [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
    [P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), P(x1, y0, z0)],
    [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)],
    [P(x1, y1, z0), P(x0, y1, z0), P(x0, y1, z1), P(x1, y1, z1)],
    [P(x0, y1, z0), P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1)],
    [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)],
  ];
  const t = [];
  for (const [a, b, c, d] of q) t.push(...a, ...b, ...c, ...a, ...c, ...d);
  return new Float64Array(t);
}
// solide de revolution autour de z ; profil [[r, z], ...] de bas en haut ; xf optionnel (rotation + translation)
function latheTris(profile, N, xf) {
  const t = [];
  const P = (r, z, th) => { const p = [r * Math.cos(th), r * Math.sin(th), z]; return xf ? xf(p) : p; };
  for (let k = 0; k < profile.length - 1; k++) {
    const [r1, z1] = profile[k], [r2, z2] = profile[k + 1];
    for (let j = 0; j < N; j++) {
      const a = 2 * Math.PI * j / N, b = 2 * Math.PI * (j + 1) / N;
      const A = P(r1, z1, a), B = P(r1, z1, b), C = P(r2, z2, b), D = P(r2, z2, a);
      if (r1 > 0) t.push(...A, ...B, ...C);
      if (r2 > 0) t.push(...A, ...C, ...D);
    }
  }
  return new Float64Array(t);
}
const cylZ = (cx, cy, z0, z1, r, N = 40) => latheTris([[0, z0], [r, z0], [r, z1], [0, z1]], N, p => [p[0] + cx, p[1] + cy, p[2]]);
// cylindre d'axe y (face vers l'avant)
const cylY = (cx, y0, y1, cz, r, N = 40) => latheTris([[0, y0], [r, y0], [r, y1], [0, y1]], N, p => [p[0] + cx, p[2], p[1] + cz]);

function hull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
function footprints(objs, h) {
  const out = [];
  for (const o of objs) {
    if (o.noCast) continue;
    const pts = [];
    for (let k = 0; k < o.tris.length; k += 3) if (Math.abs(o.tris[k + 2] - h) < 0.6) pts.push([o.tris[k], o.tris[k + 1]]);
    if (pts.length >= 2) out.push(hull(pts));
  }
  return out;
}
function distPoly(x, y, poly) {
  const n = poly.length;
  if (n === 1) return Math.hypot(x - poly[0][0], y - poly[0][1]);
  let inside = n >= 3, best = Infinity;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const ex = b[0] - a[0], ey = b[1] - a[1], l2 = ex * ex + ey * ey || 1e-12;
    let t = ((x - a[0]) * ex + (y - a[1]) * ey) / l2; t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - a[0] - t * ex, y - a[1] - t * ey));
    if (ex * (y - a[1]) - ey * (x - a[0]) < 0) inside = false;
  }
  return inside ? 0 : best;
}
function withAO(colorFn, polys, k = 0.42, r = 11) {
  return wp => {
    let f = 1;
    for (const p of polys) { const d = distPoly(wp[0], wp[1], p); if (d < 6 * r) f *= 1 - k * Math.exp(-d / r); }
    const c = colorFn(wp);
    return [c[0] * f, c[1] * f, c[2] * f];
  };
}
function grounded(objs) {
  const polys = footprints(objs, 0);
  for (const o of objs) if (o.isTable) o.colorFn = withAO(wood, polys);
  return objs;
}
// projection d'un point 3D dans l'image (memes conventions que render.js)
function projector(cam, w, h) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
  const f = nrm(sub(cam.target, cam.eye)), r = nrm(cross(f, cam.up)), u = cross(r, f);
  const focal = (h / 2) / Math.tan((cam.fov || 30) * Math.PI / 360);
  return p => { const d = sub(p, cam.eye); const z = dot(d, f); return [w / 2 + focal * dot(d, r) / z, h / 2 - focal * dot(d, u) / z]; };
}
module.exports = { wood, cloth, table, boxTris, latheTris, cylZ, cylY, hull, footprints, distPoly, withAO, grounded, projector };

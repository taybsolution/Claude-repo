'use strict';
// Images 3D des etapes du demoulage (moule H), a partir des vrais fichiers
const path = require('path');
const fs = require('fs');
const M = require('./moules.js');
const R = require('./render.js');
const out = process.argv[2] || 'out';
fs.mkdirSync(path.join(out, 'apercu'), { recursive: true });

// ---------- geometrie
const all = M.buildAll();
const L = all.letters;
const PIN = all.pins;

// ---------- couleurs / matieres
const PLA = [0.30, 0.52, 0.82], ORANGE = [0.95, 0.52, 0.15], PLATRE = [0.95, 0.945, 0.92];
function wood(wp) {
  const x = wp[0], y = wp[1];
  const W = 145, yy = y + 2000;
  const plank = Math.floor(yy / W), ph = plank * 2.39;
  const v = yy % W;
  const seam = (v < 0.9 || v > W - 0.9) ? 0.62 : 1;
  const tone = 0.93 + 0.07 * Math.sin(ph * 3.7) + 0.035 * Math.sin(x * 0.0031 + ph);
  const ring = 0.5 + 0.5 * Math.sin(y * 0.42 + 3.2 * Math.sin(x * 0.0058 + ph) + 1.4 * Math.sin(x * 0.019 + ph * 2.1));
  const lines = Math.pow(ring, 14);
  const g = tone * (1 - 0.13 * lines) * seam;
  return [0.74 * g, 0.57 * g, 0.40 * g];
}
function cloth(wp) {
  const g = 0.94 + 0.035 * Math.sin(wp[0] * 1.6) * Math.sin(wp[1] * 1.6) + 0.025 * Math.sin(wp[0] * 0.08 + wp[1] * 0.05);
  return [0.80 * g, 0.83 * g, 0.86 * g];
}
function table(x0, y0, x1, y1) {
  // plan decoupe en dalles : un triangle derriere la camera n'efface plus toute la table
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
// rotations
const rotX = a => { const c = Math.cos(a), s = Math.sin(a); return p => [p[0], c * p[1] - s * p[2], s * p[1] + c * p[2]]; };
const rotZ = a => { const c = Math.cos(a), s = Math.sin(a); return p => [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]]; };
const add = (p, t) => [p[0] + t[0], p[1] + t[1], p[2] + t[2]];

// repere physique du moule (miroir x => triangles a retourner)
function frame(name) {
  const { mold } = L[name];
  const bx = mold.box;
  return { bx, wx: bx.bx1 - bx.bx0, wy: bx.by1 - bx.by0, zt: bx.zt, toPhys: p => [bx.bx1 - p[0], p[1] - bx.by0, p[2]] };
}
function pinInMold(name, pin, pull, post) {
  const f = frame(name);
  const xf = q => post(f.toPhys([pin.x + q[0], f.bx.by1 + M.P.flangeT + pull - q[2], pin.zc + q[1]]));
  return { tris: R.meshTris(PIN[pin.kind].mesh, xf, true), color: ORANGE, spec: 0.3 };
}
// tige couchee sur la table (repose sur le disque et sur le bout)
function pinLying(kind, X, Y, ang) {
  const len = PIN[kind].length, rt = M.PIN_KIND[kind].rTip, rf = M.PIN_KIND[kind].r + M.P.flangeExtra;
  const phi = Math.atan((rf - rt) / (len - rt));
  const d = [Math.cos(phi), 0, -Math.sin(phi)], v = [0, 1, 0], u = [-Math.sin(phi), 0, -Math.cos(phi)];
  const oz = rf * Math.cos(phi) + M.P.flangeT * Math.sin(phi);
  const rz = rotZ(ang);
  const xf = q => add(rz([q[0] * u[0] + q[1] * v[0] + q[2] * d[0], q[0] * u[1] + q[1] * v[1] + q[2] * d[1], oz + q[0] * u[2] + q[1] * v[2] + q[2] * d[2]]), [X, Y, 0]);
  return { tris: R.meshTris(PIN[kind].mesh, xf, false), color: ORANGE, spec: 0.3 };
}
// lettre debout (face avant vers +y), posee sur la table
function letterStanding(name, X, Y, color) {
  const f = frame(name), { pos } = L[name];
  const st = p => { const q = f.toPhys(p); return [q[0], -q[2], q[1]]; };
  let mnx = Infinity, mxx = -Infinity, mnz = Infinity, mny = Infinity, mxy = -Infinity;
  for (const p of pos.mesh.v) { const q = st(p); mnx = Math.min(mnx, q[0]); mxx = Math.max(mxx, q[0]); mnz = Math.min(mnz, q[2]); mny = Math.min(mny, q[1]); mxy = Math.max(mxy, q[1]); }
  const xf = p => { const q = st(p); return [q[0] - (mnx + mxx) / 2 + X, q[1] - (mny + mxy) / 2 + Y, q[2] - mnz]; };
  return { obj: { tris: R.meshTris(pos.mesh, xf, true), color: color || PLATRE, spec: 0.04 }, width: mxx - mnx, depth: mxy - mny };
}

// ---------- ombres de contact (occlusion douce autour des points en appui)
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
const OPT = { w: 1200, h: 800, ss: 2, bias: 0.7, vignette: 0.22, bgTop: [0.9, 0.88, 0.85], bgBot: [0.8, 0.78, 0.75] };
const shots = [];
function shoot(file, objs, cam, light, fill) {
  grounded(objs);
  const img = R.render(objs, cam, Object.assign({}, OPT, { light, fill }));
  R.writePNG(path.join(out, 'apercu', file), OPT.w, OPT.h, img);
  shots.push(file);
  console.log('image', file);
}

const H = frame('H');
const { B: BH, mold: moldH, pos: posH } = L.H;
const id = p => p;

// ---------- 1. platre coule et arase, tiges en place
{
  const objs = [
    { tris: R.meshTris(moldH.mesh, H.toPhys, true), color: PLA, spec: 0.3 },
    { tris: R.meshTris(posH.mesh, H.toPhys, true), color: PLATRE, spec: 0.08 },
    ...BH.def.pins.map(p => pinInMold('H', p, 0, id)),
    table(-900, -700, 1100, 1100),
  ];
  shoot('demoulage-1-platre-coule.png', objs,
    { eye: [-230, H.wy + 210, 300], target: [H.wx / 2 + 10, H.wy / 2 + 15, 12], up: [0, 0, 1], fov: 36 },
    [-0.35, 0.55, 0.76], [0.6, -0.4, 0.5]);
}

// ---------- 2. retirer les tiges (une sortie, posee sur la table ; l'autre en cours)
{
  const [p0, p1] = BH.def.pins;
  const objs = [
    { tris: R.meshTris(moldH.mesh, H.toPhys, true), color: PLA, spec: 0.3 },
    { tris: R.meshTris(posH.mesh, H.toPhys, true), color: PLATRE, spec: 0.08 },
    pinInMold('H', p1, 62, id),
    pinLying('longue', H.wx + 30, H.wy + 95, Math.PI * 0.93),
    table(-900, -700, 1100, 1100),
  ];
  shoot('demoulage-2-retirer-tiges.png', objs,
    { eye: [H.wx / 2 + 210, H.wy + 330, 230], target: [H.wx / 2 + 10, H.wy / 2 + 55, 18], up: [0, 0, 1], fov: 36 },
    [0.35, 0.6, 0.72], [-0.6, 0.2, 0.5]);
}

// ---------- 3. moule retourne sur un chiffon, puis souleve : la lettre reste, cotes vers le haut
{
  const towelH = 3;
  const flip = p => [H.wx - p[0], p[1], H.zt + towelH - p[2]];      // rotation de 180 degres autour de y
  const th = 72 * Math.PI / 180, yh = H.wy, zh = towelH;
  const hinge = p => [p[0], yh + (p[1] - yh) * Math.cos(th) + (p[2] - zh) * Math.sin(th), zh - (p[1] - yh) * Math.sin(th) + (p[2] - zh) * Math.cos(th)];
  const objs = [
    { tris: R.meshTris(moldH.mesh, p => hinge(flip(H.toPhys(p))), true), color: PLA, spec: 0.3 },
    { tris: R.meshTris(posH.mesh, p => flip(H.toPhys(p)), true), color: PLATRE, spec: 0.05 },
    { tris: boxTris(-70, -60, 0, H.wx + 70, H.wy + 40, towelH), color: [0.8, 0.83, 0.86], colorFn: cloth, spec: 0.0, isTowel: true },
    pinLying('longue', H.wx + 120, 40, Math.PI * 0.5),
    pinLying('longue', H.wx + 165, 30, Math.PI * 0.53),
    table(-900, -800, 1100, 1100),
  ];
  const towel = objs.find(o => o.isTowel);
  towel.colorFn = withAO(cloth, footprints(objs.filter(o => !o.isTowel), towelH), 0.38, 9);
  shoot('demoulage-3-retourner.png', objs,
    { eye: [H.wx / 2 - 150, -330, 360], target: [H.wx / 2 + 15, H.wy / 2 + 10, 25], up: [0, 0, 1], fov: 38 },
    [-0.4, -0.45, 0.8], [0.6, -0.2, 0.5]);
}

// ---------- 4. la lettre debout, le moule vide a cote
{
  const st = letterStanding('H', 0, 0);
  const moldX = -st.width / 2 - 40 - H.wx, moldY = -150;
  const objs = [
    st.obj,
    { tris: R.meshTris(moldH.mesh, p => add(rotZ(-0.35)(H.toPhys(p)), [moldX + 40, moldY, 0]), true), color: PLA, spec: 0.3 },
    pinLying('longue', 120, -10, Math.PI * 0.62),
    pinLying('longue', 150, 25, Math.PI * 0.66),
    table(-1100, -900, 900, 900),
  ];
  shoot('demoulage-4-lettre-sortie.png', objs,
    { eye: [120, 520, 330], target: [-80, -20, 70], up: [0, 0, 1], fov: 36 },
    [-0.35, 0.6, 0.72], [0.6, 0.3, 0.4]);
}

// ---------- 5. les quatre lettres brutes de demoulage, devant leurs moules
{
  const objs = [];
  const order = ['H', 'O', 'M', 'E'];
  const gap = 22;
  const items = order.map(n => letterStanding(n, 0, 0));
  const total = items.reduce((s, it) => s + it.width, 0) + gap * (order.length - 1);
  // camera du cote +y : la droite de l'image est vers -x, donc H a droite des x
  let x = total / 2;
  order.forEach((n, i) => {
    const w = items[i].width;
    const it = letterStanding(n, x - w / 2, 40);
    objs.push(it.obj);
    x -= w + gap;
  });
  let mx = 470;
  order.forEach(n => {
    const f = frame(n);
    const cx = mx - f.wx / 2;
    objs.push({ tris: R.meshTris(L[n].mold.mesh, p => add(rotZ(Math.PI)(f.toPhys(p)), [cx + f.wx / 2, -330 + f.wy, 0]), true), color: PLA, spec: 0.3 });
    mx -= f.wx + 30;
  });
  objs.push(table(-1400, -900, 1400, 1000));
  shoot('demoulage-5-les-4-lettres.png', objs,
    { eye: [60, 860, 640], target: [0, -90, 40], up: [0, 0, 1], fov: 40 },
    [-0.3, 0.55, 0.78], [0.6, 0.35, 0.4]);
}
fs.writeFileSync(path.join(out, 'apercu', 'demoulage.json'), JSON.stringify(shots));

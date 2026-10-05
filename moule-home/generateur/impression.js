'use strict';
// Images 3D de l'impression du moule du H dans l'Ender-3 V3 SE, couche par couche,
// puis les pieces imprimees et le resultat final, a partir des vrais fichiers
const path = require('path');
const fs = require('fs');
const M = require('./moules.js');
const R = require('./render.js');
const U = require('./scene-utils.js');
const MA = require('./machine.js');
const { sub3, cross3, norm3, len3 } = require('./geom.js');
const out = process.argv[2] || 'out';
const quick = process.argv.includes('--rapide');
fs.mkdirSync(path.join(out, 'apercu'), { recursive: true });

const all = M.buildAll();
const L = all.letters, PIN = all.pins;
const PLA = [0.30, 0.52, 0.82], ORANGE = [0.95, 0.52, 0.15];
const { cx, top: bedTop, nozzleY } = MA.BEDINFO;
const shade = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const SQ = Math.SQRT1_2;

// ---------- coupe horizontale d'un ensemble de triangles (9 nombres par triangle) a la hauteur z
function slice(tris, z) {
  const segs = [];
  for (let k = 0; k < tris.length; k += 9) {
    const P = [0, 3, 6].map(o => [tris[k + o], tris[k + o + 1], tris[k + o + 2]]);
    const s = P.map(p => (p[2] - z) || 1e-9);
    const pts = [];
    for (let e = 0; e < 3; e++) {
      const a = P[e], b = P[(e + 1) % 3], sa = s[e], sb = s[(e + 1) % 3];
      if ((sa > 0) !== (sb > 0)) { const t = sa / (sa - sb); pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    if (pts.length === 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
  }
  const c = 2;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of segs) { x0 = Math.min(x0, g[0], g[2]); y0 = Math.min(y0, g[1], g[3]); x1 = Math.max(x1, g[0], g[2]); y1 = Math.max(y1, g[1], g[3]); }
  x0 -= c; y0 -= c;
  const nx = Math.ceil((x1 - x0) / c) + 2, ny = Math.ceil((y1 - y0) / c) + 2;
  const cells = Array.from({ length: nx * ny }, () => []), rows = Array.from({ length: ny }, () => []);
  for (const g of segs) {
    const i0 = Math.floor((Math.min(g[0], g[2]) - x0) / c), i1 = Math.floor((Math.max(g[0], g[2]) - x0) / c);
    const j0 = Math.floor((Math.min(g[1], g[3]) - y0) / c), j1 = Math.floor((Math.max(g[1], g[3]) - y0) / c);
    for (let j = j0; j <= j1; j++) { rows[j].push(g); for (let i = i0; i <= i1; i++) cells[j * nx + i].push(g); }
  }
  const segDist = (x, y, g) => {
    const ex = g[2] - g[0], ey = g[3] - g[1], l2 = ex * ex + ey * ey || 1e-12;
    const t = Math.max(0, Math.min(1, ((x - g[0]) * ex + (y - g[1]) * ey) / l2));
    return Math.hypot(x - g[0] - t * ex, y - g[1] - t * ey);
  };
  return {
    segs,
    // regle pair-impair sur une demi-droite vers +x
    inside(x, y) {
      const j = Math.floor((y - y0) / c);
      if (j < 0 || j >= ny) return false;
      let n = 0;
      for (const g of rows[j]) if ((g[1] > y) !== (g[3] > y) && g[0] + (y - g[1]) * (g[2] - g[0]) / (g[3] - g[1]) > x) n++;
      return (n & 1) === 1;
    },
    // distance au bord la plus proche (exacte jusqu'a 2 mm, sinon Infinity ou une valeur plus grande)
    dist(x, y) {
      const i = Math.floor((x - x0) / c), j = Math.floor((y - y0) / c);
      let best = Infinity;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        for (const g of cells[jj * nx + ii]) { const d = segDist(x, y, g); if (d < best) best = d; }
      }
      return best;
    },
  };
}

// ---------- dessus de la derniere couche : 3 perimetres pleins, puis remplissage 15 % en grille a 45 degres
function printedTop(sl, color, opt = {}) {
  const per = 1.35, S = 6, lw = 0.32;
  return p => {
    const x = p[0], y = p[1];
    if (!sl.inside(x, y)) return null;
    const d = sl.dist(x, y);
    if (opt.done && !opt.done(x, y, d < per)) return null;
    if (d < per) return shade(color, 0.97 + 0.05 * Math.cos(2 * Math.PI * d / 0.45));
    if (opt.solid) return shade(color, 0.95 + 0.05 * Math.cos(2 * Math.PI * (x - y) * SQ / 0.6));
    const a = (x + y) * SQ, b = (x - y) * SQ;
    const ma = ((a % S) + S) % S, mb = ((b % S) + S) % S;
    const dl = Math.min(ma, S - ma, mb, S - mb);
    if (dl < lw) return color;
    return shade(color, 0.2 + 0.3 * Math.exp(-(dl - lw) / 0.8));
  };
}

// ---------- moule du H pose sur le plateau, le point (xm, ym) du moule sous la buse
const H = L.H, hb = H.mold.box, wx = hb.bx1 - hb.bx0, wy = hb.by1 - hb.by0, zt = hb.zt;
const toPhys = (bx, p) => [bx.bx1 - p[0], p[1] - bx.by0, p[2]];
function placeMold(xm, ym) {
  const bedY = nozzleY - ym + wy / 2, ox = cx - wx / 2, oy = bedY - wy / 2;
  return { bedY, headX: ox + xm, ox, oy, xf: p => { const q = toPhys(hb, p); return [q[0] + ox, q[1] + oy, q[2] + bedTop]; } };
}
function moldPrinting(pl, h, opt) {
  const tris = R.meshTris(H.mold.mesh, pl.xf, true);
  if (h == null) return { tris, color: PLA, spec: 0.3 };
  const z = bedTop + h, sl = slice(tris, z);
  return { tris, color: PLA, spec: 0.3, clip: { n: [0, 0, 1], d: z }, capFn: printedTop(sl, PLA, opt) };
}
// bordure (brim) de 5 mm : une seule couche autour du moule
function brim(pl, w = 5) {
  const { ox, oy } = pl, z0 = bedTop, z1 = bedTop + 0.2;
  const t = [U.boxTris(ox - w, oy - w, z0, ox + wx + w, oy, z1), U.boxTris(ox - w, oy + wy, z0, ox + wx + w, oy + wy + w, z1),
    U.boxTris(ox - w, oy, z0, ox, oy + wy, z1), U.boxTris(ox + wx, oy, z0, ox + wx + w, oy + wy, z1)];
  const tris = new Float64Array(t.reduce((s, a) => s + a.length, 0));
  let o = 0; for (const a of t) { tris.set(a, o); o += a.length; }
  const dRect = (x, y) => Math.hypot(Math.max(ox - x, x - ox - wx, 0), Math.max(oy - y, y - oy - wy, 0));
  return { tris, color: PLA, spec: 0.3, colorFn: p => shade(PLA, 0.96 + 0.05 * Math.cos(2 * Math.PI * dRect(p[0], p[1]) / 0.45)) };
}

// ---------- prise de vue
const W = quick ? 600 : 1200, Hh = quick ? 400 : 800;
const OPT = { w: W, h: Hh, ss: quick ? 1 : 2, bias: 0.5, vignette: 0.2, bgTop: [0.9, 0.88, 0.85], bgBot: [0.8, 0.78, 0.75] };
function shoot(file, objs, cam, light, fill, extra) {
  U.grounded(objs);
  const t0 = Date.now();
  const o = Object.assign({}, OPT, { light, fill }, extra || {});
  const img = R.render(objs, cam, o);
  R.writePNG(path.join(out, 'apercu', file), o.w, o.h, img);
  console.log('image', file, ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}
const tableObj = () => U.table(-700, -700, 1100, 1100);
const camPrint = { eye: [cx - 285, -310, bedTop + 350], target: [cx + 6, 118, bedTop + 34], up: [0, 0, 1], fov: 31 };
const LIGHT = [-0.35, -0.5, 0.8], FILL = [0.6, -0.3, 0.45];
const only = (process.argv.find(a => a.startsWith('--seulement=')) || '').split('=')[1];
const want = n => !only || only.split(',').includes(String(n));

// ---------- 1. premiere couche : la bordure est faite, le fond se remplit en diagonale
if (want(1)) {
  const vDone = -30;                                      // frontiere du remplissage (repere du moule)
  const ymN = wy - 2.2, xmN = vDone / SQ + ymN;
  const pl = placeMold(xmN, ymN);
  const done = (x, y, perim) => perim || ((x - pl.ox) - (y - pl.oy)) * SQ > vDone;
  const objs = [...MA.printer({ headX: pl.headX, tipZ: bedTop + 0.2, bedY: pl.bedY, filament: PLA }), brim(pl), moldPrinting(pl, 0.2, { solid: true, done }), tableObj()];
  shoot('impression-1-premiere-couche.png', objs, camPrint, LIGHT, FILL);
}
// ---------- 2. le fond et les cotes de la face avant sont faits, les parois commencent
if (want(2)) {
  const pl = placeMold(34, wy - 5.5);
  const objs = [...MA.printer({ headX: pl.headX, tipZ: bedTop + 5, bedY: pl.bedY, filament: PLA }), brim(pl), moldPrinting(pl, 5), tableObj()];
  shoot('impression-2-fond-et-cotes.png', objs, camPrint, LIGHT, FILL);
}
// ---------- 3. a mi-hauteur : parois avec remplissage en grille, trous des tiges dans la paroi du haut
if (want(3)) {
  const pl = placeMold(wx / 2, wy - 5.5);
  const objs = [...MA.printer({ headX: pl.headX, tipZ: bedTop + 26, bedY: pl.bedY, filament: PLA }), brim(pl), moldPrinting(pl, 26), tableObj()];
  shoot('impression-3-parois.png', objs, camPrint, LIGHT, FILL);
}
// ---------- 4. moule termine, la tete remonte et le plateau avance
if (want(4)) {
  const pl = placeMold(wx / 2, wy / 2 + 28);
  const objs = [...MA.printer({ headX: cx + 75, tipZ: bedTop + zt + 45, bedY: pl.bedY, filament: PLA }), brim(pl), moldPrinting(pl, null), tableObj()];
  shoot('impression-4-moule-fini.png', objs, camPrint, LIGHT, FILL);
}
// ---------- 5. les deux tiges du H, imprimees debout, disque sur le plateau ; la buse sur la tige de droite
if (want(5)) {
  const h = 70, sp = 64, z = bedTop + h;
  const rAt = Math.max(...slice(R.meshTris(PIN.H.mesh, q => [q[0], q[1], bedTop + q[2]], false), z).segs.map(g => Math.hypot(g[0], g[1])));
  const pinY = nozzleY - (rAt - 0.7);
  const pins = [-sp / 2, sp / 2].map(dx => {
    const tris = R.meshTris(PIN.H.mesh, q => [cx + dx + q[0], pinY + q[1], bedTop + q[2]], false);
    return { tris, color: ORANGE, spec: 0.3, clip: { n: [0, 0, 1], d: z }, capFn: printedTop(slice(tris, z), ORANGE) };
  });
  const objs = [...MA.printer({ headX: cx + sp / 2, tipZ: z, bedY: pinY, filament: ORANGE }), ...pins, tableObj()];
  shoot('impression-5-tiges.png', objs, { eye: [cx - 205, -262, bedTop + 268], target: [cx + 8, pinY + 5, bedTop + 66], up: [0, 0, 1], fov: 31 }, LIGHT, FILL);
}

// ---------- 6. tout est imprime : les 4 moules et les 6 tiges sur la table
function physMold(name, xf) {
  const bx = L[name].mold.box;
  return { tris: R.meshTris(L[name].mold.mesh, p => xf(toPhys(bx, p)), true), color: PLA, spec: 0.3 };
}
const rotZ = a => { const c = Math.cos(a), s = Math.sin(a); return p => [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]]; };
if (want(6)) {
  const objs = [];
  const sz = n => { const b = L[n].mold.box; return [b.bx1 - b.bx0, b.by1 - b.by0]; };
  const gap = 34;
  const place = [['H', -1, 1], ['O', 1, 1], ['M', -1, -1], ['E', 1, -1]];
  for (const [n, sx, sy] of place) {
    const [a, b] = sz(n);
    const x0 = sx < 0 ? -gap / 2 - a : gap / 2, y0 = sy < 0 ? -gap / 2 - b : gap / 2;
    objs.push(physMold(n, q => [q[0] + x0, q[1] + y0, q[2]]));
  }
  // tiges debout devant : 2 H, 2 M, 1 E, 1 O
  const kinds = ['H', 'H', 'M', 'M', 'E', 'O'];
  const rf = k => M.PIN_KIND[k].r + M.P.flangeExtra;
  const total = kinds.reduce((s, k) => s + 2 * rf(k), 0) + 16 * (kinds.length - 1);
  let x = -total / 2;
  for (const k of kinds) {
    const r = rf(k);
    objs.push({ tris: R.meshTris(PIN[k].mesh, q => [x + r + q[0], -gap / 2 - 168 - 62 + q[1], q[2]], false), color: ORANGE, spec: 0.3 });
    x += 2 * r + 16;
  }
  objs.push(U.table(-1200, -1200, 1200, 1200));
  shoot('impression-6-tout-imprime.png', objs, { eye: [-110, -600, 590], target: [0, -96, 10], up: [0, 0, 1], fov: 34 }, [-0.4, -0.45, 0.8], [0.6, -0.2, 0.5]);
}

// ---------- 7. resultat final : les lettres en platre peintes, avec des fleurs sechees
function letterStanding(name) {
  const bx = L[name].mold.box, { pos, B } = L[name];
  const st = p => { const q = toPhys(bx, p); return [q[0], -q[2], q[1]]; };
  let mnx = Infinity, mxx = -Infinity, mnz = Infinity, mny = Infinity, mxy = -Infinity;
  for (const p of pos.mesh.v) { const q = st(p); mnx = Math.min(mnx, q[0]); mxx = Math.max(mxx, q[0]); mnz = Math.min(mnz, q[2]); mny = Math.min(mny, q[1]); mxy = Math.max(mxy, q[1]); }
  return { B, pos, width: mxx - mnx, at: (X, Y) => p => { const q = st(p); return [q[0] - (mnx + mxx) / 2 + X, q[1] - (mny + mxy) / 2 + Y, q[2] - mnz]; } };
}
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
function frameOf(w) {
  w = norm3(w);
  const u = norm3(cross3(Math.abs(w[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], w)), v = cross3(w, u);
  return [u, v, w];
}
// tige : tube ouvert entre a et b
function tube(t, a, b, r, N = 7) {
  const [u, v] = frameOf(sub3(b, a));
  for (let j = 0; j < N; j++) {
    const q = ang => add3(mul3(u, r * Math.cos(ang)), mul3(v, r * Math.sin(ang)));
    const e0 = q(2 * Math.PI * j / N), e1 = q(2 * Math.PI * (j + 1) / N);
    t.push(...add3(a, e0), ...add3(a, e1), ...add3(b, e1), ...add3(a, e0), ...add3(b, e1), ...add3(b, e0));
  }
}
// ellipsoide : demi-axe ra selon l'axe, rayon rr autour
function blob(t, c, axis, ra, rr, N = 12, Mm = 8) {
  const [u, v, w] = frameOf(axis);
  const P = (th, ph) => add3(c, add3(mul3(w, ra * Math.cos(ph)), add3(mul3(u, rr * Math.sin(ph) * Math.cos(th)), mul3(v, rr * Math.sin(ph) * Math.sin(th)))));
  for (let i = 0; i < Mm; i++) for (let j = 0; j < N; j++) {
    const p0 = Math.PI * i / Mm, p1 = Math.PI * (i + 1) / Mm, t0 = 2 * Math.PI * j / N, t1 = 2 * Math.PI * (j + 1) / N;
    const A = P(t0, p0), B = P(t1, p0), C = P(t1, p1), D = P(t0, p1);
    if (i > 0) t.push(...A, ...B, ...C);
    if (i < Mm - 1) t.push(...A, ...C, ...D);
  }
}
// tige courbee : points le long d'un arc qui part de p0 dans la direction d0 et s'incline vers dir
function stemPath(p0, d0, dir, len, n = 8) {
  const pts = [p0];
  let p = p0;
  for (let i = 1; i <= n; i++) {
    const s = i / n, d = norm3(add3(mul3(d0, 1 - s * s), mul3(dir, s * s)));
    p = add3(p, mul3(d, len / n));
    pts.push(p);
  }
  return pts;
}
const fl = (tris, color, spec) => ({ tris: new Float64Array(tris), color, spec: spec || 0.04, twoSided: true });
function bouquet(kind, top, holeR, seed) {
  // nombres pseudo-aleatoires reproductibles
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const stems = [], heads = [], leaves = [];
  const base = add3(top, [0, 0, -25]);
  const up = [0, 0, 1];
  if (kind === 'ble') {
    // epis de ble seche : 3 tiges par trou, epi fin de 5 cm
    for (let k = 0; k < 3; k++) {
      const a = 2 * Math.PI * k / 3 + rnd() * 0.8;
      const lean = norm3([Math.cos(a) * 0.28 + 0.06, Math.sin(a) * 0.14, 1]);
      const pts = stemPath(add3(base, [Math.cos(a) * holeR * 0.4, Math.sin(a) * holeR * 0.3, 0]), up, lean, 150 + 38 * rnd());
      for (let i = 0; i < pts.length - 1; i++) tube(stems, pts[i], pts[i + 1], 1.1);
      const tip = pts[pts.length - 1], dir = norm3(sub3(tip, pts[pts.length - 3]));
      const [u, v] = frameOf(dir);
      for (let i = 0; i < 14; i++) {
        const f = i / 13, rr = 2.2 + 2.4 * Math.sin(Math.PI * (0.15 + 0.75 * f));
        const sd = (i % 2 ? 1 : -1) * 1.6;
        blob(heads, add3(tip, add3(mul3(dir, -50 + i * 3.7), mul3(u, sd))), norm3(add3(dir, mul3(u, sd * 0.25))), 3.6, rr, 10, 6);
      }
      for (let i = 0; i < 10; i++) {
        const p0 = add3(tip, add3(mul3(dir, -46 + i * 4.2), mul3(u, (i % 2 ? 1 : -1) * 3.5)));
        tube(stems, p0, add3(p0, mul3(norm3(add3(dir, add3(mul3(u, (i % 2 ? 1 : -1) * 0.35), mul3(v, 0.1)))), 16)), 0.25, 4);
      }
    }
  } else if (kind === 'lagurus') {
    for (let k = 0; k < 3; k++) {
      const a = 2 * Math.PI * k / 3 + rnd();
      const lean = norm3([Math.cos(a) * 0.32, Math.sin(a) * 0.18, 1]);
      const pts = stemPath(add3(base, [Math.cos(a) * holeR * 0.4, Math.sin(a) * holeR * 0.3, 0]), up, lean, 95 + 45 * rnd());
      for (let i = 0; i < pts.length - 1; i++) tube(stems, pts[i], pts[i + 1], 0.9);
      const tip = pts[pts.length - 1], dir = norm3(sub3(tip, pts[pts.length - 3]));
      blob(heads, add3(tip, mul3(dir, 9)), dir, 14, 7.5, 22, 14);
    }
  } else if (kind === 'lavande') {
    for (let k = 0; k < 5; k++) {
      const a = 2 * Math.PI * k / 5 + rnd() * 0.6;
      const lean = norm3([Math.cos(a) * 0.3, Math.sin(a) * 0.15, 1]);
      const pts = stemPath(add3(base, [Math.cos(a) * holeR * 0.45, Math.sin(a) * holeR * 0.3, 0]), up, lean, 120 + 50 * rnd());
      for (let i = 0; i < pts.length - 1; i++) tube(stems, pts[i], pts[i + 1], 0.8);
      const tip = pts[pts.length - 1], dir = norm3(sub3(tip, pts[pts.length - 3]));
      for (let i = 0; i < 8; i++) blob(heads, add3(tip, mul3(dir, -44 + i * 6.2)), dir, 3.4, 2.6 - i * 0.12, 8, 6);
    }
  } else if (kind === 'eucalyptus') {
    for (let k = 0; k < 3; k++) {
      const a = [-0.55, 0.1, 0.6][k];
      const lean = norm3([Math.sin(a) * 1.1, -0.15, 1]);
      const pts = stemPath(add3(base, [Math.sin(a) * holeR * 0.4, 0, 0]), up, lean, 150 + 40 * rnd(), 10);
      for (let i = 0; i < pts.length - 1; i++) tube(stems, pts[i], pts[i + 1], 1.0);
      for (let i = 3; i < pts.length; i++) {
        const dir = norm3(sub3(pts[i], pts[i - 1]));
        const side = norm3(cross3(dir, [0, 1, 0]));
        for (const sg of [-1, 1]) {
          const r = 10.5 - (i - 3) * 0.6;
          const c = add3(pts[i], mul3(side, sg * (r + 1.5)));
          const n = norm3(add3([0, 1, 0], mul3(side, sg * 0.45)));
          blob(leaves, c, n, 0.9, r, 14, 6);
        }
      }
    }
  }
  const COLORS = {
    ble: [[0.72, 0.62, 0.40], [0.86, 0.72, 0.46]],
    lagurus: [[0.62, 0.6, 0.45], [0.95, 0.92, 0.84]],
    lavande: [[0.40, 0.47, 0.34], [0.50, 0.40, 0.64]],
    eucalyptus: [[0.40, 0.46, 0.38], [0.55, 0.66, 0.60]],
  };
  const [cs, ch] = COLORS[kind];
  const res = [fl(stems, cs)];
  if (heads.length) res.push(fl(heads, ch));
  if (leaves.length) res.push(fl(leaves, ch, 0.12));
  return res;
}
if (want(7)) {
  const objs = [];
  const order = ['H', 'O', 'M', 'E'], gap = 26;
  const items = order.map(letterStanding);
  const total = items.reduce((s, it) => s + it.width, 0) + gap * (order.length - 1);
  const FLOWERS = { H: 'ble', O: 'lagurus', M: 'lavande', E: 'eucalyptus' };
  // camera du cote +y : la droite de l'image est vers -x
  let x = total / 2;
  order.forEach((n, i) => {
    const it = items[i], X = x - it.width / 2, xf = it.at(X, 0);
    objs.push({ tris: R.meshTris(it.pos.mesh, xf, true), color: it.B.def.color, spec: 0.05 });
    it.B.def.pins.forEach((pin, k) => {
      const top = xf([pin.x, it.B.def.Hh, pin.zc]);
      objs.push(...bouquet(FLOWERS[n], top, M.PIN_KIND[pin.kind].r, 1234 + 97 * i + 31 * k));
    });
    x -= it.width + gap;
  });
  // mur clair derriere, table en bois
  const wallY = -105;
  objs.push({ tris: new Float64Array([-2000, wallY, 0, 2000, wallY, 0, 2000, wallY, 2000, -2000, wallY, 0, 2000, wallY, 2000, -2000, wallY, 2000]), color: [0.93, 0.91, 0.87], spec: 0, noCast: true, twoSided: true,
    colorFn: p => shade([0.93, 0.91, 0.87], 0.985 + 0.015 * Math.sin(p[0] * 0.9) * Math.sin(p[2] * 1.1)) });
  objs.push(U.table(-1400, wallY, 1400, 1400));
  shoot('resultat-final.png', objs, { eye: [40, 760, 300], target: [0, 0, 158], up: [0, 0, 1], fov: 33 }, [-0.5, 0.55, 0.68], [0.6, 0.5, 0.4], { bias: 0.8, w: quick ? 700 : 1400, h: quick ? 400 : 800 });
}

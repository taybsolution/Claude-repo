'use strict';
// Generateur des moules HOME (lettres-vases a cotes) pour impression 3D.
// Aucune dependance : node moules.js [dossier_sortie]
const fs = require('fs');
const path = require('path');
const earcut = require('./earcut.js');
const G = require('./geom.js');
const { Mesh, checkMesh, stlBuffer, cross2, dot2, norm2 } = G;

// ---------------------------------------------------------------- parametres
const P = {
  H: 180,          // hauteur des lettres (mm)
  D: 50,           // epaisseur de la lettre (face avant -> dos)
  draftDeg: 3,     // depouille des parois (degres), sauf la base (0)
  floor: 2.4,      // epaisseur du fond du moule sous les cotes
  eps: 0.3,        // petit decroche entre les cotes et la bordure plate
  border: 1.5,     // bordure plate entre les cotes et l'arrondi
  wallSide: 7, wallBase: 7, wallTop: 12,   // parois de la boite du moule
  pinR: 10,        // rayon de la tige (trou a fleurs = 20 mm)
  pinClear: 0.25,  // jeu radial dans le trou de la paroi
  flangeR: 18, flangeT: 5,
  arcStepDeg: 5,
  pinSeg: 48,
};
const TAN = Math.tan(P.draftDeg * Math.PI / 180);
const snap = v => Math.round(v * 1e9) / 1e9;

// ---------------------------------------------------------------- lettres (vue de face, mm)
// coins [x, y, rayon] dans le sens trigonometrique
const LETTERS = {
  H: {
    corners: [[0, 0, 6], [50, 0, 6], [50, 67, 4], [89, 67, 4], [89, 0, 6], [139, 0, 6], [139, 180, 6], [89, 180, 6], [89, 125, 4], [50, 125, 4], [50, 180, 6], [0, 180, 6]],
    Rf: 4, Kf: 6, rib: { type: 'vertical', pitch: 5, depth: 1.4, samples: 12 },
    pins: [{ x: 25, L: 100, kind: 'longue' }, { x: 114, L: 100, kind: 'longue' }],
    color: [0.93, 0.92, 0.89],
  },
  O: {
    Rf: 12, Kf: 12, rib: { type: 'rings', n: 8, depth: 0.8, pitch: 3.5, samples: 10 },
    pins: [{ x: 0, L: 36, kind: 'courte' }],
    color: [0.80, 0.52, 0.33],
  },
  M: {
    corners: [[0, 0, 6], [40, 0, 6], [40, 60, 4], [68, 3, 6], [102, 3, 6], [130, 60, 4], [130, 0, 6], [170, 0, 6], [170, 180, 6], [102, 180, 6], [85, 108, 4], [68, 180, 6], [0, 180, 6]],
    Rf: 4, Kf: 6, rib: { type: 'vertical', pitch: 5, depth: 1.4, samples: 12 },
    pins: [{ x: 32, L: 100, kind: 'longue' }, { x: 138, L: 100, kind: 'longue' }],
    color: [0.88, 0.76, 0.58],
  },
  E: {
    corners: [[0, 0, 10], [130, 0, 22], [130, 50, 9], [82, 50, 7], [82, 65, 7], [130, 65, 9], [130, 115, 9], [82, 115, 7], [82, 130, 7], [130, 130, 9], [130, 180, 22], [0, 180, 10]],
    Rf: 4, Kf: 6, rib: { type: 'vertical', pitch: 5, depth: 1.4, samples: 12 },
    pins: [{ x: 30, L: 100, kind: 'longue' }],
    color: [0.90, 0.66, 0.68],
  },
};
const PIN_KIND = { longue: { L: 100, rTip: 7.5 }, courte: { L: 36, rTip: 9 } };

// ---------------------------------------------------------------- contours
function sampleArc(a1, sweep) {
  const step = P.arcStepDeg * Math.PI / 180, q = Math.PI / 2, a2 = a1 + sweep;
  const brk = [a1];
  if (sweep > 0) { for (let k = Math.floor(a1 / q) + 1; k * q < a2 - 1e-9; k++) if (k * q > a1 + 1e-9) brk.push(k * q); }
  else { for (let k = Math.ceil(a1 / q) - 1; k * q > a2 + 1e-9; k--) if (k * q < a1 - 1e-9) brk.push(k * q); }
  brk.push(a2);
  const out = [a1];
  for (let j = 0; j < brk.length - 1; j++) {
    const s = brk[j], e = brk[j + 1];
    const m = Math.max(1, Math.ceil(Math.abs(e - s) / step - 1e-9));
    for (let k = 1; k <= m; k++) out.push(s + (e - s) * k / m);
  }
  return out;
}

function filletPolyline(corners) {
  const n = corners.length, pts = [];
  for (let i = 0; i < n; i++) {
    const A = corners[(i + n - 1) % n], B = corners[i], C = corners[(i + 1) % n];
    const d1 = norm2([B[0] - A[0], B[1] - A[1]]), d2 = norm2([C[0] - B[0], C[1] - B[1]]);
    const turn = Math.atan2(cross2(d1, d2), dot2(d1, d2));
    const r = B[2], t = r * Math.tan(Math.abs(turn) / 2);
    const T1 = [B[0] - d1[0] * t, B[1] - d1[1] * t];
    const s = turn > 0 ? 1 : -1;
    const Cc = [T1[0] - d1[1] * r * s, T1[1] + d1[0] * r * s];
    const a1 = Math.atan2(T1[1] - Cc[1], T1[0] - Cc[0]);
    for (const a of sampleArc(a1, turn)) pts.push([Cc[0] + r * Math.cos(a), Cc[1] + r * Math.sin(a)]);
  }
  return dedupe(pts.map(p => [snap(p[0]), snap(p[1])]));
}
function dedupe(pts) {
  const out = [];
  for (const p of pts) { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-7) out.push(p); }
  while (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-7) out.pop();
  return out;
}

function oPolylines() {
  const a = 83, b = 91, n = 2.3, yFlat = 90, cy = 90, ai = 19, bi = 37, ni = 2.0;
  const se = (A, B, N, t) => [A * Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), 2 / N), B * Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), 2 / N)];
  const tf = Math.asin(Math.pow(yFlat / b, n / 2));
  const step = 2.5 * Math.PI / 180, th = [];
  for (let k = -72; k < 72; k++) {
    const t = k * step;
    if (t > tf + 1e-6 && t < Math.PI - tf - 1e-6) continue;
    if (t > -Math.PI + tf + 1e-6 && t < -tf - 1e-6) continue;
    if ([tf, Math.PI - tf, -Math.PI + tf, -tf].some(f => Math.abs(f - t) < step * 0.6)) continue;
    th.push(t);
  }
  th.push(tf, Math.PI - tf, -Math.PI + tf, -tf);
  th.sort((p, q) => p - q);
  const outer = th.map(t => {
    const p = se(a, b, n, t);
    let y = p[1];
    if (y > yFlat - 1e-9) y = yFlat; if (y < -yFlat + 1e-9) y = -yFlat;
    return [snap(p[0]), snap(y + cy)];
  });
  const innerCCW = th.map(t => { const p = se(ai, bi, ni, t); return [snap(p[0]), snap(p[1] + cy)]; });
  const nn = th.length;
  const inner = innerCCW.map((_, j) => innerCCW[(nn - j) % nn]); // sens horaire (trou)
  return { outer, inner, map: i => (nn - i) % nn };
}

function makeLoop(pts, isHole) {
  const n = pts.length, nrm = [], c0 = [], base = [], w = new Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const t = norm2([b[0] - a[0], b[1] - a[1]]);
    const nv = [t[1], -t[0]];
    nrm.push(nv); c0.push(nv[0] * a[0] + nv[1] * a[1]);
    base.push(!isHole && Math.abs(a[1]) < 1e-9 && Math.abs(b[1]) < 1e-9 && b[0] > a[0]);
  }
  for (let e = 0; e < n; e++) {
    if (!base[e]) continue;
    w[e] = 0;
    for (const dir of [1, -1]) for (let k = 1; k < n; k++) {
      const f = (e + dir * k + n * 4) % n;
      if (base[f] || nrm[f][1] >= -1e-9) break;
      const g = (f - dir + n * 4) % n; // arete precedente dans le sens du parcours
      const turn = dir > 0 ? cross2(nrm[g], nrm[f]) : cross2(nrm[f], nrm[g]);
      if (turn < -1e-12) throw new Error('coin concave dans une zone de base (depouille nulle impossible)');
      w[f] = Math.abs(nrm[f][0]);
    }
  }
  return { pts, n, nrm, c0, base, w, isHole };
}

function offsetLoop(L, U, Dr) {
  const n = L.n, out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n, b = i;
    const na = L.nrm[a], nb = L.nrm[b];
    const ca = L.c0[a] + U + Dr * L.w[a], cb = L.c0[b] + U + Dr * L.w[b];
    const det = na[0] * nb[1] - na[1] * nb[0];
    if (Math.abs(det) < 1e-9) {
      const v = L.pts[i], d = (ca + cb) / 2 - (na[0] * v[0] + na[1] * v[1]);
      out[i] = [v[0] + na[0] * d, v[1] + na[1] * d];
    } else {
      out[i] = [(ca * nb[1] - na[1] * cb) / det, (na[0] * cb - ca * nb[0]) / det];
    }
  }
  return out;
}

function validateOffset(L, off, label) {
  const n = L.n;
  for (let i = 0; i < n; i++) {
    const a0 = L.pts[i], b0 = L.pts[(i + 1) % n], a1 = off[i], b1 = off[(i + 1) % n];
    const d0 = [b0[0] - a0[0], b0[1] - a0[1]], d1 = [b1[0] - a1[0], b1[1] - a1[1]];
    if (dot2(d0, d1) <= 0 || Math.hypot(d1[0], d1[1]) < 1e-6) throw new Error(`offset invalide (${label}) arete ${i}: ${JSON.stringify([a1, b1])}`);
  }
  // auto-intersections
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segX(off[i], off[(i + 1) % n], off[j], off[(j + 1) % n])) throw new Error(`auto-intersection (${label}) aretes ${i},${j}`);
  }
}
function segX(p1, p2, p3, p4) {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)) && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0;
}

// ---------------------------------------------------------------- lettre
function buildLetter(name) {
  const def = Object.assign({ name }, LETTERS[name]);
  let loops, oMap = null;
  if (name === 'O') {
    const o = oPolylines();
    loops = [makeLoop(o.outer, false), makeLoop(o.inner, true)];
    oMap = o.map;
  } else {
    loops = [makeLoop(filletPolyline(def.corners), false)];
  }
  let minX = Infinity, maxX = -Infinity;
  for (const L of loops) for (const p of L.pts) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); }
  def.ribCenter = (minX + maxX) / 2;
  const A = def.rib.depth, z0 = P.floor + A + P.eps, ztop = z0 + P.D;
  const levels = [];
  for (let k = 0; k <= def.Kf; k++) {
    const phi = Math.PI / 2 * k / def.Kf;
    const e = def.Rf * (1 - Math.sin(phi)), u = def.Rf * (1 - Math.cos(phi));
    levels.push({ U: -e, Dr: u * TAN, z: z0 + u });
  }
  levels.push({ U: 0, Dr: P.D * TAN, z: ztop });
  const iK = def.Kf, iTop = levels.length - 1;
  const L3 = loops.map((L, li) => levels.map((lv, k) => {
    const off = offsetLoop(L, lv.U, lv.Dr);
    validateOffset(L, off, `${name} boucle ${li} niveau ${k}`);
    return off.map(p => [p[0], p[1], lv.z]);
  }));
  const Cr = loops.map((L, li) => {
    const off = offsetLoop(L, -(def.Rf + P.border), 0).map(p => [snap(p[0]), snap(p[1])]);
    validateOffset(L, off, `${name} panneau ${li}`);
    return off;
  });
  // tiges : arete droite du haut contenant x
  const rh = P.pinR + P.pinClear;
  const zc = z0 + P.D / 2;
  def.pins.forEach(pin => {
    const L = loops[0];
    let found = -1;
    for (let i = 0; i < L.n; i++) {
      const a = L.pts[i], b = L.pts[(i + 1) % L.n];
      if (Math.abs(a[1] - P.H) < 1e-9 && Math.abs(b[1] - P.H) < 1e-9 && Math.min(a[0], b[0]) < pin.x && Math.max(a[0], b[0]) > pin.x) found = i;
    }
    if (found < 0) throw new Error(`pas d'arete pour la tige ${name} x=${pin.x}`);
    for (const k of [iK, iTop]) {
      const a = L3[0][k][found], b = L3[0][k][(found + 1) % L.n];
      const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
      if (pin.x - rh < lo + 0.5 || pin.x + rh > hi - 0.5) throw new Error(`trou trop large pour l'arete ${name} x=${pin.x}`);
    }
    if (zc - rh < levels[iK].z + 0.5) throw new Error(`trou trop bas ${name}`);
    pin.edge = found; pin.zc = zc;
  });
  return { def, name, loops, levels, L3, Cr, z0, ztop, iK, iTop, oMap };
}

// ---------------------------------------------------------------- panneau a cotes verticales
function ribPanel(loops2d, xsRib, hfun) {
  const loops = loops2d;
  const edges = [];
  loops.forEach((L, li) => { for (let i = 0; i < L.length; i++) edges.push({ a: L[i], b: L[(i + 1) % L.length], li, i }); });
  const vxs = new Set();
  for (const L of loops) for (const p of L) vxs.add(p[0]);
  const vx = [...vxs].sort((p, q) => p - q);
  const minX = vx[0], maxX = vx[vx.length - 1];
  let lines = vx.slice();
  for (const x of xsRib) {
    if (x <= minX || x >= maxX) continue;
    // ecarte les echantillons trop proches d'un sommet
    let lo = 0, hi = vx.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (vx[m] <= x) lo = m; else hi = m; }
    if (Math.abs(vx[lo] - x) < 1e-4 || Math.abs(vx[hi] - x) < 1e-4) continue;
    lines.push(x);
  }
  lines.sort((p, q) => p - q);
  lines = lines.filter((x, i) => i === 0 || x !== lines[i - 1]);
  const lineIdx = new Map(lines.map((x, i) => [x, i]));
  const hz = lines.map(hfun);
  const onLine = lines.map(() => []);
  const vert3 = loops.map(L => L.map(p => {
    const j = lineIdx.get(p[0]);
    const P3 = [p[0], p[1], hz[j]];
    onLine[j].push({ y: p[1], P: P3 });
    return P3;
  }));
  const st = new Map();
  const steiner = edges.map((e, ei) => {
    const x1 = e.a[0], x2 = e.b[0];
    if (x1 === x2) return [];
    const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    const res = [];
    for (let j = lineIdx.get(lo) + 1; j < lines.length && lines[j] < hi; j++) {
      const X = lines[j];
      const y = e.a[1] + (X - x1) * (e.b[1] - e.a[1]) / (x2 - x1);
      const P3 = [X, y, hz[j]];
      res.push({ j, P: P3 });
      onLine[j].push({ y, P: P3 });
      st.set(ei * 100000 + j, P3);
    }
    if (x2 < x1) res.reverse();
    return res;
  });
  for (const arr of onLine) arr.sort((p, q) => p.y - q.y);
  const edgeBase = []; let off = 0;
  loops.forEach(L => { edgeBase.push(off); off += L.length; });
  const aug = loops.map((L, li) => {
    const out = [];
    for (let i = 0; i < L.length; i++) {
      out.push({ P: vert3[li][i], e: i, v: true });
      for (const s of steiner[edgeBase[li] + i]) out.push({ P: s.P, e: i, v: false });
    }
    return out;
  });
  function edgePt(ei, j) {
    const e = edges[ei];
    if (lines[j] === e.a[0]) return vert3[e.li][e.i];
    if (lines[j] === e.b[0]) return vert3[e.li][(e.i + 1) % loops[e.li].length];
    const p = st.get(ei * 100000 + j);
    if (!p) throw new Error('steiner manquant');
    return p;
  }
  function chain(arr, P0, P1) {
    const out = [P0];
    for (const q of arr) if (q.y > P0[1] && q.y < P1[1]) out.push(q.P);
    if (P1 !== P0) out.push(P1);
    return out;
  }
  const tris = [];
  const byMin = edges.map((e, ei) => ({ ei, lo: Math.min(e.a[0], e.b[0]), hi: Math.max(e.a[0], e.b[0]) })).filter(o => o.lo !== o.hi);
  for (let j = 0; j < lines.length - 1; j++) {
    const xa = lines[j], xb = lines[j + 1];
    const items = [];
    for (const o of byMin) if (o.lo <= xa && o.hi >= xb) {
      const A = edgePt(o.ei, j), B = edgePt(o.ei, j + 1);
      items.push({ A, B, ym: (A[1] + B[1]) / 2 });
    }
    items.sort((p, q) => p.ym - q.ym);
    if (items.length % 2) throw new Error('croisements impairs bande ' + j);
    for (let k = 0; k < items.length; k += 2) {
      const left = chain(onLine[j], items[k].A, items[k + 1].A);
      const right = chain(onLine[j + 1], items[k].B, items[k + 1].B);
      let i = 0, r = 0;
      while (i < left.length - 1 || r < right.length - 1) {
        if (i < left.length - 1 && (r >= right.length - 1 || left[i + 1][1] <= right[r + 1][1])) { tris.push([left[i], right[r], left[i + 1]]); i++; }
        else { tris.push([left[i], right[r], right[r + 1]]); r++; }
      }
    }
  }
  return { tris, aug, nLines: lines.length };
}

function ribProfileX(def) {
  const p = def.rib.pitch, A = def.rib.depth, xc = def.ribCenter;
  const R = ((p / 2) ** 2 + A * A) / (2 * A);
  return x => { let d = (((x - xc) % p) + p) % p; if (d > p / 2) d -= p; return P.floor + R - Math.sqrt(Math.max(0, R * R - d * d)); };
}
function ribSamplesX(def, minX, maxX) {
  const p = def.rib.pitch, xc = def.ribCenter, s = def.rib.samples, out = [];
  for (let k = Math.floor((minX - xc) / p) - 1; k <= Math.ceil((maxX - xc) / p) + 1; k++)
    for (let j = 0; j < s; j++) out.push(xc + (k - 0.5) * p + j * p / s);
  return out;
}
function ringProfile(def) {
  const p = def.rib.pitch, A = def.rib.depth, N = def.rib.n;
  const R = ((p / 2) ** 2 + A * A) / (2 * A);
  return t => { const u = t * N - Math.floor(t * N + 1e-12); const d = (u - 0.5) * p; return P.floor + R - Math.sqrt(Math.max(0, R * R - d * d)); };
}

// zipper entre deux chaines paralleles (parametre le long de l'arete)
function zipChains(mesh, A, B, want) {
  const param = (C) => {
    const out = [0]; let s = 0;
    for (let k = 1; k < C.length; k++) { s += Math.hypot(C[k][0] - C[k - 1][0], C[k][1] - C[k - 1][1]); out.push(s); }
    return out.map(v => s > 0 ? v / s : 0);
  };
  const ta = param(A), tb = param(B);
  let i = 0, k = 0;
  while (i < A.length - 1 || k < B.length - 1) {
    if (i < A.length - 1 && (k >= B.length - 1 || ta[i + 1] <= tb[k + 1])) { mesh.tri(A[i], B[k], A[i + 1], want); i++; }
    else { mesh.tri(A[i], B[k], B[k + 1], want); k++; }
  }
}

function triPlanar(mesh, outer, holes, axes, want) {
  const data = [], holeIdx = [], all = [];
  for (const p of outer) { data.push(p[axes[0]], p[axes[1]]); all.push(p); }
  for (const h of holes) { holeIdx.push(all.length); for (const p of h) { data.push(p[axes[0]], p[axes[1]]); all.push(p); } }
  const t = earcut(data, holeIdx.length ? holeIdx : null);
  for (let k = 0; k < t.length; k += 3) mesh.tri(all[t[k]], all[t[k + 1]], all[t[k + 2]], want);
  return t.length / 3;
}

// ---------------------------------------------------------------- surfaces de l'empreinte
// sgn = +1 : normales vers l'empreinte (moule) ; -1 : vers l'exterieur de la lettre (tirage)
function cavity(mesh, B, sgn, holeR) {
  const { def, loops, L3, Cr, z0, iK, iTop } = B;
  const up = [0, 0, sgn];
  const leftOf = (a, b) => { const t = norm2([b[0] - a[0], b[1] - a[1]]); return [-t[1] * sgn, t[0] * sgn, 0]; };
  if (def.rib.type === 'vertical') {
    let minX = Infinity, maxX = -Infinity;
    for (const L of Cr) for (const p of L) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); }
    const RP = ribPanel(Cr, ribSamplesX(def, minX, maxX), ribProfileX(def));
    for (const [a, b, c] of RP.tris) mesh.tri(a, b, c, up);
    loops.forEach((L, li) => {
      const aug = RP.aug[li], m = aug.length;
      const at0 = aug.map(o => [o.P[0], o.P[1], z0]);
      for (let k = 0; k < m; k++) {
        const k1 = (k + 1) % m;
        mesh.quad(aug[k].P, aug[k1].P, at0[k1], at0[k], leftOf(aug[k].P, aug[k1].P));
      }
      const C0 = L3[li][0];
      let k = 0;
      for (let i = 0; i < L.n; i++) {
        const ch = [];
        while (aug[k % m].e === i && (ch.length === 0 || !aug[k % m].v)) { ch.push(at0[k % m]); k++; if (ch.length > m) throw new Error('boucle'); }
        ch.push(at0[k % m]);
        zipChains(mesh, [C0[i], C0[(i + 1) % L.n]], ch, up);
      }
    });
  } else {
    // anneaux concentriques (O)
    const hr = ringProfile(def);
    const io = loops.findIndex(L => !L.isHole), ii = loops.findIndex(L => L.isHole);
    const CO = Cr[io], CI = Cr[ii], n = CO.length;
    const T = def.rib.n * def.rib.samples;
    const rings = [];
    for (let k = 0; k <= T; k++) {
      const t = k / T, z = hr(t);
      rings.push(CO.map((p, i) => { const q = CI[B.oMap(i)]; return [(1 - t) * p[0] + t * q[0], (1 - t) * p[1] + t * q[1], z]; }));
    }
    for (let k = 0; k < T; k++) for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n;
      mesh.quad(rings[k][i], rings[k][i1], rings[k + 1][i1], rings[k + 1][i], up);
    }
    const bottom = [rings[0], CI.map((_, j) => rings[T][B.oMap(j)])]; // meme ordre que les boucles
    [io, ii].forEach((li, s) => {
      const L = loops[li], low = bottom[s], top0 = Cr[li].map(p => [p[0], p[1], z0]), C0 = L3[li][0];
      for (let i = 0; i < L.n; i++) {
        const i1 = (i + 1) % L.n;
        mesh.quad(low[i], low[i1], top0[i1], top0[i], leftOf(low[i], low[i1]));
        mesh.quad(C0[i], C0[i1], top0[i1], top0[i], up);
      }
    });
  }
  // conge (arrondi avant) + depouille
  const holes = [];
  loops.forEach((L, li) => {
    for (let i = 0; i < L.n; i++) {
      const i1 = (i + 1) % L.n;
      const inw = [-L.nrm[i][0] * sgn, -L.nrm[i][1] * sgn];
      for (let k = 0; k < iK; k++) mesh.quad(L3[li][k][i], L3[li][k][i1], L3[li][k + 1][i1], L3[li][k + 1][i], [inw[0], inw[1], sgn]);
      const pins = li === 0 ? def.pins.filter(p => p.edge === i) : [];
      const a = L3[li][iK][i], b = L3[li][iK][i1], c = L3[li][iTop][i1], d = L3[li][iTop][i];
      if (!pins.length) { mesh.quad(a, b, c, d, [inw[0], inw[1], 0.05 * sgn]); continue; }
      const yAt = z => a[1] + (z - a[2]) * (d[1] - a[1]) / (d[2] - a[2]);
      const hl = pins.map(pin => {
        const loop = [];
        for (let j = 0; j < P.pinSeg; j++) {
          const th = 2 * Math.PI * j / P.pinSeg;
          const x = pin.x + holeR * Math.cos(th), z = pin.zc + holeR * Math.sin(th);
          loop.push([x, yAt(z), z]);
        }
        holes.push({ pin, loop });
        return loop;
      });
      triPlanar(mesh, [a, b, c, d], hl, [0, 2], [inw[0], inw[1], 0]);
    }
  });
  return holes;
}

// ---------------------------------------------------------------- moule
function buildMold(B) {
  const m = new Mesh('moule-' + B.name);
  const rh = P.pinR + P.pinClear;
  const holes = cavity(m, B, +1, rh);
  const top = B.L3.map(Ls => Ls[B.iTop]);
  let minX = Infinity, maxX = -Infinity, maxY = -Infinity, minY = Infinity;
  for (const L of top) for (const p of L) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); minY = Math.min(minY, p[1]); }
  const bx0 = minX - P.wallSide, bx1 = maxX + P.wallSide, by0 = minY - P.wallBase, by1 = maxY + P.wallTop, zt = B.ztop;
  const R = [[bx0, by0, zt], [bx1, by0, zt], [bx1, by1, zt], [bx0, by1, zt]];
  const Rb = [[bx0, by0, 0], [bx1, by0, 0], [bx1, by1, 0], [bx0, by1, 0]];
  triPlanar(m, R, B.loops.map((L, li) => L.isHole ? null : top[li]).filter(Boolean), [0, 1], [0, 0, 1]);
  B.loops.forEach((L, li) => { if (L.isHole) triPlanar(m, top[li], [], [0, 1], [0, 0, 1]); });
  m.quad(Rb[0], Rb[1], Rb[2], Rb[3], [0, 0, -1]);
  m.quad(Rb[0], Rb[1], R[1], R[0], [0, -1, 0]);
  m.quad(Rb[1], Rb[2], R[2], R[1], [1, 0, 0]);
  m.quad(Rb[3], Rb[0], R[0], R[3], [-1, 0, 0]);
  const boxHoles = holes.map(h => h.loop.map(p => [p[0], by1, p[2]]));
  triPlanar(m, [Rb[2], Rb[3], R[3], R[2]], boxHoles, [0, 2], [0, 1, 0]);
  holes.forEach((h, k) => {
    const W = h.loop, X = boxHoles[k], N = W.length;
    for (let j = 0; j < N; j++) {
      const j1 = (j + 1) % N, th = 2 * Math.PI * (j + 0.5) / N;
      m.quad(W[j], W[j1], X[j1], X[j], [-Math.cos(th), 0, -Math.sin(th)]);
    }
  });
  const yWallMin = Math.min(...holes.map(h => Math.min(...h.loop.map(p => p[1]))));
  return { mesh: m, box: { bx0, bx1, by0, by1, zt }, holes, yRootEnd: yWallMin - 1.0 };
}

// ---------------------------------------------------------------- tirage (lettre finie)
function buildPositive(B, mold) {
  const m = new Mesh('lettre-' + B.name);
  const holes = cavity(m, B, -1, P.pinR);
  const top = B.L3.map(Ls => Ls[B.iTop]);
  const outer = top.filter((_, li) => !B.loops[li].isHole), inner = top.filter((_, li) => B.loops[li].isHole);
  triPlanar(m, outer[0], inner, [0, 1], [0, 0, 1]);
  for (const h of holes) {
    const pk = PIN_KIND[h.pin.kind], xp = h.pin.x, zc = h.pin.zc, r = P.pinR, rt = pk.rTip;
    const yTip = P.H - pk.L, yTc = yTip + rt;
    const N = h.loop.length;
    const ring = (y, rad) => h.loop.map((_, j) => { const th = 2 * Math.PI * j / N; return [xp + rad * Math.cos(th), y, zc + rad * Math.sin(th)]; });
    const rings = [h.loop, ring(mold.yRootEnd, r), ring(yTc, rt)];
    const S = 8;
    for (let s = 1; s < S; s++) { const ph = Math.PI / 2 * s / S; rings.push(ring(yTc - rt * Math.sin(ph), rt * Math.cos(ph))); }
    for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < N; j++) {
      const j1 = (j + 1) % N, th = 2 * Math.PI * (j + 0.5) / N;
      const a = rings[k][j];
      const want = k < 2 ? [-Math.cos(th), 0, -Math.sin(th)] : [xp - a[0], yTc - a[1], zc - a[2]];
      m.quad(rings[k][j], rings[k][j1], rings[k + 1][j1], rings[k + 1][j], want);
    }
    const tip = [xp, yTip, zc], last = rings[rings.length - 1];
    for (let j = 0; j < N; j++) m.tri(tip, last[j], last[(j + 1) % N], [0, 1, 0]);
  }
  return { mesh: m };
}

// ---------------------------------------------------------------- tiges
function buildPin(kind, Lroot) {
  const pk = PIN_KIND[kind], m = new Mesh('tige-' + kind);
  const r = P.pinR, rt = pk.rTip, T = P.flangeT;
  // longueur depuis la face exterieure du moule jusqu'au centre de l'hemisphere
  const prof = [[0, 0], [P.flangeR - 0.8, 0], [P.flangeR, 0.8], [P.flangeR, T], [r, T], [r, T + Lroot.root]];
  const zTc = T + Lroot.toTipCenter(pk);
  prof.push([rt, zTc]);
  const S = 10;
  for (let s = 1; s < S; s++) { const ph = Math.PI / 2 * s / S; prof.push([rt * Math.cos(ph), zTc + rt * Math.sin(ph)]); }
  prof.push([0, zTc + rt]);
  const N = P.pinSeg;
  const ringPts = prof.map(([rr, z]) => rr === 0 ? null : Array.from({ length: N }, (_, j) => { const th = 2 * Math.PI * j / N; return [rr * Math.cos(th), rr * Math.sin(th), z]; }));
  for (let k = 0; k < prof.length - 1; k++) {
    const [r1, z1] = prof[k], [r2, z2] = prof[k + 1];
    const nr = z2 - z1, nz = -(r2 - r1);
    for (let j = 0; j < N; j++) {
      const j1 = (j + 1) % N, th = 2 * Math.PI * (j + 0.5) / N;
      const want = [nr * Math.cos(th), nr * Math.sin(th), nz];
      if (!ringPts[k]) m.tri([0, 0, z1], ringPts[k + 1][j], ringPts[k + 1][j1], want);
      else if (!ringPts[k + 1]) m.tri(ringPts[k][j], ringPts[k][j1], [0, 0, z2], want);
      else m.quad(ringPts[k][j], ringPts[k][j1], ringPts[k + 1][j1], ringPts[k + 1][j], want);
    }
  }
  return { mesh: m, length: zTc + rt };
}

module.exports = { P, TAN, LETTERS, PIN_KIND, buildLetter, buildMold, buildPositive, buildPin, checkMesh, stlBuffer, Mesh };

// ---------------------------------------------------------------- main
if (require.main === module) {
  const out = process.argv[2] || 'out';
  fs.mkdirSync(path.join(out, 'stl'), { recursive: true });
  const report = { parametres: P, lettres: {} };
  let Lroot = null;
  const results = {};
  for (const name of ['H', 'O', 'M', 'E']) {
    const B = buildLetter(name);
    const mold = buildMold(B);
    const pos = buildPositive(B, mold);
    const lr = mold.box.by1 - mold.yRootEnd;
    if (Lroot && Math.abs(Lroot.root - lr) > 1e-6) throw new Error('longueur de tige differente ' + name);
    Lroot = { root: lr, by1: mold.box.by1, toTipCenter: pk => mold.box.by1 - (P.H - pk.L + pk.rTip) };
    const cm = checkMesh(mold.mesh), cp = checkMesh(pos.mesh);
    results[name] = { B, mold, pos };
    // moule reel = miroir en x ; tirage a imprimer = face avant vers le haut
    const bx = mold.box;
    const moldOut = mold.mesh.transformed(p => [bx.bx1 - p[0], p[1] - bx.by0, p[2]], true, 'moule-' + name);
    const pmin = Math.min(...pos.mesh.v.map(p => p[0]));
    const posOut = pos.mesh.transformed(p => [p[0] - pmin, p[1], B.ztop - p[2]], true, 'lettre-' + name);
    fs.writeFileSync(path.join(out, 'stl', `moule-${name}.stl`), stlBuffer(moldOut));
    fs.writeFileSync(path.join(out, 'stl', `lettre-${name}-impression-directe.stl`), stlBuffer(posOut));
    report.lettres[name] = {
      moule: { tris: cm.tris, ouvertes: cm.open, doublons: cm.dup, degeneres: cm.degenerate, ambigus: cm.ambiguous, volume_cm3: +(cm.vol / 1000).toFixed(1),
        taille_mm: [bx.bx1 - bx.bx0, bx.by1 - bx.by0, bx.zt].map(v => +v.toFixed(1)) },
      lettre: { tris: cp.tris, ouvertes: cp.open, doublons: cp.dup, degeneres: cp.degenerate, ambigus: cp.ambiguous, volume_cm3: +(cp.vol / 1000).toFixed(1),
        taille_mm: [cp.hi[0] - cp.lo[0], cp.hi[1] - cp.lo[1], cp.hi[2] - cp.lo[2]].map(v => +v.toFixed(1)) },
      tiges: B.def.pins.map(p => p.kind),
      platre_g: Math.round(cp.vol / 1000 * 0.922 * 1.1), eau_ml: Math.round(cp.vol / 1000 * 0.645 * 1.1),
    };
    if (cm.open || cm.dup) console.log('moule', name, 'aretes ouvertes', cm.openEdges.slice(0, 4));
    if (cp.open || cp.dup) console.log('lettre', name, 'aretes ouvertes', cp.openEdges.slice(0, 4));
  }
  for (const kind of ['longue', 'courte']) {
    const pin = buildPin(kind, Lroot);
    const c = checkMesh(pin.mesh);
    fs.writeFileSync(path.join(out, 'stl', `tige-${kind}.stl`), stlBuffer(pin.mesh));
    report['tige_' + kind] = { tris: c.tris, ouvertes: c.open, doublons: c.dup, volume_cm3: +(c.vol / 1000).toFixed(2), longueur_mm: +pin.length.toFixed(1) };
  }
  report.longueur_queue_tige_mm = +Lroot.root.toFixed(2);
  fs.writeFileSync(path.join(out, 'rapport.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, (k, v) => k === 'parametres' ? undefined : v, 1));
}

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
  border: 0.8,     // bordure plate entre les cotes et l'arrondi
  wallSide: 7, wallBase: 7, wallTop: 12,   // parois de la boite du moule
  pinClear: 0.25,  // jeu radial dans le trou de la paroi
  flangeExtra: 8, flangeT: 5,
  arcStepDeg: 5,
  pinSeg: 48,
};
const TAN = Math.tan(P.draftDeg * Math.PI / 180);
const snap = v => Math.round(v * 1e9) / 1e9;

function insideLetter(loops, x, y, margin) {
  let inside = false, dmin = Infinity;
  for (const L of loops) {
    const n = L.n;
    for (let i = 0; i < n; i++) {
      const a = L.pts[i], b = L.pts[(i + 1) % n];
      if ((a[1] > y) !== (b[1] > y) && x < a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])) inside = !inside;
      const ex = b[0] - a[0], ey = b[1] - a[1], l2 = ex * ex + ey * ey;
      let t = ((x - a[0]) * ex + (y - a[1]) * ey) / l2; t = Math.max(0, Math.min(1, t));
      dmin = Math.min(dmin, Math.hypot(x - a[0] - t * ex, y - a[1] - t * ey));
    }
  }
  return inside && (dmin >= margin || y > P.H - margin);
}

// ---------------------------------------------------------------- lettres (vue de face, mm)
// coins [x, y, rayon] dans le sens trigonometrique
const LETTERS = {
  H: {
    corners: [[0, 0, 4], [48, 0, 4], [48, 76, 3], [79, 76, 3], [79, 0, 4], [127, 0, 4], [127, 180, 4], [79, 180, 4], [79, 128, 3], [48, 128, 3], [48, 180, 4], [0, 180, 4]],
    Rf: 2, Kf: 4, rib: { type: 'vertical', pitch: 4.5, depth: 1.3, samples: 12 },
    pins: [{ x: 24, kind: 'longue' }, { x: 103, kind: 'longue' }],
    color: [0.93, 0.92, 0.89],
  },
  O: {
    mode: 'arch', archH: 16, zcRel: 31,
    o: { a: 83.5, b: 91, n: 2.3, yFlat: 90, ai: 17.5, bi: 38.5, ni: 2.0 },
    rib: { type: 'rings', n: 14, depth: 0.9, pitch: 3.2, samples: 10 },
    pins: [{ x: 0, kind: 'courte' }],
    color: [0.80, 0.52, 0.33],
  },
  M: {
    // fentes du bas jusqu'a 108 mm, fente du haut jusqu'a 107 mm (sommets arrondis compenses)
    corners: [[0, 0, 4], [27, 0, 4], [27, 143, 4], [56, 3, 4], [92, 3, 4], [121, 143, 4], [121, 0, 4], [148, 0, 4], [148, 180, 4], [89, 180, 4], [74, 85.6, 4], [59, 180, 4], [0, 180, 4]],
    Rf: 2, Kf: 4, rib: { type: 'vertical', pitch: 4.5, depth: 1.3, samples: 12 },
    pins: [{ x: 29.5, kind: 'moyenne' }, { x: 118.5, kind: 'moyenne' }],
    color: [0.88, 0.76, 0.58],
  },
  E: {
    corners: [[0, 0, 8], [116, 0, 10], [116, 38, 5], [78, 38, 7], [78, 53, 7], [116, 53, 5], [116, 106, 5], [78, 106, 7], [78, 121, 7], [116, 121, 5], [116, 180, 8], [0, 180, 8]],
    Rf: 2, Kf: 4, rib: { type: 'vertical', pitch: 4.5, depth: 1.3, samples: 12 },
    pins: [{ x: 39, kind: 'longue' }],
    color: [0.90, 0.66, 0.68],
  },
};
const PIN_KIND = {
  longue: { L: 100, r: 15, rTip: 11 },   // H et E : trou de 30 mm, 10 cm de profondeur
  moyenne: { L: 60, r: 15, rTip: 12 },   // M : trou de 30 mm, 6 cm (s'arrete au-dessus des fentes)
  courte: { L: 36, r: 10, rTip: 8.5 },   // O : trou de 20 mm, 3,6 cm
};

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

function oPolylines(o) {
  const { a, b, n, yFlat, ai, bi, ni } = o, cy = 90;
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
    const o = oPolylines(def.o);
    loops = [makeLoop(o.outer, false), makeLoop(o.inner, true)];
    oMap = o.map;
  } else {
    loops = [makeLoop(filletPolyline(def.corners), false)];
  }
  let minX = Infinity, maxX = -Infinity;
  for (const L of loops) for (const p of L.pts) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); }
  def.ribCenter = (minX + maxX) / 2;
  const A = def.rib.depth, arch = def.mode === 'arch';
  const z0 = arch ? P.floor + A : P.floor + A + P.eps, ztop = z0 + P.D;
  const levels = [];
  if (arch) {
    levels.push({ U: 0, Dr: def.archH * TAN, z: z0 + def.archH });
  } else {
    for (let k = 0; k <= def.Kf; k++) {
      const phi = Math.PI / 2 * k / def.Kf;
      const e = def.Rf * (1 - Math.sin(phi)), u = def.Rf * (1 - Math.cos(phi));
      levels.push({ U: -e, Dr: u * TAN, z: z0 + u });
    }
  }
  levels.push({ U: 0, Dr: P.D * TAN, z: ztop });
  const iK = arch ? 0 : def.Kf, iTop = levels.length - 1;
  const L3 = loops.map((L, li) => levels.map((lv, k) => {
    const off = offsetLoop(L, lv.U, lv.Dr);
    validateOffset(L, off, `${name} boucle ${li} niveau ${k}`);
    return off.map(p => [p[0], p[1], lv.z]);
  }));
  const Cr = arch ? null : loops.map((L, li) => {
    const off = offsetLoop(L, -(def.Rf + P.border), 0).map(p => [snap(p[0]), snap(p[1])]);
    validateOffset(L, off, `${name} panneau ${li}`);
    return off;
  });
  // tiges : arete droite du haut contenant x
  const zc = z0 + (def.zcRel != null ? def.zcRel : P.D / 2);
  def.pins.forEach(pin => {
    const pk = PIN_KIND[pin.kind];
    pin.r = pk.r; pin.L = pk.L; pin.rTip = pk.rTip;
    const rh = pk.r + P.pinClear;
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
    if (zc - rh < levels[iK].z + 0.5 || zc + rh > ztop - 3) throw new Error(`trou mal place en profondeur ${name}`);
    // il doit rester au moins 6 mm de matiere autour du trou, dans le plan de la lettre
    const minClear = 6;
    for (let y = P.H - pk.L; y <= P.H - 1; y += 2) for (let x = pin.x - pk.r; x <= pin.x + pk.r + 1e-9; x += 2) {
      if (!insideLetter(loops, x, y, minClear)) throw new Error(`le trou de ${name} x=${pin.x} sort de la lettre vers (${x.toFixed(1)}, ${y.toFixed(1)})`);
    }
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
  // earcut rend des triangles tous dans le meme sens (trigonometrique dans le plan projete) :
  // on choisit le sens une seule fois, ce qui garde aussi les triangles plats (points alignes)
  const ax = 3 - axes[0] - axes[1];
  const hand = (axes[0] === 0 && axes[1] === 2) ? -1 : 1;
  const flip = want[ax] * hand < 0;
  for (let k = 0; k < t.length; k += 3) mesh.triRaw(all[t[k]], all[t[k + 1]], all[t[k + 2]], flip);
  return t.length / 3;
}

// ---------------------------------------------------------------- surfaces de l'empreinte
// sgn = +1 : normales vers l'empreinte (moule) ; -1 : vers l'exterieur de la lettre (tirage)
function cavity(mesh, B, sgn, clear) {
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
  } else if (def.mode === 'arch') {
    // O en beignet : face avant bombee (demi-ellipse) couverte d'anneaux concentriques
    const io = loops.findIndex(L => !L.isHole), ii = loops.findIndex(L => L.isHole);
    const CO = L3[io][0], CIm = L3[ii][0].map((_, j) => L3[ii][0][B.oMap(j)]), n = CO.length;
    const zs = B.levels[0].z, Ha = def.archH, A = def.rib.depth, N = def.rib.n, p = def.rib.pitch;
    const R = ((p / 2) ** 2 + A * A) / (2 * A);
    const rib = t => { const u = t * N - Math.floor(t * N + 1e-12); const d = (u - 0.5) * p; return A - (R - Math.sqrt(Math.max(0, R * R - d * d))); };
    const ts = [];
    for (let k = 0; k <= N * def.rib.samples; k++) ts.push(k / (N * def.rib.samples));
    for (let k = 0; k <= 48; k++) ts.push((1 - Math.cos(Math.PI * k / 48)) / 2);
    ts.sort((a, b) => a - b);
    const T = ts.filter((t, i) => i === 0 || t - ts[i - 1] > 1e-7);
    T[0] = 0; T[T.length - 1] = 1;
    const rings = T.map((t, k) => {
      if (k === 0) return CO;
      if (k === T.length - 1) return CIm;
      const z = zs - Ha * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) - Math.max(0, rib(t));
      return CO.map((q, i) => { const w = CIm[i]; return [(1 - t) * q[0] + t * w[0], (1 - t) * q[1] + t * w[1], z]; });
    });
    for (let k = 0; k < rings.length - 1; k++) {
      const tm = (T[k] + T[k + 1]) / 2, th = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * tm)));
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n;
        const dx = CIm[i][0] - CO[i][0], dy = CIm[i][1] - CO[i][1], dl = Math.hypot(dx, dy) || 1;
        const Lb = dl / 2;
        const ws = Ha * Math.cos(th), wz = Lb * Math.sin(th) + 0.05 * Lb;
        const want = [sgn * ws * dx / dl, sgn * ws * dy / dl, sgn * wz];
        mesh.quad(rings[k][i], rings[k][i1], rings[k + 1][i1], rings[k + 1][i], want);
      }
    }
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
          const hr = pin.r + clear;
          const x = pin.x + hr * Math.cos(th), z = pin.zc + hr * Math.sin(th);
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
  const holes = cavity(m, B, +1, P.pinClear);
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
  for (const h of holes) {
    h.pin.yRootEnd = Math.min(...h.loop.map(p => p[1])) - 1.0;   // la queue cylindrique depasse de 1 mm dans l'empreinte
    h.pin.root = by1 - h.pin.yRootEnd;
    h.pin.toTipCenter = by1 - (P.H - h.pin.L + h.pin.rTip);
  }
  return { mesh: m, box: { bx0, bx1, by0, by1, zt }, holes };
}

// ---------------------------------------------------------------- tirage (lettre finie)
function buildPositive(B, mold) {
  const m = new Mesh('lettre-' + B.name);
  const holes = cavity(m, B, -1, 0);
  const top = B.L3.map(Ls => Ls[B.iTop]);
  const outer = top.filter((_, li) => !B.loops[li].isHole), inner = top.filter((_, li) => B.loops[li].isHole);
  triPlanar(m, outer[0], inner, [0, 1], [0, 0, 1]);
  for (const h of holes) {
    const pk = PIN_KIND[h.pin.kind], xp = h.pin.x, zc = h.pin.zc, r = pk.r, rt = pk.rTip;
    const yTip = P.H - pk.L, yTc = yTip + rt;
    const N = h.loop.length;
    const ring = (y, rad) => h.loop.map((_, j) => { const th = 2 * Math.PI * j / N; return [xp + rad * Math.cos(th), y, zc + rad * Math.sin(th)]; });
    const rings = [h.loop, ring(h.pin.yRootEnd, r), ring(yTc, rt)];
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
function buildPin(kind, geo) {
  const pk = PIN_KIND[kind], m = new Mesh('tige-' + kind);
  const r = pk.r, rt = pk.rTip, T = P.flangeT, rf = r + P.flangeExtra;
  // geo : { root, toTipCenter } mesures depuis la face exterieure du moule
  const prof = [[0, 0], [rf - 0.8, 0], [rf, 0.8], [rf, T], [r, T], [r, T + geo.root]];
  const zTc = T + geo.toTipCenter;
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

// construit tout : lettres, moules, tirages, tiges (une geometrie par type de tige)
function buildAll() {
  const letters = {}, geo = {};
  for (const name of ['H', 'O', 'M', 'E']) {
    const B = buildLetter(name);
    const mold = buildMold(B);
    const pos = buildPositive(B, mold);
    letters[name] = { B, mold, pos };
    for (const pin of B.def.pins) {
      const g = { root: pin.root, toTipCenter: pin.toTipCenter };
      if (geo[pin.kind] && (Math.abs(geo[pin.kind].root - g.root) > 1e-6 || Math.abs(geo[pin.kind].toTipCenter - g.toTipCenter) > 1e-6)) throw new Error('tiges ' + pin.kind + ' incompatibles entre lettres');
      geo[pin.kind] = g;
    }
  }
  const pins = {};
  for (const kind of Object.keys(geo)) pins[kind] = buildPin(kind, geo[kind]);
  return { letters, pins, geo };
}

module.exports = { P, TAN, LETTERS, PIN_KIND, buildLetter, buildMold, buildPositive, buildPin, buildAll, checkMesh, stlBuffer, Mesh };

// ---------------------------------------------------------------- main
if (require.main === module) {
  const out = process.argv[2] || 'out';
  fs.mkdirSync(path.join(out, 'stl', 'option-lettres-directes'), { recursive: true });
  const report = { parametres: P, lettres: {} };
  const all = buildAll();
  for (const name of ['H', 'O', 'M', 'E']) {
    const { B, mold, pos } = all.letters[name];
    const cm = checkMesh(mold.mesh), cp = checkMesh(pos.mesh);
    const bx = mold.box;
    const moldOut = mold.mesh.transformed(p => [bx.bx1 - p[0], p[1] - bx.by0, p[2]], true, 'moule-' + name);
    const pmin = Math.min(...pos.mesh.v.map(p => p[0]));
    const posOut = pos.mesh.transformed(p => [p[0] - pmin, p[1], B.ztop - p[2]], true, 'lettre-' + name);
    fs.writeFileSync(path.join(out, 'stl', `moule-${name}.stl`), stlBuffer(moldOut));
    fs.writeFileSync(path.join(out, 'stl', 'option-lettres-directes', `lettre-${name}-impression-directe.stl`), stlBuffer(posOut));
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
  report.tiges = {};
  for (const kind of Object.keys(all.pins)) {
    const pin = all.pins[kind];
    const c = checkMesh(pin.mesh);
    fs.writeFileSync(path.join(out, 'stl', `tige-${kind}.stl`), stlBuffer(pin.mesh));
    report.tiges[kind] = { tris: c.tris, ouvertes: c.open, doublons: c.dup, volume_cm3: +(c.vol / 1000).toFixed(2), longueur_mm: +pin.length.toFixed(1),
      diametre_mm: 2 * PIN_KIND[kind].r, collerette_mm: 2 * (PIN_KIND[kind].r + P.flangeExtra), queue_mm: +all.geo[kind].root.toFixed(2) };
  }
  fs.writeFileSync(path.join(out, 'rapport.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, (k, v) => k === 'parametres' ? undefined : v));
}

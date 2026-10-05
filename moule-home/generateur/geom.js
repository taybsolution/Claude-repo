'use strict';
// Small vector + mesh toolkit (no dependencies)
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len3 = a => Math.hypot(a[0], a[1], a[2]);
const norm3 = a => { const l = len3(a); return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; };
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const norm2 = a => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };

class Mesh {
  constructor(name) { this.name = name; this.v = []; this.map = new Map(); this.f = []; this.degenerate = 0; this.ambiguous = 0; }
  vid(p) {
    const key = p[0] + ',' + p[1] + ',' + p[2];
    let id = this.map.get(key);
    if (id === undefined) { id = this.v.length; this.v.push([p[0], p[1], p[2]]); this.map.set(key, id); }
    return id;
  }
  // add triangle oriented so that its normal agrees with `want`
  tri(a, b, c, want) {
    const ia = this.vid(a), ib = this.vid(b), ic = this.vid(c);
    if (ia === ib || ib === ic || ia === ic) return;
    const A = this.v[ia], B = this.v[ib], C = this.v[ic];
    const n = cross3(sub3(B, A), sub3(C, A));
    const l = len3(n);
    if (l < 1e-11) { this.degenerate++; this.f.push(null); this.degList = (this.degList || []).concat([[ia, ib, ic]]); this.f.pop(); return; }
    const d = dot3(n, want) / (l * (len3(want) || 1));
    if (Math.abs(d) < 0.02) this.ambiguous++;
    if (d < 0) this.f.push([ia, ic, ib]); else this.f.push([ia, ib, ic]);
  }
  quad(a, b, c, d, want) { this.tri(a, b, c, want); this.tri(a, c, d, want); }
  // triangle deja oriente (triangulation plane coherente) : garde aussi les triangles plats
  triRaw(a, b, c, flip) {
    const ia = this.vid(a), ib = this.vid(b), ic = this.vid(c);
    if (ia === ib || ib === ic || ia === ic) return;
    this.f.push(flip ? [ia, ic, ib] : [ia, ib, ic]);
  }
  // append another mesh (no welding across)
  transformed(fn, flip, name) {
    const m = new Mesh(name || this.name);
    const ids = this.v.map(p => m.vid(fn(p)));
    for (const [a, b, c] of this.f) m.f.push(flip ? [ids[a], ids[c], ids[b]] : [ids[a], ids[b], ids[c]]);
    return m;
  }
}

function checkMesh(m) {
  const E = new Map();
  for (const [a, b, c] of m.f) for (const [i, j] of [[a, b], [b, c], [c, a]]) {
    const k = i * 4194304 + j;
    E.set(k, (E.get(k) || 0) + 1);
  }
  let dup = 0, open = 0;
  const openEdges = [];
  for (const [k, cnt] of E) {
    const i = Math.floor(k / 4194304), j = k % 4194304;
    if (cnt !== 1) dup++;
    if ((E.get(j * 4194304 + i) || 0) !== 1) { open++; if (openEdges.length < 10) openEdges.push([m.v[i], m.v[j]]); }
  }
  let vol = 0, area = 0;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of m.v) for (let q = 0; q < 3; q++) { lo[q] = Math.min(lo[q], p[q]); hi[q] = Math.max(hi[q], p[q]); }
  for (const [a, b, c] of m.f) {
    const A = m.v[a], B = m.v[b], C = m.v[c];
    vol += dot3(A, cross3(B, C)) / 6;
    area += len3(cross3(sub3(B, A), sub3(C, A))) / 2;
  }
  return { tris: m.f.length, verts: m.v.length, dup, open, vol, area, lo, hi, degenerate: m.degenerate, ambiguous: m.ambiguous, openEdges };
}

function stlBuffer(m) {
  const n = m.f.length;
  const buf = Buffer.alloc(84 + 50 * n);
  buf.write((m.name || 'mesh').padEnd(80, ' ').slice(0, 80), 0, 'ascii');
  buf.writeUInt32LE(n, 80);
  let o = 84;
  for (const [a, b, c] of m.f) {
    const A = m.v[a], B = m.v[b], C = m.v[c];
    const nn = norm3(cross3(sub3(B, A), sub3(C, A)));
    for (const x of nn) { buf.writeFloatLE(x, o); o += 4; }
    for (const P of [A, B, C]) for (const x of P) { buf.writeFloatLE(x, o); o += 4; }
    buf.writeUInt16LE(0, o); o += 2;
  }
  return buf;
}

module.exports = { sub3, add3, mul3, dot3, cross3, len3, norm3, cross2, dot2, norm2, Mesh, checkMesh, stlBuffer };

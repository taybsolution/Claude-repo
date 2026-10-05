'use strict';
const fs = require('fs');
for (const file of process.argv.slice(2)) {
  const b = fs.readFileSync(file);
  const n = b.readUInt32LE(80);
  if (b.length !== 84 + 50 * n) { console.log(file, 'TAILLE INCORRECTE'); continue; }
  const map = new Map(), V = [];
  const F = [];
  let o = 84, degen = 0;
  for (let t = 0; t < n; t++) {
    o += 12;
    const ids = [];
    for (let k = 0; k < 3; k++) {
      const x = b.readFloatLE(o), y = b.readFloatLE(o + 4), z = b.readFloatLE(o + 8); o += 12;
      const key = x + ',' + y + ',' + z;
      let id = map.get(key); if (id === undefined) { id = V.length; V.push([x, y, z]); map.set(key, id); }
      ids.push(id);
    }
    o += 2;
    if (ids[0] === ids[1] || ids[1] === ids[2] || ids[0] === ids[2]) degen++;
    F.push(ids);
  }
  const E = new Map();
  for (const [a, c, d] of F) for (const [i, j] of [[a, c], [c, d], [d, a]]) { const k = i * 8388608 + j; E.set(k, (E.get(k) || 0) + 1); }
  let open = 0, dup = 0;
  for (const [k, cnt] of E) { const i = Math.floor(k / 8388608), j = k % 8388608; if (cnt !== 1) dup++; if ((E.get(j * 8388608 + i) || 0) !== 1) open++; }
  let vol = 0; const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const v of V) for (let q = 0; q < 3; q++) { lo[q] = Math.min(lo[q], v[q]); hi[q] = Math.max(hi[q], v[q]); }
  for (const [a, c, d] of F) { const A = V[a], B = V[c], C = V[d]; vol += (A[0] * (B[1] * C[2] - B[2] * C[1]) - A[1] * (B[0] * C[2] - B[2] * C[0]) + A[2] * (B[0] * C[1] - B[1] * C[0])) / 6; }
  console.log(file.split('/').pop().padEnd(36), 'tri', String(n).padStart(6), 'ouvertes', open, 'doublons', dup, 'degeneres', degen, 'vol', (vol / 1000).toFixed(1) + 'cm3', 'dims', hi.map((h, q) => (h - lo[q]).toFixed(1)).join('x'), 'min', lo.map(v => v.toFixed(1)).join(','));
}

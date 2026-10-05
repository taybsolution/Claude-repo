'use strict';
// Rendu logiciel (z-buffer + ombres portees) -> PNG, sans dependance
const zlib = require('zlib');
const fs = require('fs');
const { sub3, dot3, cross3, norm3, len3 } = require('./geom.js');

function crcTable() { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; }
const CRC = crcTable();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w * 3; x++) raw[y * (w * 3 + 1) + 1 + x] = rgb[y * w * 3 + x]; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

// objets : { tris: Float64Array (9 par triangle), color:[r,g,b], spec }
function meshTris(mesh, xf, flip) {
  const out = new Float64Array(mesh.f.length * 9);
  let o = 0;
  for (const f0 of mesh.f) for (const i of (flip ? [f0[0], f0[2], f0[1]] : f0)) { const p = xf ? xf(mesh.v[i]) : mesh.v[i]; out[o++] = p[0]; out[o++] = p[1]; out[o++] = p[2]; }
  return out;
}

function render(objs, cam, opt) {
  const ss = opt.ss || 2, W = opt.w * ss, H = opt.h * ss;
  const zb = new Float32Array(W * H).fill(Infinity);
  const col = new Float32Array(W * H * 3);
  const bgTop = opt.bgTop || [0.96, 0.95, 0.93], bgBot = opt.bgBot || [0.86, 0.85, 0.83];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = y / H, i = (y * W + x) * 3; for (let c = 0; c < 3; c++) col[i + c] = bgTop[c] * (1 - t) + bgBot[c] * t; }
  const f = norm3(sub3(cam.target, cam.eye)), r = norm3(cross3(f, cam.up)), u = cross3(r, f);
  const focal = (H / 2) / Math.tan((cam.fov || 30) * Math.PI / 360);
  const L = norm3(opt.light || [-0.5, 0.9, -0.6]);
  const L2 = norm3(opt.fill || [0.7, 0.3, -0.4]);
  // ---- carte d'ombres (projection orthographique selon la lumiere)
  const S = opt.shadowRes || 2048;
  const lz = [-L[0], -L[1], -L[2]];
  let lx = norm3(cross3(Math.abs(lz[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], lz)); const ly = cross3(lz, lx);
  let mn = [Infinity, Infinity], mx = [-Infinity, -Infinity];
  for (const o of objs) if (!o.noCast) for (let k = 0; k < o.tris.length; k += 3) { const p = [o.tris[k], o.tris[k + 1], o.tris[k + 2]]; const a = dot3(p, lx), b = dot3(p, ly); mn = [Math.min(mn[0], a), Math.min(mn[1], b)]; mx = [Math.max(mx[0], a), Math.max(mx[1], b)]; }
  const sc = (S - 4) / Math.max(mx[0] - mn[0], mx[1] - mn[1]);
  const sm = new Float32Array(S * S).fill(Infinity);
  const toL = p => [(dot3(p, lx) - mn[0]) * sc + 2, (dot3(p, ly) - mn[1]) * sc + 2, dot3(p, lz)];
  for (const o of objs) {
    if (o.noCast) continue;
    const t = o.tris;
    for (let k = 0; k < t.length; k += 9) {
      const A = toL([t[k], t[k + 1], t[k + 2]]), B = toL([t[k + 3], t[k + 4], t[k + 5]]), C = toL([t[k + 6], t[k + 7], t[k + 8]]);
      raster(A, B, C, S, S, (px, py, w0, w1, w2) => { const d = w0 * A[2] + w1 * B[2] + w2 * C[2]; const i = py * S + px; if (d < sm[i]) sm[i] = d; });
    }
  }
  const bias = opt.bias || 0.6;
  function shadow(p) {
    const q = toL(p); let lit = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = Math.round(q[0]) + dx, y = Math.round(q[1]) + dy; n++;
      if (x < 0 || y < 0 || x >= S || y >= S) { lit++; continue; }
      if (q[2] <= sm[y * S + x] + bias) lit++;
    }
    return lit / n;
  }
  // ---- rendu camera
  for (const o of objs) {
    const t = o.tris, base = o.color, spec = o.spec == null ? 0.12 : o.spec;
    for (let k = 0; k < t.length; k += 9) {
      const P0 = [t[k], t[k + 1], t[k + 2]], P1 = [t[k + 3], t[k + 4], t[k + 5]], P2 = [t[k + 6], t[k + 7], t[k + 8]];
      const n = norm3(cross3(sub3(P1, P0), sub3(P2, P0)));
      const back = dot3(n, sub3(cam.eye, P0)) <= 0;
      if (back && !o.twoSided && !o.clip) continue;
      if (o.clip && [P0, P1, P2].every(p => dot3(p, o.clip.n) > o.clip.d)) continue;
      const nn = back ? [-n[0], -n[1], -n[2]] : n;
      const cutFace = back && o.clip;
      const cs = [P0, P1, P2].map(p => { const d = sub3(p, cam.eye); return [dot3(d, r), dot3(d, u), dot3(d, f)]; });
      if (cs.some(c => c[2] < 1)) continue;
      const sp = cs.map(c => [W / 2 + focal * c[0] / c[2], H / 2 - focal * c[1] / c[2], c[2]]);
      const dif = Math.max(0, dot3(nn, L)), dif2 = Math.max(0, dot3(nn, L2));
      const vdir = norm3(sub3(cam.eye, P0));
      const hv = norm3([L[0] + vdir[0], L[1] + vdir[1], L[2] + vdir[2]]);
      const sp1 = Math.pow(Math.max(0, dot3(nn, hv)), 40) * spec;
      const sky = 0.5 + 0.5 * nn[1];
      raster(sp[0], sp[1], sp[2], W, H, (px, py, w0, w1, w2) => {
        const iz = w0 / sp[0][2] + w1 / sp[1][2] + w2 / sp[2][2];
        const z = 1 / iz, i = py * W + px;
        if (z >= zb[i]) return;
        const a0 = w0 / sp[0][2] * z, a1 = w1 / sp[1][2] * z, a2 = w2 / sp[2][2] * z;
        const wp = [P0[0] * a0 + P1[0] * a1 + P2[0] * a2, P0[1] * a0 + P1[1] * a1 + P2[1] * a2, P0[2] * a0 + P1[2] * a1 + P2[2] * a2];
        if (o.clip && dot3(wp, o.clip.n) > o.clip.d) return;
        zb[i] = z;
        if (cutFace) { const cc = o.cutColor || [0.2, 0.2, 0.25]; for (let c = 0; c < 3; c++) col[i * 3 + c] = cc[c]; return; }
        const sh = dif > 0 ? shadow([wp[0] + nn[0] * 0.3, wp[1] + nn[1] * 0.3, wp[2] + nn[2] * 0.3]) : 0;
        const amb = 0.30 + 0.16 * sky;
        const bc = o.colorFn ? o.colorFn(wp) : base;
        for (let c = 0; c < 3; c++) col[i * 3 + c] = bc[c] * (amb + 0.68 * dif * sh + 0.16 * dif2) + sp1 * sh;
      });
    }
  }
  // ---- sous-echantillonnage
  const out = Buffer.alloc(opt.w * opt.h * 3);
  for (let y = 0; y < opt.h; y++) for (let x = 0; x < opt.w; x++) for (let c = 0; c < 3; c++) {
    let s = 0;
    for (let dy = 0; dy < ss; dy++) for (let dx = 0; dx < ss; dx++) s += col[((y * ss + dy) * W + x * ss + dx) * 3 + c];
    let v = s / (ss * ss);
    if (opt.vignette) { const dx = (x / opt.w - 0.5) * 2, dy = (y / opt.h - 0.5) * 2; v *= 1 - opt.vignette * (dx * dx + dy * dy) / 2; }
    out[(y * opt.w + x) * 3 + c] = Math.max(0, Math.min(255, Math.round(255 * Math.pow(Math.max(0, v), 1 / 1.15))));
  }
  return out;
}

function raster(A, B, C, W, H, cb) {
  const minx = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), maxx = Math.min(W - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
  const miny = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), maxy = Math.min(H - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
  const area = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
  if (Math.abs(area) < 1e-12) return;
  for (let y = miny; y <= maxy; y++) {
    const py = y + 0.5;
    for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5;
      const w0 = ((B[0] - px) * (C[1] - py) - (B[1] - py) * (C[0] - px)) / area;
      const w1 = ((C[0] - px) * (A[1] - py) - (C[1] - py) * (A[0] - px)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-9 || w1 < -1e-9 || w2 < -1e-9) continue;
      cb(x, y, w0, w1, w2);
    }
  }
}

function blit(dst, dw, src, sw, sh, ox, oy) {
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) for (let c = 0; c < 3; c++) dst[((y + oy) * dw + x + ox) * 3 + c] = src[(y * sw + x) * 3 + c];
}

module.exports = { render, writePNG, meshTris, blit };

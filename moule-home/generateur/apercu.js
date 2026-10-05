'use strict';
const path = require('path');
const fs = require('fs');
const M = require('./moules.js');
const R = require('./render.js');
const out = process.argv[2] || 'out';
fs.mkdirSync(path.join(out, 'apercu'), { recursive: true });

const data = {};
let Lroot;
for (const name of ['H', 'O', 'M', 'E']) {
  const B = M.buildLetter(name);
  const mold = M.buildMold(B);
  const pos = M.buildPositive(B, mold);
  data[name] = { B, mold, pos };
  Lroot = { root: mold.box.by1 - mold.yRootEnd, toTipCenter: pk => mold.box.by1 - (M.P.H - pk.L + pk.rTip) };
}
const pins = { longue: M.buildPin('longue', Lroot).mesh, courte: M.buildPin('courte', Lroot).mesh };

// ---------- 1. HOME debout (lettres finies)
{
  const objs = [];
  let x0 = 0;
  const gap = 18;
  const placed = {};
  for (const name of ['H', 'O', 'M', 'E']) {
    const { B, pos } = data[name];
    // repere physique : miroir x (lecture correcte de face), face avant vers -z
    let lo = Infinity, hi = -Infinity;
    for (const p of pos.mesh.v) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); }
    const dx = x0 - lo;
    objs.push({ tris: R.meshTris(pos.mesh, p => [p[0] + dx, p[1], -p[2]], true), color: B.def.color, spec: 0.08 });
    placed[name] = dx;
    x0 += hi - lo + gap;
  }
  const W = x0 - gap;
  const g = 400;
  const ground = new Float64Array([-g, 0, -g - 200, W + g, 0, -g - 200, W + g, 0, g, -g, 0, -g - 200, W + g, 0, g, -g, 0, g]);
  objs.push({ tris: ground, color: [0.97, 0.97, 0.96], spec: 0.0, noCast: true, twoSided: true });
  const img = R.render(objs, { eye: [W / 2 + 150, 300, 660], target: [W / 2, 75, -30], up: [0, 1, 0], fov: 34 }, { w: 1400, h: 700, ss: 2, light: [-0.45, 0.85, 0.55], fill: [0.7, 0.3, 0.5], bias: 0.8 });
  R.writePNG(path.join(out, 'apercu', 'resultat-HOME.png'), 1400, 700, img);
}

// ---------- 2. moules avec tiges, vue 3/4
function moldScene(name) {
  const { B, mold } = data[name];
  const bx = mold.box;
  const toPhys = p => [bx.bx1 - p[0], p[1] - bx.by0, p[2]];
  const objs = [{ tris: R.meshTris(mold.mesh, toPhys, true), color: [0.38, 0.58, 0.84], spec: 0.25 }];
  for (const pin of B.def.pins) {
    const pm = pins[pin.kind];
    const xf = q => toPhys([pin.x + q[0], bx.by1 + M.P.flangeT - q[2], pin.zc + q[1]]);
    objs.push({ tris: R.meshTris(pm, xf, true), color: [0.95, 0.55, 0.18], spec: 0.3 });
  }
  const wx = bx.bx1 - bx.bx0, wy = bx.by1 - bx.by0;
  const g = 600;
  objs.push({ tris: new Float64Array([-g, -g, 0, wx + g, -g, 0, wx + g, wy + g, 0, -g, -g, 0, wx + g, wy + g, 0, -g, wy + g, 0]), color: [0.95, 0.95, 0.94], spec: 0, noCast: true, twoSided: true });
  return { objs, wx, wy, zt: bx.zt };
}
const tiles = [];
for (const name of ['H', 'O', 'M', 'E']) {
  const s = moldScene(name);
  const cam = { eye: [s.wx / 2 + 60, -250, 330], target: [s.wx / 2, s.wy / 2 + 10, 10], up: [0, 0, 1], fov: 38 };
  const img = R.render(s.objs, cam, { w: 700, h: 600, ss: 2, light: [0.35, -0.5, 0.85], fill: [-0.6, 0.2, 0.5], bias: 0.8 });
  R.writePNG(path.join(out, 'apercu', `moule-${name}.png`), 700, 600, img);
  tiles.push(img);
}
const grid = Buffer.alloc(1400 * 1200 * 3);
tiles.forEach((t, i) => R.blit(grid, 1400, t, 700, 600, (i % 2) * 700, Math.floor(i / 2) * 600));
R.writePNG(path.join(out, 'apercu', 'les-4-moules.png'), 1400, 1200, grid);

// ---------- 3. coupes : moule H + tige, et lettre H (trou a fleurs)
{
  const name = 'H';
  const { B, mold, pos } = data[name];
  const bx = mold.box;
  const toPhys = p => [bx.bx1 - p[0], p[1] - bx.by0, p[2]];
  const pin = B.def.pins[1];
  const px = toPhys([pin.x, 0, 0])[0];
  const clip = { n: [-1, 0, 0], d: -px };
  const objs = [{ tris: R.meshTris(mold.mesh, toPhys, true), color: [0.38, 0.58, 0.84], spec: 0.25, clip, cutColor: [0.18, 0.30, 0.50] }];
  for (const pn of B.def.pins) {
    const xf = q => toPhys([pn.x + q[0], bx.by1 + M.P.flangeT - q[2], pn.zc + q[1]]);
    objs.push({ tris: R.meshTris(pins[pn.kind], xf, true), color: [0.95, 0.55, 0.18], spec: 0.3, clip, cutColor: [0.70, 0.36, 0.08] });
  }
  const wx = bx.bx1 - bx.bx0, wy = bx.by1 - bx.by0, g = 600;
  objs.push({ tris: new Float64Array([-g, -g, 0, wx + g, -g, 0, wx + g, wy + g, 0, -g, -g, 0, wx + g, wy + g, 0, -g, wy + g, 0]), color: [0.95, 0.95, 0.94], spec: 0, noCast: true, twoSided: true });
  const cam = { eye: [px - 300, wy - 230, 190], target: [px + 15, wy - 85, 18], up: [0, 0, 1], fov: 40 };
  const img1 = R.render(objs, cam, { w: 700, h: 520, ss: 2, light: [-0.7, 0.3, 0.65], fill: [0.3, -0.6, 0.4], bias: 0.8 });
  // lettre H debout, coupee dans l'axe du trou
  const lx = p => [p[0], p[1], -p[2]];
  const clip2 = { n: [1, 0, 0], d: pin.x };     // on garde x <= axe du trou droit
  const objs2 = [{ tris: R.meshTris(pos.mesh, lx, true), color: B.def.color, spec: 0.06, clip: clip2, cutColor: [0.78, 0.76, 0.72] }];
  objs2.push({ tris: new Float64Array([-400, 0, -400, 600, 0, -400, 600, 0, 400, -400, 0, -400, 600, 0, 400, -400, 0, 400]), color: [0.97, 0.97, 0.96], spec: 0, noCast: true, twoSided: true });
  const cam2 = { eye: [pin.x + 300, 150, 150], target: [pin.x - 10, 92, -26], up: [0, 1, 0], fov: 40 };
  const img2 = R.render(objs2, cam2, { w: 700, h: 520, ss: 2, light: [0.6, 0.7, 0.4], fill: [-0.5, 0.3, 0.6], bias: 0.8 });
  const both = Buffer.alloc(1400 * 520 * 3);
  R.blit(both, 1400, img1, 700, 520, 0, 0);
  R.blit(both, 1400, img2, 700, 520, 700, 0);
  R.writePNG(path.join(out, 'apercu', 'coupes.png'), 1400, 520, both);
}
{
  const name = 'H';
  const { B, mold } = data[name];
  const bx = mold.box;
  const toPhys = p => [bx.bx1 - p[0], p[1] - bx.by0, p[2]];
  const objs = [{ tris: R.meshTris(mold.mesh, toPhys, true), color: [0.38, 0.58, 0.84], spec: 0.25 }];
  B.def.pins.forEach((pn, k) => {
    const pull = k === 0 ? 0 : 75;
    const xf = q => toPhys([pn.x + q[0], bx.by1 + M.P.flangeT + pull - q[2], pn.zc + q[1]]);
    objs.push({ tris: R.meshTris(pins[pn.kind], xf, true), color: [0.95, 0.55, 0.18], spec: 0.3 });
  });
  const wx = bx.bx1 - bx.bx0, wy = bx.by1 - bx.by0, g = 600;
  objs.push({ tris: new Float64Array([-g, -g, 0, wx + g, -g, 0, wx + g, wy + g + 300, 0, -g, -g, 0, wx + g, wy + g + 300, 0, -g, wy + g + 300, 0]), color: [0.95, 0.95, 0.94], spec: 0, noCast: true, twoSided: true });
  const cam = { eye: [wx / 2 - 120, wy + 330, 260], target: [wx / 2, wy / 2 + 30, 10], up: [0, 0, 1], fov: 36 };
  const img = R.render(objs, cam, { w: 1000, h: 650, ss: 2, light: [-0.3, 0.6, 0.75], fill: [0.6, -0.2, 0.4], bias: 0.8 });
  R.writePNG(path.join(out, 'apercu', 'mise-en-place-tiges.png'), 1000, 650, img);
}
console.log('ok');

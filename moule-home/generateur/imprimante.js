'use strict';
// Taille de l'imprimante Creality Ender-3 V3 SE comparee au plus grand moule (le M), a l'echelle
// Dimensions officielles : machine 349 x 364 x 490 mm, zone d'impression 220 x 220 x 250 mm.
const path = require('path');
const fs = require('fs');
const M = require('./moules.js');
const R = require('./render.js');
const U = require('./scene-utils.js');
const out = process.argv[2] || 'out';
fs.mkdirSync(path.join(out, 'apercu'), { recursive: true });

// le plus grand moule (celui qui occupe le plus le plateau)
const all = M.buildAll();
const sizes = {};
let big = null;
for (const n of ['H', 'O', 'M', 'E']) {
  const b = all.letters[n].mold.box;
  sizes[n] = [b.bx1 - b.bx0, b.by1 - b.by0, b.zt];
  if (!big || sizes[n][0] * sizes[n][1] > sizes[big][0] * sizes[big][1]) big = n;
}
const B = all.letters[big].B;
const mold = all.letters[big].mold;
const bx = mold.box, wx = bx.bx1 - bx.bx0, wy = bx.by1 - bx.by0;

// ---------- imprimante simplifiee (machine.js), tete garee en haut
const MA = require('./machine.js');
const { cx, top: bedTop } = MA.BEDINFO, cyBed = 182;
const objs = MA.printer({ headX: 172, tipZ: 242, bedY: cyBed });
// moule du M imprime, centre sur le plateau (repere physique : miroir x, triangles retournes)
const moldObj = { tris: R.meshTris(mold.mesh, p => [bx.bx1 - p[0] - wx / 2 + cx, p[1] - bx.by0 - wy / 2 + cyBed, p[2] + bedTop]), color: [0.30, 0.52, 0.82], spec: 0.3 };
moldObj.tris = (() => { const t = moldObj.tris; for (let k = 0; k < t.length; k += 9) for (let q = 0; q < 3; q++) { const a = t[k + 3 + q]; t[k + 3 + q] = t[k + 6 + q]; t[k + 6 + q] = a; } return t; })();
objs.push(moldObj);
// deux bobines de PLA de 1 kg posees a cote (diametre 200 mm)
function spool(x, y, color) {
  return [
    { tris: U.cylZ(x, y, 0, 4, 100, 64), color: [0.12, 0.12, 0.13], spec: 0.3 },
    { tris: U.cylZ(x, y, 4, 62, 84, 64), color, spec: 0.2 },
    { tris: U.cylZ(x, y, 62, 66, 100, 64), color: [0.12, 0.12, 0.13], spec: 0.3 },
    { tris: U.cylZ(x, y, 66, 66.6, 28, 40), color: [0.05, 0.05, 0.05], spec: 0 },
  ];
}
objs.push(...spool(500, 120, [0.32, 0.54, 0.84]), ...spool(500, 345, [0.93, 0.93, 0.92]));
objs.push(U.table(-900, -900, 1300, 1200));
U.grounded(objs);

const cam = { eye: [-420, -860, 610], target: [222, 190, 225], up: [0, 0, 1], fov: 34 };
const W = 1400, H = 1000;
const img = R.render(objs, cam, { w: W, h: H, ss: 2, bias: 0.7, vignette: 0.18, light: [-0.45, -0.55, 0.72], fill: [0.6, -0.3, 0.45], bgTop: [0.92, 0.9, 0.87], bgBot: [0.82, 0.8, 0.77] });
R.writePNG(path.join(out, 'apercu', 'imprimante-et-moule.png'), W, H, img);

// points utiles pour les cotes (en pixels de l'image)
const pr = U.projector(cam, W, H);
const pts = {
  hA: pr([-30, 210, 0]), hB: pr([-30, 210, 490]),
  wA: pr([0, -25, 0]), wB: pr([349, -25, 0]),
  dA: pr([-25, 0, 0]), dB: pr([-25, 364, 0]),
  mold: pr([cx, cyBed - wy / 2, bedTop + 26]),
  bed: pr([cx + 20, 38, 75]),
  spool: pr([500, 120, 66]),
};
// contour du moule du M vu de dessus (pour le schema)
const tops = B.L3.map(L => L[B.iTop].map(p => [bx.bx1 - p[0], p[1] - bx.by0]));
const top = tops[0];
fs.writeFileSync(path.join(out, 'apercu', 'imprimante-points.json'), JSON.stringify({ W, H, pts, big, sizes, mold: { wx, wy, top, tops } }));
console.log('ok', wx.toFixed(1), wy.toFixed(1));

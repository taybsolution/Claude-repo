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

const B = M.buildLetter('M');
const mold = M.buildMold(B);
const bx = mold.box, wx = bx.bx1 - bx.bx0, wy = bx.by1 - bx.by0;

// ---------- imprimante simplifiee (mm), x largeur, y profondeur (avant = 0), z hauteur
const FRAME = [0.20, 0.21, 0.23], BASE = [0.27, 0.28, 0.30], PLASTIC = [0.13, 0.13, 0.14], METAL = [0.72, 0.73, 0.75];
const BED = [0.09, 0.09, 0.10], SCREEN = [0.36, 0.55, 0.75];
const cx = 174.5, cyBed = 182, bedTop = 92, g = 300; // g : hauteur du portique, tete garee en haut
const parts = [
  ...[[8, 20], [311, 20], [8, 316], [311, 316]].map(([x, y]) => ({ t: U.boxTris(x, y, 0, x + 30, y + 30, 8), c: PLASTIC })),
  { t: U.boxTris(5, 14, 8, 344, 350, 75), c: BASE },
  { t: U.boxTris(268, 0, 22, 349, 16, 80), c: PLASTIC },              // ecran a l'avant droite
  { t: U.boxTris(278, -1, 32, 339, 0.2, 70), c: SCREEN, spec: 0.5 },
  { t: U.cylY(325, -1.2, 0.6, 51, 7, 24), c: METAL },                 // molette
  { t: U.boxTris(62, 70, 80, 287, 294, 86), c: METAL, spec: 0.4 },    // chariot Y
  { t: U.boxTris(cx - 117.5, cyBed - 117.5, 86, cx + 117.5, cyBed + 117.5, bedTop), c: BED, spec: 0.25 }, // plateau 235 mm
  { t: U.boxTris(14, 190, 75, 34, 230, 470), c: FRAME },              // montants
  { t: U.boxTris(315, 190, 75, 335, 230, 470), c: FRAME },
  { t: U.boxTris(14, 190, 470, 335, 230, 490), c: FRAME },            // traverse du haut
  { t: U.cylZ(46, 210, 75, 462, 4, 20), c: METAL, spec: 0.6 },        // vis Z
  { t: U.cylZ(303, 210, 75, 462, 4, 20), c: METAL, spec: 0.6 },
  { t: U.boxTris(34, 195, g, 315, 225, g + 40), c: FRAME },           // portique X
  { t: U.boxTris(8, 184, g - 12, 52, 236, g + 52), c: PLASTIC },
  { t: U.boxTris(297, 184, g - 12, 341, 236, g + 52), c: PLASTIC },
  { t: U.boxTris(142, 150, g - 48, 207, 196, g + 46), c: PLASTIC },   // tete d'impression
  { t: U.cylY(174.5, 148.8, 150.2, g - 6, 17, 32), c: [0.24, 0.25, 0.27] }, // ventilateur
  { t: U.latheTris([[0, -10], [1, -10], [4, 0], [0, 0]], 16, p => [p[0] + 172, p[1] + 172, p[2] + g - 48]), c: [0.75, 0.6, 0.25], spec: 0.6 }, // buse
];
const objs = parts.map(p => ({ tris: p.t, color: p.c, spec: p.spec == null ? 0.15 : p.spec }));
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
const top = B.L3[0][B.iTop].map(p => [bx.bx1 - p[0], p[1] - bx.by0]);
fs.writeFileSync(path.join(out, 'apercu', 'imprimante-points.json'), JSON.stringify({ W, H, pts, mold: { wx, wy, top } }));
console.log('ok', wx.toFixed(1), wy.toFixed(1));

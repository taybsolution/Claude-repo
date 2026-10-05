'use strict';
// Creality Ender-3 V3 SE simplifiee, en mm : x largeur, y profondeur (avant = 0), z hauteur.
// Machine 349 x 364 x 490 mm, zone d'impression 220 x 220 x 250 mm.
// Le plateau avance et recule (y), la tete se deplace sur le portique (x), le portique monte (z).
const U = require('./scene-utils.js');

const FRAME = [0.20, 0.21, 0.23], BASE = [0.27, 0.28, 0.30], PLASTIC = [0.13, 0.13, 0.14], METAL = [0.72, 0.73, 0.75];
const BED = [0.09, 0.09, 0.10], SCREEN = [0.36, 0.55, 0.75], BRASS = [0.75, 0.6, 0.25], ALU = [0.62, 0.63, 0.65];
// cx : milieu du plateau en x ; top : dessus du plateau ; nozzleY : y fixe de la buse
const BEDINFO = { cx: 174.5, top: 92, size: 235, nozzleY: 172 };

// plaque d'impression : noire, legerement granitee
function plateColor(wp) {
  const n = Math.sin(wp[0] * 2.7 + Math.sin(wp[1] * 1.9) * 2) * Math.sin(wp[1] * 2.3 + Math.sin(wp[0] * 1.7) * 2);
  const g = 1 + 0.12 * n;
  return [BED[0] * g, BED[1] * g, BED[2] * g * 1.04];
}

// headX : x de la buse ; tipZ : hauteur de la pointe de la buse ; bedY : milieu du plateau en y
function printer(opt = {}) {
  const headX = opt.headX == null ? 172 : opt.headX;
  const tipZ = opt.tipZ == null ? 242 : opt.tipZ;
  const bedY = opt.bedY == null ? 182 : opt.bedY;
  const { cx, top: bedTop, size } = BEDINFO, hs = size / 2;
  const g = tipZ + 58;                       // bas du portique
  const hx = headX - 172;                    // decalage de la tete par rapport a la position d'origine
  const parts = [
    ...[[8, 20], [311, 20], [8, 316], [311, 316]].map(([x, y]) => ({ t: U.boxTris(x, y, 0, x + 30, y + 30, 8), c: PLASTIC })),
    { t: U.boxTris(5, 14, 8, 344, 350, 75), c: BASE },
    { t: U.boxTris(268, 0, 22, 349, 16, 80), c: PLASTIC },              // ecran a l'avant droite
    { t: U.boxTris(278, -1, 32, 339, 0.2, 70), c: SCREEN, spec: 0.5 },
    { t: U.cylY(325, -1.2, 0.6, 51, 7, 24), c: METAL },                 // molette
    { t: U.boxTris(62, bedY - 112, 80, 287, bedY + 112, 86), c: METAL, spec: 0.4 },   // chariot Y
    { t: U.boxTris(cx - hs, bedY - hs, 86, cx + hs, bedY + hs, bedTop - 1.2), c: ALU, spec: 0.3 },   // plateau chauffant
    { t: U.boxTris(cx - hs + 1, bedY - hs + 1, bedTop - 1.2, cx + hs - 1, bedY + hs - 1, bedTop), c: BED, spec: 0.25, fn: plateColor }, // plaque
    { t: U.boxTris(cx - 20, bedY - hs - 7, bedTop - 1.2, cx + 20, bedY - hs + 1, bedTop), c: BED, spec: 0.25 },   // languette de la plaque
    { t: U.boxTris(14, 190, 75, 34, 230, 470), c: FRAME },              // montants
    { t: U.boxTris(315, 190, 75, 335, 230, 470), c: FRAME },
    { t: U.boxTris(14, 190, 470, 335, 230, 490), c: FRAME },            // traverse du haut
    { t: U.cylZ(46, 210, 75, 462, 4, 20), c: METAL, spec: 0.6 },        // vis Z
    { t: U.cylZ(303, 210, 75, 462, 4, 20), c: METAL, spec: 0.6 },
    { t: U.boxTris(34, 195, g, 315, 225, g + 40), c: FRAME },           // portique X
    { t: U.boxTris(8, 184, g - 12, 52, 236, g + 52), c: PLASTIC },
    { t: U.boxTris(297, 184, g - 12, 341, 236, g + 52), c: PLASTIC },
    // tete d'impression
    { t: U.boxTris(142 + hx, 150, g - 44, 207 + hx, 196, g + 46), c: PLASTIC },
    { t: U.cylY(174.5 + hx, 148.8, 150.2, g - 6, 17, 32), c: [0.24, 0.25, 0.27] },     // ventilateur
    { t: U.cylY(174.5 + hx, 148.4, 148.9, g - 6, 6, 20), c: [0.30, 0.31, 0.33] },      // moyeu du ventilateur
    { t: U.boxTris(196 + hx, 158, g - 52, 207 + hx, 186, g - 44), c: PLASTIC },         // buse de soufflage
    { t: U.boxTris(162 + hx, 163, tipZ + 4, 182 + hx, 181, tipZ + 14), c: ALU, spec: 0.5 },   // bloc de chauffe
    { t: U.latheTris([[0, 0], [1, 0], [3.5, 4], [3.5, 5], [0, 5]], 16, p => [p[0] + headX, p[1] + 172, p[2] + tipZ]), c: BRASS, spec: 0.6 }, // buse
    { t: U.boxTris(162 + hx, 164, g + 46, 184 + hx, 186, g + 64), c: PLASTIC },         // extrudeur
  ];
  if (opt.filament) parts.push({ t: U.cylZ(173 + hx, 175, g + 64, g + 420, 0.9, 10), c: opt.filament, spec: 0.3 });
  return parts.map(p => ({ tris: p.t, color: p.c, spec: p.spec == null ? 0.15 : p.spec, colorFn: p.fn }));
}

module.exports = { printer, BEDINFO, plateColor };

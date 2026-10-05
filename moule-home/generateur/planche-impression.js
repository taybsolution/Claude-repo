'use strict';
// Planche "impression dans la machine, puis le resultat final"
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const dir = path.join(process.argv[2] || 'out', 'apercu');
const img = f => 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64');
const steps = [
  ['impression-1-premiere-couche.png', 'Première couche', 'Les 20 premières minutes', 'La buse trace la bordure, puis remplit le fond en diagonale. Rester à côté : cette couche doit bien coller au plateau.'],
  ['impression-2-fond-et-cotes.png', 'Le fond et les côtes', 'Après environ 2 h', 'Le fond est plein, c\'est la partie la plus longue. La forme du H apparaît, avec les côtes qui feront la face avant de la lettre.'],
  ['impression-3-parois.png', 'Les parois montent', 'Après environ 4 h', 'Couche après couche. L\'intérieur des parois est une grille légère. Dans la paroi du haut, les trous des deux tiges se forment.'],
  ['impression-4-moule-fini.png', 'Le moule est fini', 'Environ 5 à 6 h en tout', 'La tête remonte. Laisser refroidir, retirer la plaque et la plier un peu : le moule se décolle. Enlever la bordure.'],
  ['impression-5-tiges.png', 'Les tiges', 'Environ 1 h par tige', 'Elles s\'impriment debout, disque sur le plateau. Il en faut 2 pour le H et 2 pour le M, 1 pour le E et 1 pour le O.'],
  ['impression-6-tout-imprime.png', 'Tout est imprimé', '4 moules et 6 tiges', 'Le moule du E est à l\'envers : c\'est normal, la lettre sort à l\'endroit. Prévoir 2 bobines de PLA de 1 kg.'],
];
const cards = steps.map(([f, t, when, d], i) => `
  <figure>
    <img src="${img(f)}">
    <figcaption><span class="n">${i + 1}</span><span><b>${t}</b><em>${when}</em>${d}</span></figcaption>
  </figure>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #efeae3; font-family: "DejaVu Sans", Arial, sans-serif; color: #222b33; }
  .wrap { width: 1240px; padding: 36px 40px 30px; box-sizing: border-box; }
  h1 { margin: 0 0 6px; font-size: 34px; letter-spacing: -0.01em; }
  h2 { margin: 34px 0 14px; font-size: 26px; }
  .sub { margin: 0 0 26px; font-size: 16px; color: #5d666e; line-height: 1.45; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 26px 24px; }
  figure { margin: 0; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 0 #d9d2c7; }
  figure img { display: block; width: 100%; }
  figcaption { display: grid; grid-template-columns: 38px 1fr; gap: 12px; padding: 14px 16px 16px; font-size: 16px; line-height: 1.45; }
  figcaption b { display: block; font-size: 18px; margin-bottom: 2px; }
  figcaption em { display: table; font-style: normal; font-size: 13px; font-weight: 700; color: #2c5fa8; background: #e5eefa; border-radius: 999px; padding: 2px 10px; margin: 2px 0 6px; }
  .n { width: 38px; height: 38px; border-radius: 50%; background: #2c5fa8; color: #fff; font-weight: 700; font-size: 19px; display: grid; place-items: center; }
  .final figcaption { grid-template-columns: 1fr; padding: 16px 20px 18px; font-size: 17px; }
  .final figcaption b { font-size: 20px; }
  .foot { margin-top: 18px; font-size: 13px; color: #6b737a; line-height: 1.5; }
</style></head><body><div class="wrap">
  <h1>L'impression dans la machine, puis le résultat final</h1>
  <p class="sub">Exemple avec le moule du H sur la Creality Ender-3 V3 SE. Images 3D faites à partir des vrais fichiers. Ce ne sont pas des photos réelles : rien n'a encore été imprimé.</p>
  <div class="grid">${cards}</div>
  <h2>Le résultat final</h2>
  <figure class="final">
    <img src="${img('resultat-final.png')}">
    <figcaption><span><b>Les 4 lettres-vases</b>Coulées en plâtre, séchées 3 à 7 jours, puis peintes aux couleurs de la photo. Le trou laissé par chaque tige sert à mettre des fleurs séchées.</span></figcaption>
  </figure>
  <p class="foot">Moule bleu et tiges orange : plastique PLA. Les temps sont estimés pour le moule du H avec les réglages du guide, ils changent selon le logiciel et la vitesse choisie. Les autres moules prennent 5 à 8 h.</p>
</div></body></html>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 1.5 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const el = await page.$('.wrap');
  await el.screenshot({ path: path.join(dir, 'impression-planche.jpg'), type: 'jpeg', quality: 86 });
  await browser.close();
  console.log('planche ok');
})();

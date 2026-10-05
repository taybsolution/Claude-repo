const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const img = f => 'data:image/png;base64,' + fs.readFileSync(require('path').join(process.argv[2] || 'out', 'apercu', f)).toString('base64');
const steps = [
  ['demoulage-1-platre-coule.png', 'Plâtre coulé et arasé, tiges en place', 'Attendre que le plâtre chauffe et devienne ferme : 20 à 40 minutes.'],
  ['demoulage-2-retirer-tiges.png', 'Retirer les tiges', 'Tourner chaque tige d\'un quart de tour, puis la tirer par son disque.'],
  ['demoulage-3-retourner.png', 'Retourner sur un chiffon', 'Après 1 heure, retourner le moule, tapoter le fond et le soulever. La lettre reste, côtes vers le haut.'],
  ['demoulage-4-lettre-sortie.png', 'La lettre est sortie', 'Les deux trous à fleurs sont faits. Le moule est prêt pour la lettre suivante.'],
  ['demoulage-5-les-4-lettres.png', 'Les 4 lettres brutes de démoulage', 'Laisser sécher 3 à 7 jours avant de poncer et de peindre.'],
];
const cards = steps.map(([f, t, d], i) => `
  <figure class="${i === 4 ? 'wide' : ''}">
    <img src="${img(f)}">
    <figcaption><span class="n">${i + 1}</span><span><b>${t}</b>${d}</span></figcaption>
  </figure>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #efeae3; font-family: "DejaVu Sans", Arial, sans-serif; color: #222b33; }
  .wrap { width: 1240px; padding: 36px 40px 30px; box-sizing: border-box; }
  h1 { margin: 0 0 6px; font-size: 34px; letter-spacing: -0.01em; }
  .sub { margin: 0 0 26px; font-size: 16px; color: #5d666e; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 26px 24px; }
  figure { margin: 0; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 0 #d9d2c7; }
  figure.wide { grid-column: 1 / -1; }
  figure img { display: block; width: 100%; }
  figure.wide img { height: 520px; object-fit: cover; object-position: center 55%; }
  figcaption { display: grid; grid-template-columns: 38px 1fr; gap: 12px; padding: 14px 16px 16px; font-size: 16px; line-height: 1.45; }
  figcaption b { display: block; font-size: 18px; margin-bottom: 2px; }
  .n { width: 38px; height: 38px; border-radius: 50%; background: #2c5fa8; color: #fff; font-weight: 700; font-size: 19px; display: grid; place-items: center; }
  .foot { margin-top: 18px; font-size: 13px; color: #6b737a; }
</style></head><body><div class="wrap">
  <h1>Démoulage d'une lettre, étape par étape</h1>
  <p class="sub">Images 3D faites à partir des fichiers des moules. Ce ne sont pas des photos réelles : rien n'a encore été coulé.</p>
  <div class="grid">${cards}</div>
  <p class="foot">Moule bleu : plastique PLA imprimé. Tiges orange : elles forment le trou pour les fleurs. Lettre blanche : plâtre.</p>
</div></body></html>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 1.5 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const el = await page.$('.wrap');
  await el.screenshot({ path: require('path').join(process.argv[2] || 'out', 'apercu', 'demoulage-planche.jpg'), type: 'jpeg', quality: 86 });
  await browser.close();
})();

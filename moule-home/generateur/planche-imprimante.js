'use strict';
// Planche "taille de l'imprimante comparee au moule" : rendu 3D + cotes + vue de dessus du plateau
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const dir = path.join(process.argv[2] || 'out', 'apercu');
const info = JSON.parse(fs.readFileSync(path.join(dir, 'imprimante-points.json'), 'utf8'));
const img = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, 'imprimante-et-moule.png')).toString('base64');
const { W, H, pts, mold, big, sizes } = info;
const cm = v => (v / 10).toFixed(1).replace('.', ',');
const cm0 = v => Math.round(v / 10);

function dim(a, b, label, off) {
  const [x1, y1] = a, [x2, y2] = b;
  const mx = (x1 + x2) / 2 + off[0], my = (y1 + y2) / 2 + off[1];
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), nx = -dy / l * 9, ny = dx / l * 9;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="dl"/>
    <line x1="${x1 - nx}" y1="${y1 - ny}" x2="${x1 + nx}" y2="${y1 + ny}" class="dl"/>
    <line x1="${x2 - nx}" y1="${y2 - ny}" x2="${x2 + nx}" y2="${y2 + ny}" class="dl"/>
    <g transform="translate(${mx},${my})"><rect x="-44" y="-19" width="88" height="34" rx="6" class="tagbg"/><text class="dt" text-anchor="middle" y="7">${label}</text></g>`;
}
function tag(pt, lines, dy) {
  const w = Math.max(...lines.map(l => l.length)) * 11.6 + 26, h = lines.length * 25 + 14;
  const x = pt[0] - w / 2, y = pt[1] - h / 2 + (dy || 0);
  const t = lines.map((l, i) => `<text x="${pt[0]}" y="${y + 29 + i * 25}" text-anchor="middle" class="${i ? 'tg2' : 'tg1'}">${l}</text>`).join('');
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="tagdark"/>${t}`;
}
const overlay = `<svg viewBox="0 0 ${W} ${H}" class="ov">
  ${dim(pts.hA, pts.hB, '49 cm', [-58, 0])}
  ${dim(pts.wA, pts.wB, '35 cm', [0, 40])}
  ${dim(pts.dA, pts.dB, '36 cm', [-62, 6])}
  ${tag(pts.mold, ['Moule du ' + big, cm0(sizes[big][0]) + ' × ' + cm0(sizes[big][1]) + ' cm, haut de ' + cm(sizes[big][2]) + ' cm'])}
  ${tag(pts.bed, ['Plateau 22 × 22 cm'], 4)}
  ${tag(pts.spool, ['Bobine de PLA 1 kg', 'Ø 20 cm'], -4)}
</svg>`;

// vue de dessus du plateau, a l'echelle (2 px par mm)
const s = 2, bed = 220, pad = 100, ox = pad, oy = 60;
const mx0 = (bed - mold.wx) / 2, my0 = (bed - mold.wy) / 2;
const X = x => ox + x * s, Y = y => oy + (bed - y) * s;
const cavs = (mold.tops || [mold.top]).map(t => t.map(([x, y]) => `${X(mx0 + x).toFixed(1)},${Y(my0 + y).toFixed(1)}`).join(' '));
const vbW = bed * s + 2 * pad, vbH = bed * s + oy + 130;
const topSvg = `<svg viewBox="0 0 ${vbW} ${vbH}" class="top">
  <rect x="${X(-7.5)}" y="${Y(227.5)}" width="${235 * s}" height="${235 * s}" rx="8" class="plate"/>
  <rect x="${X(0)}" y="${Y(bed)}" width="${bed * s}" height="${bed * s}" class="zone"/>
  <rect x="${X(mx0)}" y="${Y(my0 + mold.wy)}" width="${mold.wx * s}" height="${mold.wy * s}" rx="3" class="mold"/>
  <polygon points="${cavs[0]}" class="cav"/>${cavs.slice(1).map(c => `<polygon points="${c}" class="isl"/>`).join('')}
  <line x1="${X(0)}" y1="${Y(110)}" x2="${X(mx0)}" y2="${Y(110)}" class="mg"/>
  <line x1="${X(mx0 + mold.wx)}" y1="${Y(110)}" x2="${X(bed)}" y2="${Y(110)}" class="mg"/>
  <text x="${X(-7.5) - 10}" y="${Y(110) + 6}" class="mt" text-anchor="end">${Math.round(mx0)} mm</text>
  <text x="${X(227.5) + 10}" y="${Y(110) + 6}" class="mt">${Math.round(mx0)} mm</text>
  <line x1="${X(bed / 2)}" y1="${Y(bed)}" x2="${X(bed / 2)}" y2="${Y(bed - my0)}" class="mg"/>
  <line x1="${X(bed / 2)}" y1="${Y(my0)}" x2="${X(bed / 2)}" y2="${Y(0)}" class="mg"/>
  <text x="${X(bed / 2)}" y="${Y(227.5) - 12}" class="mt" text-anchor="middle">${Math.round(my0)} mm</text>
  <text x="${X(bed / 2)}" y="${Y(-7.5) + 28}" class="mt" text-anchor="middle">${Math.round(my0)} mm</text>
  <text x="${X(bed / 2)}" y="${Y(-7.5) + 68}" text-anchor="middle" class="cap">Zone d'impression 220 × 220 mm · moule du ${big} ${Math.round(mold.wx)} × ${Math.round(mold.wy)} mm</text>
  <text x="${X(bed / 2)}" y="${Y(-7.5) + 96}" text-anchor="middle" class="cap2">↓ avant de la machine</text>
</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #efeae3; font-family: "DejaVu Sans", Arial, sans-serif; color: #222b33; }
  .wrap { width: 1480px; padding: 34px 40px 30px; box-sizing: border-box; }
  h1 { margin: 0 0 6px; font-size: 34px; }
  .sub { margin: 0 0 20px; font-size: 16px; color: #5d666e; }
  .hero { position: relative; width: 1400px; height: 1000px; border-radius: 12px; overflow: hidden; }
  .hero img { display: block; width: 1400px; height: 1000px; }
  .ov { position: absolute; inset: 0; width: 1400px; height: 1000px; }
  .dl { stroke: #c2410c; stroke-width: 3; }
  .dt { font-size: 21px; font-weight: 700; fill: #9a3412; }
  .tagbg { fill: rgba(255,255,255,0.92); stroke: #c2410c; stroke-width: 1.5; }
  .tagdark { fill: rgba(16,30,52,0.86); }
  .tg1 { font-size: 20px; font-weight: 700; fill: #ffffff; }
  .tg2 { font-size: 17px; fill: #d6e4f5; }
  .ld { stroke: #1e3a5f; stroke-width: 2.5; }
  .ct { font-size: 21px; fill: #10233d; font-weight: 700; paint-order: stroke; stroke: rgba(255,255,255,0.9); stroke-width: 6px; stroke-linejoin: round; }
  .row { display: grid; grid-template-columns: 600px 1fr; gap: 30px; margin-top: 26px; align-items: start; }
  .card { background: #fff; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 0 #d9d2c7; }
  .card h2 { margin: 0 0 10px; font-size: 21px; }
  .top { width: 100%; display: block; }
  .plate { fill: #1d1f22; } .zone { fill: #2a2d31; stroke: #8b949e; stroke-width: 2; stroke-dasharray: 8 6; }
  .mold { fill: #4d84cf; } .cav { fill: #9cc0ee; stroke: #2c5fa8; stroke-width: 2; } .isl { fill: #4d84cf; stroke: #2c5fa8; stroke-width: 2; }
  .mg { stroke: #f97316; stroke-width: 4; } .mt { font-size: 20px; font-weight: 700; fill: #c2410c; }
  .cap { font-size: 17px; fill: #222b33; } .cap2 { font-size: 15px; fill: #6b737a; }
  table { border-collapse: collapse; width: 100%; font-size: 18px; }
  td { padding: 10px 8px; border-bottom: 1px solid #e5ded3; vertical-align: top; }
  td:last-child { text-align: right; font-weight: 700; white-space: nowrap; }
  tr:last-child td { border-bottom: 0; }
  .note { margin: 14px 0 0; font-size: 16px; line-height: 1.5; color: #39434c; }
</style></head><body><div class="wrap">
  <h1>Taille de l'imprimante comparée au moule</h1>
  <p class="sub">Creality Ender-3 V3 SE avec le plus grand moule, celui du ${big}, posé sur le plateau. Image 3D simplifiée, à l'échelle.</p>
  <div class="hero"><img src="${img}">${overlay}</div>
  <div class="row">
    <div class="card"><h2>Le plateau vu de dessus</h2>${topSvg}</div>
    <div class="card"><h2>Dimensions</h2>
      <table>
        <tr><td>Imprimante Ender-3 V3 SE, largeur × profondeur × hauteur</td><td>35 × 36 × 49 cm</td></tr>
        <tr><td>Poids de l'imprimante</td><td>7,1 kg</td></tr>
        <tr><td>Zone d'impression</td><td>22 × 22 × 25 cm</td></tr>
        ${['H', 'O', 'M', 'E'].sort((a, b) => sizes[b][0] - sizes[a][0]).map(n => `<tr><td>Moule du ${n}${n === big ? ', le plus grand' : ''}</td><td>${cm(sizes[n][0])} × ${cm(sizes[n][1])} × ${cm(sizes[n][2])} cm</td></tr>`).join('')}
      </table>
      <p class="note">Les 4 moules passent, un par impression. Prévoir de la place devant et derrière la machine : le plateau avance et recule pendant l'impression.</p>
    </div>
  </div>
</div></body></html>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1480, height: 1200 }, deviceScaleFactor: 1.25 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await (await page.$('.wrap')).screenshot({ path: path.join(dir, 'taille-imprimante.jpg'), type: 'jpeg', quality: 86 });
  await browser.close();
  console.log('planche ok');
})();

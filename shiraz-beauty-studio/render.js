// Render the HTML strategy document to PDF with Playwright, check page overflow, screenshot pages.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const htmlPath = path.resolve(process.argv[2] || 'strategie.html');
  const outPdf = path.resolve(process.argv[3] || 'strategie.pdf');
  const shots = process.argv.includes('--shots');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 1 });
  await page.goto('file://' + htmlPath, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const report = await page.evaluate(() => {
    const pages = Array.from(document.querySelectorAll('.page'));
    return pages.map((p, i) => {
      const title = (p.querySelector('h1,h2') || {}).textContent || '';
      return {
        page: i + 1,
        title: title.trim().slice(0, 60),
        scrollH: p.scrollHeight,
        clientH: p.clientHeight,
        overflowY: p.scrollHeight - p.clientHeight,
        overflowX: p.scrollWidth - p.clientWidth,
      };
    });
  });
  let bad = 0;
  for (const r of report) {
    const flag = r.overflowY > 0 || r.overflowX > 0 ? '  <-- OVERFLOW' : '';
    if (flag) bad++;
    console.log(`p${String(r.page).padStart(2, '0')} ${String(r.overflowY).padStart(5)}px y ${String(r.overflowX).padStart(4)}px x | ${r.title}${flag}`);
  }
  console.log(`pages: ${report.length}, overflowing: ${bad}`);

  if (shots) {
    const els = await page.$$('.page');
    for (let i = 0; i < els.length; i++) {
      await els[i].screenshot({ path: path.join('pages', `page-${String(i + 1).padStart(2, '0')}.png`) });
    }
    console.log('screenshots written');
  }

  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: outPdf, format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  console.log('pdf written:', outPdf, fs.statSync(outPdf).size, 'bytes');
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });

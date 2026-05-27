import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', e => console.error('PAGEERROR:', e.message));

await page.setRequestInterception(true);
page.on('request', req => {
  const u = req.url();
  if (u.includes('/api/step1')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ next_step: 2, whats_next: 'Tow' }) });
  } else { req.continue(); }
});

await page.goto('http://localhost:3400/', { waitUntil: 'networkidle0' });
await page.waitForSelector('input[placeholder="Model (e.g., Camry)"]');

await page.select('select', 'Toyota');
await page.type('input[placeholder="Model (e.g., Camry)"]', 'Camry');
await page.type('input[placeholder="Year (e.g., 2020)"]', '2020');

// Upload photo
const dir = mkdtempSync(join(tmpdir(), 'ccb-'));
const file = join(dir, 'p.png');
writeFileSync(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
const cp = page.waitForFileChooser();
await page.click('label[style*="dashed"]');
const chooser = await cp;
await chooser.accept([file]);
await page.waitForFunction(() => document.querySelectorAll('img[alt="Damage"]').length > 0);

// Click Continue → step 2
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  btns.find(b => b.textContent.includes('Continue')).click();
});

await page.waitForFunction(() => document.body.textContent.includes('Request a tow truck'), { timeout: 8000 });

// Hit Back
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Back')).click();
});
await page.waitForFunction(() => document.body.textContent.includes('Document the accident'));

const restored = await page.evaluate(() => ({
  make: document.querySelector('select')?.value,
  model: document.querySelector('input[placeholder="Model (e.g., Camry)"]')?.value,
  year: document.querySelector('input[placeholder="Year (e.g., 2020)"]')?.value,
  photoCount: document.querySelectorAll('img[alt="Damage"]').length,
}));

console.log('After Back from step 2 → step 1:', restored);
const ok = restored.make === 'Toyota' && restored.model === 'Camry' && restored.year === '2020' && restored.photoCount > 0;
console.log(ok ? 'OK: state restored on Back' : 'BUG: state lost on Back');

await page.screenshot({ path: '/tmp/cc-step1-after-back.png', fullPage: true });

await browser.close();
process.exit(ok ? 0 : 1);

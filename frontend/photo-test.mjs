import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:3400/';

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', args: ['--no-sandbox'],
});
const page = await browser.newPage();
page.on('pageerror', e => console.error('PAGEERROR:', e.message));

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('input[placeholder="Model (e.g., Camry)"]');

// Type into Model + Year BEFORE adding photo
await page.type('input[placeholder="Model (e.g., Camry)"]', 'Camry');
await page.type('input[placeholder="Year (e.g., 2020)"]', '2020');

// Select Make
await page.select('select', 'Toyota');

const before = await page.evaluate(() => ({
  make: document.querySelector('select')?.value,
  model: document.querySelector('input[placeholder="Model (e.g., Camry)"]')?.value,
  year: document.querySelector('input[placeholder="Year (e.g., 2020)"]')?.value,
}));

// Add a photo
const dir = mkdtempSync(join(tmpdir(), 'ccpic-'));
const file = join(dir, 'tiny.png');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
writeFileSync(file, png);

const chooserPromise = page.waitForFileChooser();
await page.click('label[style*="dashed"]');
const chooser = await chooserPromise;
await chooser.accept([file]);

// wait for thumbnail to appear (photos state updated)
await page.waitForFunction(() => document.querySelectorAll('img[alt="Damage"]').length > 0, { timeout: 8000 });

const after = await page.evaluate(() => ({
  make: document.querySelector('select')?.value,
  model: document.querySelector('input[placeholder="Model (e.g., Camry)"]')?.value,
  year: document.querySelector('input[placeholder="Year (e.g., 2020)"]')?.value,
}));

console.log('BEFORE photo:', before);
console.log('AFTER  photo:', after);

const bug = before.make !== after.make || before.model !== after.model || before.year !== after.year;
console.log(bug ? 'BUG: vehicle fields cleared by photo upload' : 'OK: vehicle fields preserved');
await browser.close();
process.exit(bug ? 1 : 0);

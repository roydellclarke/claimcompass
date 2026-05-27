// Verify pointer-event swipe works with MOUSE drag (desktop), not just touch.
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 900 });

await page.setRequestInterception(true);
page.on('request', req => {
  if (req.url().includes('/api/step1')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ next_step: 2, whats_next: 'Tow' }) });
  } else { req.continue(); }
});

await page.goto('http://localhost:3400/', { waitUntil: 'networkidle0' });
await page.waitForSelector('input[placeholder="Model (e.g., Camry)"]');

// upload photo and continue to step 2
const dir = mkdtempSync(join(tmpdir(), 'mss-'));
const file = join(dir, 'p.png');
writeFileSync(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
const cp = page.waitForFileChooser();
await page.click('label[style*="dashed"]');
const chooser = await cp;
await chooser.accept([file]);
await page.waitForFunction(() => document.querySelectorAll('img[alt="Damage"]').length > 0);
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Continue')).click());
await page.waitForFunction(() => document.body.textContent.includes('Request a tow truck'));

// Apple convention: swipe RIGHT (drag left→right) = back; swipe LEFT (drag right→left) = forward.
const y = 200;

// On step 2, swipe RIGHT (left→right) → back to step 1.
await page.mouse.move(200, y);
await page.mouse.down();
for (let x = 250; x <= 600; x += 50) { await page.mouse.move(x, y); }
await page.mouse.up();
await new Promise(r => setTimeout(r, 700));
const back = await page.evaluate(() => document.body.textContent.includes('Document the accident'));
console.log('Mouse-drag swipe-RIGHT on step 2 → Document?', back ? 'YES (back)' : 'no');

if (back) {
  // On step 1 (photo already uploaded), swipe LEFT (right→left) → forward to step 2.
  await page.mouse.move(600, y);
  await page.mouse.down();
  for (let x = 550; x >= 200; x -= 50) { await page.mouse.move(x, y); }
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 900));
  const tow = await page.evaluate(() => document.body.textContent.includes('Request a tow truck'));
  console.log('Mouse-drag swipe-LEFT on step 1 → Tow?', tow ? 'YES (forward)' : 'no');
}

await browser.close();

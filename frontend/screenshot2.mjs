import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

await page.setRequestInterception(true);
page.on('request', req => {
  const u = req.url();
  if (u.includes('/api/step1')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ next_step: 2, whats_next: 'Tow' }) });
  } else if (u.includes('/api/step2')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ next_step: 3, whats_next: 'Claim' }) });
  } else { req.continue(); }
});

await page.goto('http://localhost:3400/', { waitUntil: 'networkidle0' });
await page.waitForSelector('input[placeholder="Model (e.g., Camry)"]');

// Upload photo and continue to step 2
const dir = mkdtempSync(join(tmpdir(), 'cc2-'));
const file = join(dir, 'p.png');
writeFileSync(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
const cp = page.waitForFileChooser();
await page.click('label[style*="dashed"]');
const chooser = await cp;
await chooser.accept([file]);
await page.waitForFunction(() => document.querySelectorAll('img[alt="Damage"]').length > 0);
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Continue')).click());
await page.waitForFunction(() => document.body.textContent.includes('Request a tow truck'));

await page.screenshot({ path: '/tmp/cc-step2.png', fullPage: true });

// On step 2, swipe LEFT (finger right → left, dx negative) → back to step 1
const client = await page.target().createCDPSession();
async function swipe(x0, x1, y) {
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove',  touchPoints: [{ x: (x0+x1)/2, y, id: 1 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd',   touchPoints: [] });
}
// swipe-left from step 2 → back to step 1
await swipe(350, 80, 400);
await new Promise(r => setTimeout(r, 600));
const docVisible = await page.evaluate(() => document.body.textContent.includes('Document the accident'));
console.log('Step 2 swipe-left → Document?', docVisible ? 'YES (back)' : 'no');

if (docVisible) {
  // swipe-right from step 1 → forward to step 2 (photo already uploaded, canForward=true)
  await swipe(80, 350, 400);
  await new Promise(r => setTimeout(r, 800));
  const towVisible = await page.evaluate(() => document.body.textContent.includes('Request a tow truck'));
  console.log('Step 1 swipe-right → Tow?', towVisible ? 'YES (forward)' : 'no');
}

await browser.close();

// Verify that during a drag, BOTH the outgoing and incoming pages are visible
// and translated in lock-step.
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', msg => console.log('PAGE:', msg.text()));
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

await page.setRequestInterception(true);
page.on('request', req => {
  if (req.url().includes('/api/step1')) {
    req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ next_step: 2, whats_next: 'Tow' }) });
  } else { req.continue(); }
});

await page.goto('http://localhost:3400/', { waitUntil: 'networkidle0' });
await page.waitForSelector('input[placeholder="Model (e.g., Camry)"]');

// Upload photo so swipe-forward is allowed.
const dir = mkdtempSync(join(tmpdir(), 'peek-'));
const file = join(dir, 'p.png');
writeFileSync(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
const cp = page.waitForFileChooser();
await page.click('label[style*="dashed"]');
const chooser = await cp;
await chooser.accept([file]);
await page.waitForFunction(() => document.querySelectorAll('img[alt="Damage"]').length > 0);

// Start a drag (left direction = forward) but don't release.
const client = await page.target().createCDPSession();
const y = 240; // header area, safe
const x0 = 380;
await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] });
// Move a couple of times to get past the axis-lock threshold and well into the drag.
await client.send('Input.dispatchTouchEvent', { type: 'touchMove',  touchPoints: [{ x: x0 - 60, y, id: 1 }] });
await new Promise(r => setTimeout(r, 30));
await client.send('Input.dispatchTouchEvent', { type: 'touchMove',  touchPoints: [{ x: x0 - 180, y, id: 1 }] });
await new Promise(r => setTimeout(r, 30));

// Take a screenshot at mid-drag to inspect.
await page.screenshot({ path: '/tmp/cc-peek.png', fullPage: false });

// Inspect the DOM: both pages should be present.
const peek = await page.evaluate(() => {
  const all = [...document.querySelectorAll('h1')].map(h => h.textContent);
  return { headings: all };
});
console.log('Headings visible mid-drag:', peek.headings);
const hasDoc = peek.headings.some(h => h.includes('Document'));
const hasTow = peek.headings.some(h => h.includes('tow truck') || h.includes('Tow'));
console.log('Outgoing (Document) visible?', hasDoc ? 'YES' : 'no');
console.log('Incoming (Tow) visible?', hasTow ? 'YES' : 'no');

// Release to complete the swipe.
await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await new Promise(r => setTimeout(r, 700));

const settled = await page.evaluate(() => [...document.querySelectorAll('h1')].map(h => h.textContent));
console.log('After release, headings:', settled);

await browser.close();

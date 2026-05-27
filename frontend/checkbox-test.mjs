import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:3400/';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
});

const page = await browser.newPage();
page.on('pageerror', e => console.error('PAGEERROR:', e.message));
page.on('console', msg => {
  const t = msg.type();
  const text = msg.text();
  if (text.includes('[Stable')) console.log('PAGE:', text);
  else if (t === 'error' || t === 'warn') console.error(`CONSOLE ${t.toUpperCase()}:`, text);
});

await page.goto(URL, { waitUntil: 'networkidle0' });

// Jump straight to step 3 by tweaking React state through window.
// Strategy: stub backend by mocking axios via /api/step1 and step2 responses.
await page.setRequestInterception(true);
page.on('request', req => {
  const u = req.url();
  if (u.includes('/api/step1')) {
    req.respond({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ next_step: 3, whats_next: 'File claim' }) });
  } else if (u.includes('/api/step2')) {
    req.respond({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ next_step: 3, whats_next: 'File claim' }) });
  } else {
    req.continue();
  }
});

// Step 1 requires a photo. Stub the upload-photo endpoint and fake a photo upload by
// directly inserting into state via clicking the camera area is hard; easier:
// inject a small script that drives the React state via a global, but we don't have one.
// Instead, we use the photo upload flow: we'll intercept /api/upload-photo, then
// drive the file input from the page.

// Actually simplest path: drive the photo input by attaching a file.
// The hidden input is created on-demand and clicked. We can listen for it.
// Use chooseFileChooser instead.

await page.waitForSelector('label[style*="dashed"]');

// Set up file chooser handler
const fileChooserPromise = page.waitForFileChooser();
await page.click('label[style*="dashed"]'); // tap photo area
const chooser = await fileChooserPromise;

// Use a tiny fake image
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
const dir = mkdtempSync(join(tmpdir(), 'ccpic-'));
const file = join(dir, 'tiny.png');
// 1x1 transparent PNG
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
writeFileSync(file, png);

// Intercept upload-photo
page.on('request', req => {});
await chooser.accept([file]);

// Wait for the photo to register in state (Continue button enables)
await page.waitForFunction(() => {
  const btns = [...document.querySelectorAll('button')];
  const cont = btns.find(b => b.textContent.includes('Continue'));
  return cont && !cont.disabled;
}, { timeout: 8000 });

// Click Continue → triggers /api/step1 (intercepted to return next_step=3)
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  btns.find(b => b.textContent.includes('Continue')).click();
});

// Wait for step 3 to render
await page.waitForSelector('input[placeholder="Policy Number"]', { timeout: 8000 });

// Type into Policy and Description
await page.type('input[placeholder="Policy Number"]', 'POL-12345');
await page.type('textarea[placeholder="Describe What Happened..."]', 'Rear-ended at red light');

const before = await page.evaluate(() => ({
  policy: document.querySelector('input[placeholder="Policy Number"]')?.value,
  desc: document.querySelector('textarea[placeholder="Describe What Happened..."]')?.value,
  checked: document.querySelector('input[type="checkbox"]')?.checked,
}));

// Click the checkbox
await page.click('input[type="checkbox"]');

await new Promise(r => setTimeout(r, 300));

const after = await page.evaluate(() => ({
  policy: document.querySelector('input[placeholder="Policy Number"]')?.value,
  desc: document.querySelector('textarea[placeholder="Describe What Happened..."]')?.value,
  checked: document.querySelector('input[type="checkbox"]')?.checked,
}));

console.log('BEFORE click:', before);
console.log('AFTER  click:', after);

const bug = after.policy !== before.policy || after.desc !== before.desc;
const checkboxOK = after.checked === true;
console.log('Policy/Description cleared?', bug ? 'YES (BUG)' : 'no');
console.log('Checkbox checked?', checkboxOK ? 'yes' : 'NO (BUG)');

await browser.close();
process.exit(bug || !checkboxOK ? 1 : 0);

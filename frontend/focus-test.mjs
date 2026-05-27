import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:3401/';

// We want to simulate the real failure condition: typing into the model field
// while/just before /api/start resolves. So we intentionally delay the
// /api/start response (it triggers setSessionId+setWhatsNext, which is the
// state update that used to remount the inputs).
//
// Strategy:
//   1. Open page with request interception.
//   2. Intercept /api/start and hold the response.
//   3. Wait for the form to render, focus the "Model" input, type one char.
//   4. THEN release the /api/start response. This is the moment the parent
//      re-renders. The bug: input remounts, focus lost, value emptied.
//   5. After release, verify: document.activeElement is still the input AND
//      its value still contains the character we typed.

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
});

const page = await browser.newPage();
page.on('pageerror', e => console.error('PAGEERROR:', e.message));
page.on('console', msg => {
  if (msg.type() === 'error') console.error('CONSOLE ERR:', msg.text());
});

// Intercept /api/start and hold it.
await page.setRequestInterception(true);
let releaseStart;
const startHeld = new Promise(r => { releaseStart = r; });
page.on('request', async req => {
  if (req.url().includes('/api/start')) {
    // Wait until we say go, then respond with a fake body.
    await startHeld;
    req.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ session_id: 'test-session', whats_next: 'Take photos' }),
    });
  } else {
    req.continue();
  }
});

await page.goto(URL, { waitUntil: 'domcontentloaded' });

// The model field is the first <input type="text"> (after the select for make).
// Wait for it to be present.
await page.waitForSelector('input[placeholder="Model (e.g., Camry)"]');

// Focus + type one character.
const sel = 'input[placeholder="Model (e.g., Camry)"]';
await page.focus(sel);
await page.keyboard.type('M');

// Sanity: before releasing /api/start, focus & value should be good.
const before = await page.evaluate((sel) => ({
  activePlaceholder: document.activeElement?.placeholder ?? null,
  value: document.querySelector(sel)?.value ?? null,
}), sel);

// NOW release /api/start. This is the parent state update that used to
// blow the inputs away.
releaseStart();

// Give React a tick to re-render in response.
await new Promise(r => setTimeout(r, 250));

const after = await page.evaluate((sel) => ({
  activePlaceholder: document.activeElement?.placeholder ?? null,
  value: document.querySelector(sel)?.value ?? null,
}), sel);

// Type a second character to confirm we can keep going from where we left off.
await page.keyboard.type('o');
const afterSecond = await page.evaluate((sel) => ({
  activePlaceholder: document.activeElement?.placeholder ?? null,
  value: document.querySelector(sel)?.value ?? null,
}), sel);

console.log('BEFORE  /api/start resolves:', before);
console.log('AFTER   /api/start resolves:', after);
console.log('AFTER second keystroke:     ', afterSecond);

const pass =
  before.value === 'M' &&
  after.activePlaceholder === 'Model (e.g., Camry)' &&
  after.value === 'M' &&
  afterSecond.value === 'Mo';

console.log(pass ? 'PASS: focus retained and value preserved across parent re-render' : 'FAIL: input lost focus or value');

await browser.close();
process.exit(pass ? 0 : 1);

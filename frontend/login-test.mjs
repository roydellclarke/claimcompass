import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:3401/';
const EMAIL = `e2e-${Date.now()}@example.com`;
const PASSWORD = 'puppet1234';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });

const logs = [];
page.on('console', msg => logs.push(`[console.${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => logs.push(`[pageerror] ${err.message}`));
page.on('request', req => { if (req.url().includes('/api/')) logs.push(`[req] ${req.method()} ${req.url()}`); });
page.on('response', res => { if (res.url().includes('/api/')) logs.push(`[res] ${res.status()} ${res.url()}`); });
page.on('requestfailed', req => logs.push(`[reqfailed] ${req.url()} :: ${req.failure()?.errorText}`));

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.screenshot({ path: '/tmp/cc-01-login.png' });
const onLogin = await page.$eval('h1', el => el.textContent);
console.log('initial h1:', JSON.stringify(onLogin));

// Switch to signup mode
const switchBtn = await page.evaluateHandle(() => {
  return [...document.querySelectorAll('button')].find(b => /create one/i.test(b.textContent));
});
await switchBtn.click();
await new Promise(r => setTimeout(r, 250));
const onSignup = await page.$eval('h1', el => el.textContent);
console.log('after switch h1:', JSON.stringify(onSignup));
await page.screenshot({ path: '/tmp/cc-02-signup.png' });

// Fill signup
await page.type('input[type="text"]', 'Ada Lovelace');
await page.type('input[type="email"]', EMAIL);
await page.type('input[type="password"]', PASSWORD);
await page.screenshot({ path: '/tmp/cc-03-filled.png' });

const debug = await page.evaluate(() => {
  const all = [...document.querySelectorAll('input')].map(i => ({ type: i.type, placeholder: i.placeholder, value: i.value }));
  const btns = [...document.querySelectorAll('button')].map(b => ({ text: b.textContent.trim().slice(0, 40), type: b.type, disabled: b.disabled }));
  return { inputs: all, buttons: btns };
});
console.log('debug pre-submit:', JSON.stringify(debug, null, 2));

// Submit — trigger form submit (Button onClick handles it)
console.log('clicking submit...');
const responseP = page.waitForResponse(r => r.url().includes('/api/auth/register'), { timeout: 8000 }).catch(e => ({ err: e.message }));
const clickResult = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => /create account/i.test(b.textContent));
  if (!btn) return 'no button';
  btn.click();
  return 'clicked';
});
console.log('click result:', clickResult);
const resp = await responseP;
console.log('response/err:', resp && resp.err ? resp.err : (resp ? `${resp.status()} ${resp.url()}` : 'undefined'));
console.log('--- logs after submit ---');
for (const l of logs) console.log(' ', l);
if (resp && resp.err) {
  const errVisible = await page.evaluate(() => {
    const el = document.querySelector('[role="alert"]');
    return el ? el.textContent : null;
  });
  console.log('error on page:', errVisible);
  await page.screenshot({ path: '/tmp/cc-fail-submit.png' });
  await browser.close();
  process.exit(1);
}
// Wait for /api/start to be issued (which means we're in the wizard now)
await page.waitForResponse(r => r.url().includes('/api/start') && r.status() === 200, { timeout: 8000 });
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: '/tmp/cc-04-after-signup.png' });
const wizardHeading = await page.$eval('h1', el => el.textContent);
console.log('wizard h1:', JSON.stringify(wizardHeading));

const localStorageToken = await page.evaluate(() => window.localStorage.getItem('cc_auth_token'));
console.log('token stored:', localStorageToken ? `yes (len=${localStorageToken.length})` : 'NO');

// Verify logout pill is showing email/name
const pill = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => /log out/i.test(b.textContent));
  return btn ? btn.parentElement.innerText : null;
});
console.log('logout pill text:', JSON.stringify(pill));

// Click logout
const logoutBtn = await page.evaluateHandle(() => {
  return [...document.querySelectorAll('button')].find(b => /log out/i.test(b.textContent));
});
await Promise.all([
  logoutBtn.click(),
  page.waitForResponse(r => r.url().includes('/api/auth/logout'), { timeout: 5000 }),
]);
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: '/tmp/cc-05-after-logout.png' });
const afterLogout = await page.$eval('h1', el => el.textContent);
console.log('after-logout h1:', JSON.stringify(afterLogout));
const tokenAfter = await page.evaluate(() => window.localStorage.getItem('cc_auth_token'));
console.log('token after logout:', tokenAfter === null ? 'cleared' : 'STILL PRESENT');

// Sign in with the same creds
await page.type('input[type="email"]', EMAIL);
await page.type('input[type="password"]', PASSWORD);
const signinBtn = await page.evaluateHandle(() => {
  return [...document.querySelectorAll('button')].find(b => /^sign in$/i.test(b.textContent));
});
await Promise.all([
  signinBtn.click(),
  page.waitForResponse(r => r.url().includes('/api/auth/login') && r.status() === 200, { timeout: 8000 }),
]);
await page.waitForResponse(r => r.url().includes('/api/start') && r.status() === 200, { timeout: 8000 });
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: '/tmp/cc-06-after-signin.png' });
const afterSignin = await page.$eval('h1', el => el.textContent);
console.log('after-signin h1:', JSON.stringify(afterSignin));

// Try a wrong-password login to verify error displays
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => /log out/i.test(b.textContent));
  btn && btn.click();
});
await new Promise(r => setTimeout(r, 400));
await page.type('input[type="email"]', EMAIL);
await page.type('input[type="password"]', 'wrong-password!');
const tryBtn = await page.evaluateHandle(() => {
  return [...document.querySelectorAll('button')].find(b => /^sign in$/i.test(b.textContent));
});
await Promise.all([
  tryBtn.click(),
  page.waitForResponse(r => r.url().includes('/api/auth/login') && r.status() === 401, { timeout: 5000 }),
]);
await new Promise(r => setTimeout(r, 200));
const errMsg = await page.evaluate(() => {
  const el = document.querySelector('[role="alert"]');
  return el ? el.textContent : null;
});
console.log('wrong-pw error:', JSON.stringify(errMsg));
await page.screenshot({ path: '/tmp/cc-07-wrong-pw.png' });

if (logs.length) {
  console.log('--- console/page logs ---');
  for (const l of logs) console.log(l);
}

await browser.close();
console.log('OK');

import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
await page.goto('http://localhost:3400/', { waitUntil: 'networkidle0' });
await page.screenshot({ path: '/tmp/cc-step1.png', fullPage: true });
console.log('saved /tmp/cc-step1.png');
await browser.close();

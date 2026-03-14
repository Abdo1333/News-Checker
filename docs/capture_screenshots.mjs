import puppeteer from '/opt/homebrew/lib/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'screenshots');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5173';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 820 });

async function shot(name) {
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: join(OUT, name + '.png') });
  console.log('✓ ' + name + '.png');
}
async function clickText(text) {
  await page.evaluate((t) => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent.trim() === t);
    if (b) b.click();
  }, text);
  await new Promise(r => setTimeout(r, 700));
}
async function scroll(y) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await new Promise(r => setTimeout(r, 300));
}

// Landing
await page.goto(BASE, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1200));
await shot('screen_landing');

// Activate Demo
await clickText('Demo');
await scroll(0);
await shot('screen_dashboard_top');
await scroll(420);
await shot('screen_dashboard_bottom');

// News tab
await clickText('News');
await scroll(0);
await shot('screen_news_form');
await scroll(520);
await shot('screen_news_list');

// Member tab
await clickText('Member');
await scroll(0);
await shot('screen_member_top');
await scroll(420);
await shot('screen_member_bottom');

// Admin tab
await clickText('Admin');
await scroll(0);
await shot('screen_admin_top');
await scroll(420);
await shot('screen_admin_bottom');

await browser.close();
console.log('\nAll 9 screenshots saved to docs/screenshots/');

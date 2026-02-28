import puppeteer from 'puppeteer';

const OUTPUT_DIR = '/Users/kleinjansarno/Obsidian/Prive/Prive/Veluwedroomchalet';
const BASE_URL = 'http://localhost:3000/beheer-vlp-x9q2w';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

// --- 1. Login screen ---
await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
await page.screenshot({ path: `${OUTPUT_DIR}/screen_01_login.png` });
console.log('✅ 1. Login screenshot done');

// --- 2. Log in ---
const inputs = await page.$$('input');
if (inputs.length > 0) {
    await inputs[0].type('2026');
}
const buttons = await page.$$('button');
if (buttons.length > 0) {
    await buttons[0].click();
}
await new Promise(r => setTimeout(r, 3000));
await page.screenshot({ path: `${OUTPUT_DIR}/screen_02_algemeen.png` });
console.log('✅ 2. Algemene informatie screenshot done');

// --- Scroll through page and screenshot each section ---
const sections = [
    { scroll: 1000, file: 'screen_03_home_items.png', label: 'Home Items' },
    { scroll: 2000, file: 'screen_04_videos.png', label: 'Videoinstructies' },
    { scroll: 3000, file: 'screen_05_omgeving.png', label: 'Omgeving' },
    { scroll: 4000, file: 'screen_06_chatbot.png', label: 'Chatbot Kennisbank' },
    { scroll: 5000, file: 'screen_07_boekingen.png', label: 'Boekingen' },
];

for (const s of sections) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), s.scroll);
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: `${OUTPUT_DIR}/${s.file}` });
    console.log(`✅ ${s.label} screenshot done`);
}

await browser.close();
console.log('🎉 All screenshots saved to:', OUTPUT_DIR);

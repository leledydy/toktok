import puppeteer from 'puppeteer';
import axios from 'axios';
import cron from 'node-cron';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;

let lastVideoId = null;

async function checkTikTok() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/usr/bin/chromium' // required for Docker on Railway
    });

    const page = await browser.newPage();
    const url = `https://www.tiktok.com/@${TIKTOK_USERNAME}`;
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Optional: Take screenshot for debugging
    // await page.screenshot({ path: 'tiktok-profile.png', fullPage: true });

    // Wait for the first video link to be available
    await page.waitForSelector('a[href*="/video/"]', { timeout: 15000 });

    const videoUrl = await page.evaluate(() => {
      const anchor = document.querySelector('a[href*="/video/"]');
      return anchor ? anchor.href : null;
    });

    if (!videoUrl) {
      console.log('⚠️ No video links found on profile.');
      return;
    }

    const videoId = videoUrl.split('/video/')[1]?.split('?')[0];

    if (!videoId) {
      console.log('⚠️ Failed to extract video ID.');
      return;

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
      executablePath: '/usr/bin/chromium'
    });

    const page = await browser.newPage();

    // Mimic a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    const url = `https://www.tiktok.com/@${TIKTOK_USERNAME}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Scroll down to trigger video loading
    await page.evaluate(() => window.scrollBy(0, 1000));

    // Wait for lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to find a video link
    const videoUrl = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/video/"]'));
      return anchors.length > 0 ? anchors[0].href : null;
    });

    if (!videoUrl) {
      console.log('⚠️ Still no video links found on profile after scroll/wait.');
      return;
    }

    const videoId = videoUrl.split('/video/')[1]?.split('?')[0];
    if (!videoId) {
      console.log('⚠️ Failed to extract video ID.');
      return;
    }

    if (videoId !== lastVideoId) {
      lastVideoId = videoId;
      console.log('➡️ New TikTok:', videoUrl);

      await axios.post(DISCORD_WEBHOOK_URL, {
        content: `🎥 New TikTok by @${TIKTOK_USERNAME}:\n${videoUrl}`
      });
    } else {
      console.log('✔️ No new TikToks.');
    }
  } catch (err) {
    console.error('❌ Error fetching TikTok:', err.message);
  } finally {
    if (browser) await browser.close();
  }
}

cron.schedule('*/5 * * * *', checkTikTok);
checkTikTok();

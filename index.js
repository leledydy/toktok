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
      executablePath: '/usr/bin/chromium' // For Railway Docker support
    });

    const page = await browser.newPage();
    await page.goto(`https://www.tiktok.com/@${TIKTOK_USERNAME}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

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
    }

    if (videoId !== lastVideoId) {
      lastVideoId = videoId;
      console.log('➡️ New TikTok:', videoUrl);

      await axios.post(DISCORD_WEBHOOK_URL, {
        content: `🎥 New TikTok by @${TIKTOK_USERNAME}:\n${videoUrl}`,
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

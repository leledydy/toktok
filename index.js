import axios from 'axios';
import cron from 'node-cron';
import * as cheerio from 'cheerio';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;

let lastVideoId = null;

async function checkTikTok() {
  try {
    const profileUrl = `https://www.tiktok.com/@${TIKTOK_USERNAME}`;

    const { data: html } = await axios.get(profileUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Referer': 'https://www.google.com/',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = cheerio.load(html);
    const firstVideoLink = $('a[href*="/video/"]').attr('href');

    if (!firstVideoLink) {
      console.log('⚠️ No video links found on profile.');
      return;
    }

    const fullVideoUrl = `https://www.tiktok.com${firstVideoLink}`;
    const videoId = fullVideoUrl.split('/video/')[1]?.split('?')[0];

    if (!videoId) {
      console.log('⚠️ Failed to extract video ID.');
      return;
    }

    if (videoId !== lastVideoId) {
      lastVideoId = videoId;
      console.log('➡️ New TikTok:', fullVideoUrl);

      await axios.post(DISCORD_WEBHOOK_URL, {
        content: `🎥 New TikTok by @${TIKTOK_USERNAME}:\n${fullVideoUrl}`,
      });
    } else {
      console.log('✔️ No new TikToks.');
    }
  } catch (err) {
    console.error('❌ Error fetching TikTok:', err.message);
  }
}

cron.schedule('*/5 * * * *', checkTikTok);
checkTikTok();

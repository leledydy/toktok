import axios from 'axios';
import cron from 'node-cron';
import fs from 'fs';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR_ID = 'GdWCkxBtKWOsKjdch';

const LAST_ID_FILE = './last.txt';

// Load last video ID from file
let lastVideoId = fs.existsSync(LAST_ID_FILE)
  ? fs.readFileSync(LAST_ID_FILE, 'utf-8').trim()
  : null;

async function checkTikTok() {
  try {
    const now = Date.now();
    const response = await axios.post(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        profiles: [`https://www.tiktok.com/@${TIKTOK_USERNAME}`],
        maxVideos: 1,
        customId: `check-${now}`
      }
    );

    const video = response.data?.[0];
    if (!video) {
      console.log('⚠️ No videos returned from Apify.');
      return;
    }

    const videoId = video.id || video.itemId;
    const videoUrl = video.shareUrl || `https://www.tiktok.com/@${TIKTOK_USERNAME}/video/${videoId}`;

    console.log('🔍 Latest TikTok ID:', videoId);
    console.log('🧠 Last known ID:', lastVideoId);

    if (!videoId || !videoUrl) {
      console.log('⚠️ Missing video ID or URL.');
      return;
    }

    if (videoId !== lastVideoId) {
      lastVideoId = videoId;
      fs.writeFileSync(LAST_ID_FILE, videoId);
      console.log('➡️ New TikTok:', videoUrl);

      await axios.post(DISCORD_WEBHOOK_URL, {
        content: `🎥 New TikTok by @${TIKTOK_USERNAME}:\n${videoUrl}`
      });
    } else {
      console.log('✔️ No new TikToks.');
    }
  } catch (err) {
    console.error('❌ Apify error:', err.message);
  }
}

// Run once daily at 9:00 AM
cron.schedule('0 9 * * *', checkTikTok);

// Optional: run once immediately on startup
checkTikTok();

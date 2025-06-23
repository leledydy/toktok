import axios from 'axios';
import cron from 'node-cron';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR_ID = 'GdWCkxBtKWOsKjdch';

let lastVideoId = null;

async function checkTikTok() {
  try {
    // Start the actor run
    const startRun = await axios.post(
      `https://api.apify.com/v2/actor-tasks/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        username: TIKTOK_USERNAME,
        maxVideos: 1
      }
    );

    const video = startRun.data?.[0];
    if (!video) {
      console.log('⚠️ No videos returned from Apify.');
      return;
    }

    const videoId = video.id;
    const videoUrl = video.videoUrl;

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
    console.error('❌ Apify error:', err.message);
  }
}

cron.schedule('*/5 * * * *', checkTikTok);
checkTikTok();

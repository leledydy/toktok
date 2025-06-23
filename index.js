import axios from 'axios';
import cron from 'node-cron';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;

let lastVideoId = null;

async function checkTikTok() {
  try {
    const res = await axios.get(`https://www.tiktok.com/@${TIKTOK_USERNAME}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const matches = [...res.data.matchAll(/"id":"(\d{19,20})"/g)];
    const videoIds = matches.map(m => m[1]);

    if (!videoIds.length) {
      console.log("No video IDs found.");
      return;
    }

    const newestVideoId = videoIds[0];

    if (newestVideoId !== lastVideoId) {
      lastVideoId = newestVideoId;
      const videoUrl = `https://www.tiktok.com/@${TIKTOK_USERNAME}/video/${newestVideoId}`;
      console.log("New TikTok found:", videoUrl);

      await axios.post(DISCORD_WEBHOOK_URL, {
        content: `📢 New TikTok from @${TIKTOK_USERNAME}:\n${videoUrl}`
      });
    } else {
      console.log("No new video.");
    }

  } catch (err) {
    console.error("Error checking TikTok:", err.message);
  }
}

cron.schedule('*/5 * * * *', checkTikTok);
checkTikTok(); // run immediately on start

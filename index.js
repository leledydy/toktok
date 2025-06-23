import { getUserVideos } from 'tiktok-scraper';
import axios from 'axios';
import cron from 'node-cron';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;

let lastVideoId = null;

async function checkTikTok() {
  try {
    const posts = await getUserVideos(TIKTOK_USERNAME, { number: 1 });
    const video = posts.collector?.[0];
    if (!video) {
      console.log("⚠️ No TikToks found yet.");
      return;
    }

    const { id: videoId, webVideoUrl: videoUrl } = video;

    if (videoId !== lastVideoId) {
      lastVideoId = videoId;
      console.log("➡️ Found new TikTok:", videoUrl);
      await axios.post(DISCORD_WEBHOOK_URL, {
        content: `🎥 New TikTok by @${TIKTOK_USERNAME}:\n${videoUrl}`
      });
    } else {
      console.log("✔️ No new TikTok since last check.");
    }
  } catch (err) {
    console.error("❌ Error fetching TikTok:", err.message);
  }
}

cron.schedule("*/5 * * * *", checkTikTok);
checkTikTok();

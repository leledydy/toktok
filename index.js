import axios from 'axios';
import cron from 'node-cron';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;

let lastVideoId = null;

async function checkTikTok() {
  try {
    const url = `https://m.tiktok.com/api/post/item_list/?username=${TIKTOK_USERNAME}&count=1`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      },
    });

    const video = data?.itemList?.[0];
    if (!video) {
      console.log("⚠️ No TikTok videos found.");
      return;
    }

    const videoId = video.id || video.id_str || video.item_id;
    const videoUrl = `https://www.tiktok.com/@${TIKTOK_USERNAME}/video/${videoId}`;

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
  }
}

// Run every 5 minutes
cron.schedule('*/5 * * * *', checkTikTok);

// Run once on startup
checkTikTok();

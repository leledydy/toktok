import axios from 'axios';
import cron from 'node-cron';
import * as cheerio from 'cheerio'; // ✅ CORRECT

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;

let lastVideoId = null;

async function checkTikTok() {
  try {
    const url = `https://www.tiktok.com/@${TIKTOK_USERNAME}`;
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const $ = cheerio.load(html);
    const scriptTag = $('script#__NEXT_DATA__').html();
    if (!scriptTag) {
      console.log('⚠️ Unable to find TikTok data.');
      return;
    }

    const json = JSON.parse(scriptTag);
    const videos = json.props?.pageProps?.items || [];
    if (!videos.length) {
      console.log('⚠️ No TikTok videos found.');
      return;
    }

    const video = videos[0];
    const videoId = video.id;
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

cron.schedule('*/5 * * * *', checkTikTok);
checkTikTok();

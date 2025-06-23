import axios from 'axios';
import cron from 'node-cron';
import pg from 'pg';

const { Client } = pg;

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR_ID = 'GdWCkxBtKWOsKjdch';
const DATABASE_URL = process.env.DATABASE_URL;

const db = new Client({ connectionString: DATABASE_URL });

async function initDatabase() {
  await db.connect();
  await db.query(`
    CREATE TABLE IF NOT EXISTS last_tiktok (
      username TEXT PRIMARY KEY,
      video_id TEXT
    )
  `);
}

async function getLastVideoId(username) {
  const result = await db.query(
    'SELECT video_id FROM last_tiktok WHERE username = $1',
    [username]
  );
  return result.rows[0]?.video_id || null;
}

async function setLastVideoId(username, videoId) {
  await db.query(
    `INSERT INTO last_tiktok (username, video_id)
     VALUES ($1, $2)
     ON CONFLICT (username)
     DO UPDATE SET video_id = EXCLUDED.video_id`,
    [username, videoId]
  );
}

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
    const lastVideoId = await getLastVideoId(TIKTOK_USERNAME);

    console.log('🔍 Latest TikTok ID:', videoId);
    console.log('🧠 Last stored TikTok ID:', lastVideoId);

    if (!videoId || !videoUrl) {
      console.log('⚠️ Missing video ID or URL.');
      return;
    }

    if (videoId !== lastVideoId) {
      await setLastVideoId(TIKTOK_USERNAME, videoId);
      console.log('➡️ New TikTok:', videoUrl);

      await axios.post(DISCORD_WEBHOOK_URL, {
        content: `🎥 New TikTok by @${TIKTOK_USERNAME}:\n${videoUrl}`
      });
    } else {
      console.log('✔️ No new TikToks.');
    }
  } catch (err) {
    console.error('❌ Apify or DB error:', err.message);
  }
}

// Run once daily at 9:00 AM
cron.schedule('0 9 * * *', checkTikTok);

// Connect DB and run once on startup
initDatabase().then(() => checkTikTok());

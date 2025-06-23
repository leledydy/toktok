import axios from 'axios';
import cron from 'node-cron';
import pg from 'pg';

const { Client } = pg;

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR_ID = 'GdWCkxBtKWOsKjdch';
const DATABASE_URL = process.env.DATABASE_URL;

const ACCOUNTS = [
  {
    username: process.env.TIKTOK_USERNAME_1,
    webhook: process.env.DISCORD_WEBHOOK_URL_1
  },
  {
    username: process.env.TIKTOK_USERNAME_2,
    webhook: process.env.DISCORD_WEBHOOK_URL_2
  }
];

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

async function checkTikTokForAccount({ username, webhook }) {
  try {
    const now = Date.now();
    const response = await axios.post(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        profiles: [`https://www.tiktok.com/@${username}`],
        maxVideos: 1,
        customId: `check-${username}-${now}`
      }
    );

    const video = response.data?.[0];
    if (!video) {
      console.log(`⚠️ No videos found for @${username}`);
      return;
    }

    const videoId = video.id || video.itemId;
    const videoUrl = video.shareUrl || `https://www.tiktok.com/@${username}/video/${videoId}`;
    const lastVideoId = await getLastVideoId(username);

    if (!videoId || !videoUrl) {
      console.log(`⚠️ Missing video ID or URL for @${username}`);
      return;
    }

    if (videoId !== lastVideoId) {
      await setLastVideoId(username, videoId);
      console.log(`➡️ New TikTok from @${username}: ${videoUrl}`);

      await axios.post(webhook, {
        content: `🎥 New TikTok by @${username}:\n${videoUrl}`
      });
    } else {
      console.log(`✔️ No new TikToks for @${username}`);
    }
  } catch (err) {
    console.error(`❌ Error checking @${username}:`, err.message);
  }
}

async function checkAllAccounts() {
  for (const account of ACCOUNTS) {
    await checkTikTokForAccount(account);
  }
}

// Schedule: run every day at 9:00 AM
cron.schedule('0 9 * * *', checkAllAccounts);

// On startup
initDatabase()
  .then(() => checkAllAccounts())
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

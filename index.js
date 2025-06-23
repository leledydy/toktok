import axios from 'axios';
import cron from 'node-cron';
import pg from 'pg';

const { Client } = pg;

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_TASK_ID = process.env.APIFY_TASK_ID;
const DATABASE_URL = process.env.DATABASE_URL;

const USER_WEBHOOK_MAP = {
  [process.env.TIKTOK_USERNAME_1]: process.env.DISCORD_WEBHOOK_URL_1,
  [process.env.TIKTOK_USERNAME_2]: process.env.DISCORD_WEBHOOK_URL_2
};

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

async function checkAllAccounts() {
  try {
    const response = await axios.post(
      `https://api.apify.com/v2/actor-tasks/${APIFY_TASK_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`
    );

    const videos = response.data;
    if (!Array.isArray(videos) || videos.length === 0) {
      console.log('⚠️ No videos returned from Apify task.');
      return;
    }

    for (const video of videos) {
      const username = video.authorMeta?.name || video.authorName;
      const videoId = video.id || video.itemId;
      const videoUrl = video.shareUrl || `https://www.tiktok.com/@${username}/video/${videoId}`;
      const webhook = USER_WEBHOOK_MAP[username];

      if (!username || !videoId || !videoUrl) {
        console.log('⚠️ Skipping invalid video data.');
        continue;
      }

      if (!webhook) {
        console.log(`⚠️ No webhook configured for @${username}`);
        continue;
      }

      const lastVideoId = await getLastVideoId(username);

      if (videoId !== lastVideoId) {
        await setLastVideoId(username, videoId);
        console.log(`➡️ New TikTok from @${username}: ${videoUrl}`);

        await axios.post(webhook, {
          content: `🎥 New TikTok by @${username}:\n${videoUrl}`
        });
      } else {
        console.log(`✔️ No new TikToks for @${username}`);
      }
    }
  } catch (err) {
    console.error('❌ Apify task error:', err.message);
  }
}

// ✅ Every 12 hours at 00:00 and 12:00
cron.schedule('0 */12 * * *', checkAllAccounts);

// ✅ Run immediately on container start
initDatabase()
  .then(() => checkAllAccounts())
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

# TikTok → Discord Auto-Poster

This bot checks your TikTok account every 5 minutes and posts new videos to a Discord channel.

## Setup

1. Fork this repo.
2. On Railway, connect your fork and deploy.
3. Add environment variables:
   - `TIKTOK_USERNAME` — your TikTok handle (no `@`)
   - `DISCORD_WEBHOOK_URL` — your Discord channel webhook URL
4. Deploy and watch your Discord channel for new TikToks!

## 📌 Notes

- Uses unofficial `tiktok-scraper` + Discord webhook
- No DB needed — `lastVideoId` resets if the bot restarts, and new videos may re-post once.
- You can add persistence later using PostgreSQL on Railway.


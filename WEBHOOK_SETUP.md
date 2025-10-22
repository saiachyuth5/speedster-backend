# Strava Webhook Setup Guide

## Overview
This guide will help you set up Strava webhooks for real-time activity syncing. Instead of polling for new activities, Strava will notify your server instantly when users create, update, or delete activities.

## Prerequisites
- ✅ Strava API application created
- ✅ Backend server running
- ✅ Public URL (ngrok for local development)

## Step 1: Expose Your Local Server (Development)

Since Strava webhooks require a publicly accessible URL, use **ngrok** for local development:

### Install ngrok
```bash
# Download from https://ngrok.com/download
# Or install via package manager
choco install ngrok  # Windows
brew install ngrok   # macOS
```

### Start ngrok
```bash
ngrok http 3001
```

You'll get a public URL like: `https://abc123.ngrok.io`

## Step 2: Configure Environment Variables

Already done! Check your `.env` file:

```env
STRAVA_WEBHOOK_VERIFY_TOKEN=speedster_webhook_secret_2025
```

## Step 3: Register Webhook with Strava

### Option A: Using the Info Endpoint

1. Start your backend server
2. Visit: http://localhost:3001/webhook/strava/info
3. Copy the curl command provided
4. Replace `YOUR_DOMAIN` with your ngrok URL

### Option B: Manual Registration

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F 'callback_url=https://YOUR_NGROK_URL.ngrok.io/webhook/strava' \
  -F 'verify_token=speedster_webhook_secret_2025'
```

**Important:** Replace `YOUR_NGROK_URL` with your actual ngrok URL!

### Expected Response
```json
{
  "id": 12345,
  "resource_state": 2,
  "application_id": 180190,
  "callback_url": "https://YOUR_NGROK_URL.ngrok.io/webhook/strava",
  "created_at": "2025-10-21T...",
  "updated_at": "2025-10-21T..."
}
```

## Step 4: Verify Webhook is Active

### Check Current Subscriptions
```bash
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=180190 \
  -d client_secret=7060ca4b3a8d1250d0dde8dd649b92d5e6998be6
```

### Test the Webhook
1. Go to Strava and create a new running activity
2. Check your backend console logs
3. You should see: `🔔 Webhook event received`
4. The activity should appear in your database automatically!

## Step 5: Delete Webhook (if needed)

```bash
curl -X DELETE https://www.strava.com/api/v3/push_subscriptions/SUBSCRIPTION_ID \
  -F client_id=180190 \
  -F client_secret=7060ca4b3a8d1250d0dde8dd649b92d5e6998be6
```

## How It Works

### 1. Webhook Verification (GET)
When you register the webhook, Strava sends a GET request to verify your endpoint:
- Receives: `hub.mode`, `hub.verify_token`, `hub.challenge`
- Returns: `hub.challenge` if token matches

### 2. Event Processing (POST)
When an activity is created/updated/deleted, Strava sends:
```json
{
  "object_type": "activity",
  "object_id": 12345678,
  "aspect_type": "create",
  "owner_id": 180892540,
  "subscription_id": 12345,
  "event_time": 1234567890
}
```

### 3. Activity Sync
Backend automatically:
- ✅ Validates the event
- ✅ Fetches full activity details from Strava
- ✅ Filters for running activities only
- ✅ Saves to database with cadence (if available)
- ✅ Handles updates and deletions

## Supported Events

| Event Type | Action |
|------------|--------|
| `create` | Fetch activity details and save to database |
| `update` | Fetch updated details and update database |
| `delete` | Remove activity from database |

## Logging

Watch your backend console for webhook events:
- 🔔 Webhook event received
- 📥 New activity created
- 🔄 Activity updated
- 🗑️ Activity deleted
- ✅ Successfully saved/updated/deleted
- ❌ Errors (with details)

## Production Deployment

For production, you'll need:
1. A publicly accessible domain (not ngrok)
2. HTTPS enabled (required by Strava)
3. Update the webhook callback URL to your production domain
4. Re-register the webhook with production URL

## Troubleshooting

### Webhook not receiving events
- ✅ Check ngrok is running
- ✅ Verify callback URL is correct
- ✅ Check backend server is running
- ✅ Test the endpoint: `curl https://your-url.ngrok.io/webhook/strava/info`

### Verification failed
- ✅ Check `STRAVA_WEBHOOK_VERIFY_TOKEN` in .env
- ✅ Ensure token matches what you used during registration
- ✅ Restart backend after changing .env

### Activities not syncing
- ✅ Check backend console for errors
- ✅ Verify user has valid Strava token
- ✅ Confirm activity is a running activity (other types are ignored)
- ✅ Check Strava athlete ID matches user profile

## Rate Limits

Strava webhooks don't count against your API rate limits! This is a huge advantage over polling.

## Security Notes

- Webhook verify token should be kept secret
- Consider adding IP allowlist for Strava's webhook servers
- Always validate event data before processing
- Use HTTPS in production (required)

## Resources

- [Strava Webhook Documentation](https://developers.strava.com/docs/webhooks/)
- [Strava API Settings](https://www.strava.com/settings/api)
- [ngrok Documentation](https://ngrok.com/docs)

# fordaboys

Hourly photo challenge app for the boys. Every hour, on the hour — snap a photo and send it.

## Deploy

### 1. Supabase (database + file storage)

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/migrations/001_initial.sql` in the SQL Editor
3. Create a Storage bucket called `photos` (set it to **public**)
4. Add these Storage policies in the `photos` bucket:
   - **Allow public uploads**: `INSERT` for `anon` role, check `bucket_id = 'photos'`
   - **Allow public reads**: `SELECT` for `anon` role, using `bucket_id = 'photos'`
5. Copy your project URL and keys from Settings > API

### 2. VAPID Keys (for push notifications)

```bash
npx web-push generate-vapid-keys
```

### 3. Netlify (hosting + serverless functions)

1. Connect this GitHub repo to a new Netlify site
2. Set environment variables in Netlify dashboard (Site settings > Environment variables):

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Your anon/public key |
| `VAPID_PUBLIC_KEY` | From step 2 |
| `VAPID_PRIVATE_KEY` | From step 2 |
| `VAPID_EMAIL` | `mailto:you@example.com` |

3. Deploy — Netlify auto-builds on push to `main`

### 4. Share with the boys

Drop the Netlify URL in your WhatsApp group. Everyone opens it, adds to home screen, and enables notifications.

## Local Development

```bash
# Install everything
npm run install:all

# Create a .env file from the example
cp .env.example .env
# Fill in your Supabase + VAPID values

# Run with Netlify Dev (serves frontend + functions locally)
npm run dev
```

## Architecture

Designed for easy migration to React Native:

```
client/              → React (Vite) PWA — swap for React Native later
netlify/functions/   → Serverless API (Express via serverless-http)
  api.mjs            → All REST endpoints (auth, photos, reactions, scoreboard)
  hourly-ping.mjs    → Scheduled function — sends push notifications every hour
supabase/            → Database schema migrations
```

The API is cleanly separated — a future native app just calls the same endpoints.

## Tech Stack

- **Frontend**: React + Vite (PWA, installable on iOS & Android)
- **Backend**: Netlify Functions (serverless Express)
- **Database**: Supabase (Postgres)
- **File Storage**: Supabase Storage
- **Notifications**: Web Push API + Netlify Scheduled Functions

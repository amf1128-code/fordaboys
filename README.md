# fordaboys

Hourly photo challenge app for the boys. Every hour, on the hour — snap a photo and send it.

## Quick Start

```bash
# Install everything
npm run install:all

# Run in development (server + client)
npm run dev

# Or run separately
npm run dev:server   # Express API on :3001
npm run dev:client   # Vite dev server on :5173
```

## Production

```bash
npm run build        # Build the React frontend
npm start            # Serve everything from Express on :3001
```

## How It Works

1. Open the app and create a profile (you get a unique join code)
2. Share the app link in your WhatsApp group
3. Everyone joins and enables notifications
4. Every hour on the hour, you get a push notification
5. Take a photo and send it before the next hour
6. Build streaks, react to each other's photos, flex on the scoreboard

## Architecture

Designed for easy migration to React Native:

- **`server/`** — Express REST API + SQLite + web-push notifications
- **`client/`** — React (Vite) PWA, installable on iOS & Android home screens
- Clean API separation — a native app just swaps the frontend

## Tech Stack

- React + Vite (frontend)
- Express + SQLite (backend)
- Web Push API (notifications)
- PWA (installable, works offline)

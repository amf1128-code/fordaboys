const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const webPush = require('web-push');
const { initDb } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Database ---
const db = initDb();

// --- VAPID keys (generate once, store in env for production) ---
let vapidKeys;
const fs = require('fs');
const VAPID_PATH = path.join(__dirname, 'db', 'vapid.json');
if (fs.existsSync(VAPID_PATH)) {
  vapidKeys = JSON.parse(fs.readFileSync(VAPID_PATH, 'utf8'));
} else {
  vapidKeys = webPush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_PATH, JSON.stringify(vapidKeys, null, 2));
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Routes ---
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/photos', require('./routes/photos')(db));
app.use('/api/notifications', require('./routes/notifications')(db, vapidKeys));

// --- Serve frontend in production ---
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// --- Hourly push notification cron (every hour on the minute) ---
cron.schedule('0 * * * *', () => {
  console.log(`[${new Date().toISOString()}] Sending hourly photo challenge ping...`);

  const users = db.prepare('SELECT * FROM users WHERE push_subscription IS NOT NULL').all();

  const payload = JSON.stringify({
    title: "IT'S GO TIME",
    body: 'New hour, new photo. Send it for the boys.',
    icon: '/icon-192.png',
    tag: 'hourly-challenge',
  });

  for (const user of users) {
    try {
      const sub = JSON.parse(user.push_subscription);
      webPush.sendNotification(sub, payload).catch((err) => {
        if (err.statusCode === 410) {
          // Subscription expired, remove it
          db.prepare('UPDATE users SET push_subscription = NULL WHERE id = ?').run(user.id);
        }
        console.error(`Push failed for ${user.name}:`, err.message);
      });
    } catch (err) {
      console.error(`Invalid subscription for ${user.name}`);
    }
  }
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`fordaboys server running on http://localhost:${PORT}`);
});

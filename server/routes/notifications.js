const express = require('express');
const webPush = require('web-push');
const router = express.Router();

module.exports = function (db, vapidKeys) {
  webPush.setVapidDetails(
    'mailto:fordaboys@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  // Save push subscription for a user
  router.post('/subscribe', (req, res) => {
    const { userId, subscription } = req.body;
    if (!userId || !subscription) {
      return res.status(400).json({ error: 'userId and subscription required' });
    }

    db.prepare('UPDATE users SET push_subscription = ? WHERE id = ?').run(
      JSON.stringify(subscription),
      userId
    );

    res.json({ success: true });
  });

  // Unsubscribe
  router.post('/unsubscribe', (req, res) => {
    const { userId } = req.body;
    db.prepare('UPDATE users SET push_subscription = NULL WHERE id = ?').run(userId);
    res.json({ success: true });
  });

  // Get VAPID public key (client needs this to subscribe)
  router.get('/vapid-public-key', (_req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  return router;
};

const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

module.exports = function (db) {
  // Upload a photo for the current challenge hour
  router.post('/', upload.single('photo'), (req, res) => {
    const { userId, caption } = req.body;
    if (!userId || !req.file) {
      return res.status(400).json({ error: 'userId and photo are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const challengeHour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}`;

    // Check if user already submitted for this hour
    const existing = db.prepare(
      'SELECT id FROM photos WHERE user_id = ? AND challenge_hour = ?'
    ).get(userId, challengeHour);

    if (existing) {
      return res.status(409).json({ error: 'You already submitted a photo this hour' });
    }

    const id = uuidv4();
    db.prepare(
      'INSERT INTO photos (id, user_id, filename, caption, challenge_hour) VALUES (?, ?, ?, ?, ?)'
    ).run(id, userId, req.file.filename, caption || null, challengeHour);

    const photo = db.prepare(`
      SELECT p.*, u.name as user_name, u.avatar_color
      FROM photos p JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);

    res.json({ photo: formatPhoto(photo) });
  });

  // Get feed — photos grouped by challenge hour, newest first
  router.get('/feed', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const photos = db.prepare(`
      SELECT p.*, u.name as user_name, u.avatar_color
      FROM photos p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.challenge_hour DESC, p.created_at ASC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    // Get reactions for these photos
    const photoIds = photos.map((p) => p.id);
    const reactions = photoIds.length > 0
      ? db.prepare(`
          SELECT r.*, u.name as user_name
          FROM reactions r
          JOIN users u ON r.user_id = u.id
          WHERE r.photo_id IN (${photoIds.map(() => '?').join(',')})
        `).all(...photoIds)
      : [];

    const reactionsByPhoto = {};
    for (const r of reactions) {
      if (!reactionsByPhoto[r.photo_id]) reactionsByPhoto[r.photo_id] = [];
      reactionsByPhoto[r.photo_id].push({
        id: r.id,
        emoji: r.emoji,
        userId: r.user_id,
        userName: r.user_name,
      });
    }

    const formatted = photos.map((p) => ({
      ...formatPhoto(p),
      reactions: reactionsByPhoto[p.id] || [],
    }));

    // Group by challenge hour
    const grouped = {};
    for (const photo of formatted) {
      if (!grouped[photo.challengeHour]) grouped[photo.challengeHour] = [];
      grouped[photo.challengeHour].push(photo);
    }

    res.json({ feed: grouped });
  });

  // React to a photo
  router.post('/:photoId/react', (req, res) => {
    const { userId, emoji } = req.body;
    const { photoId } = req.params;

    if (!userId || !emoji) {
      return res.status(400).json({ error: 'userId and emoji are required' });
    }

    const id = uuidv4();
    try {
      db.prepare(
        'INSERT INTO reactions (id, photo_id, user_id, emoji) VALUES (?, ?, ?, ?)'
      ).run(id, photoId, userId, emoji);
    } catch (err) {
      // Already reacted with this emoji — remove it (toggle)
      db.prepare(
        'DELETE FROM reactions WHERE photo_id = ? AND user_id = ? AND emoji = ?'
      ).run(photoId, userId, emoji);
    }

    const reactions = db.prepare(`
      SELECT r.*, u.name as user_name
      FROM reactions r JOIN users u ON r.user_id = u.id
      WHERE r.photo_id = ?
    `).all(photoId);

    res.json({
      reactions: reactions.map((r) => ({
        id: r.id,
        emoji: r.emoji,
        userId: r.user_id,
        userName: r.user_name,
      })),
    });
  });

  // Streak / scoreboard
  router.get('/scoreboard', (_req, res) => {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at').all();
    const scoreboard = users.map((user) => {
      const totalPhotos = db.prepare(
        'SELECT COUNT(*) as count FROM photos WHERE user_id = ?'
      ).get(user.id).count;

      // Calculate current streak (consecutive hours with a photo, going backwards)
      const recentHours = db.prepare(`
        SELECT DISTINCT challenge_hour FROM photos
        WHERE user_id = ?
        ORDER BY challenge_hour DESC
        LIMIT 168
      `).all(user.id).map((r) => r.challenge_hour);

      let streak = 0;
      const now = new Date();
      const currentHour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}`;

      // Check backwards from current hour
      const hourSet = new Set(recentHours);
      let checkDate = new Date(now);
      checkDate.setMinutes(0, 0, 0);

      // Allow current hour to not be posted yet
      if (!hourSet.has(currentHour)) {
        checkDate.setHours(checkDate.getHours() - 1);
      }

      for (let i = 0; i < 168; i++) {
        const hourStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}T${String(checkDate.getHours()).padStart(2, '0')}`;
        if (hourSet.has(hourStr)) {
          streak++;
          checkDate.setHours(checkDate.getHours() - 1);
        } else {
          break;
        }
      }

      return {
        id: user.id,
        name: user.name,
        avatarColor: user.avatar_color,
        totalPhotos,
        streak,
      };
    });

    scoreboard.sort((a, b) => b.streak - a.streak || b.totalPhotos - a.totalPhotos);
    res.json({ scoreboard });
  });

  return router;
};

function formatPhoto(p) {
  return {
    id: p.id,
    userId: p.user_id,
    userName: p.user_name,
    avatarColor: p.avatar_color,
    filename: p.filename,
    caption: p.caption,
    challengeHour: p.challenge_hour,
    createdAt: p.created_at,
  };
}

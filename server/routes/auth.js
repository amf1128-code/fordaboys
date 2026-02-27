const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const AVATAR_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'
];

module.exports = function (db) {
  // Register / join
  router.post('/join', (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    const joinCode = uuidv4().slice(0, 8).toUpperCase();
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    db.prepare(
      'INSERT INTO users (id, name, avatar_color, join_code) VALUES (?, ?, ?, ?)'
    ).run(id, name.trim(), color, joinCode);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ user: sanitizeUser(user) });
  });

  // Login with join code
  router.post('/login', (req, res) => {
    const { joinCode } = req.body;
    if (!joinCode) {
      return res.status(400).json({ error: 'Join code is required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE join_code = ?').get(
      joinCode.trim().toUpperCase()
    );

    if (!user) {
      return res.status(404).json({ error: 'Invalid join code' });
    }

    res.json({ user: sanitizeUser(user) });
  });

  // Get all users (for scoreboard)
  router.get('/users', (_req, res) => {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at').all();
    res.json({ users: users.map(sanitizeUser) });
  });

  return router;
};

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    avatarColor: user.avatar_color,
    joinCode: user.join_code,
    createdAt: user.created_at,
  };
}

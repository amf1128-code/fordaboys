import express from 'express';
import serverless from 'serverless-http';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';
import { v4 as uuidv4 } from 'uuid';

// --- Supabase ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Express app ---
const app = express();
app.use(express.json());

const AVATAR_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
];

// ========== AUTH ==========

app.post('/api/auth/join', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (name.trim().length > 30) {
    return res.status(400).json({ error: 'Name must be 30 characters or less' });
  }

  const joinCode = uuidv4().slice(0, 8).toUpperCase();
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const { data, error } = await supabase
    .from('users')
    .insert({ name: name.trim(), avatar_color: color, join_code: joinCode })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: formatUser(data) });
});

app.post('/api/auth/login', async (req, res) => {
  const { joinCode } = req.body;
  if (!joinCode) return res.status(400).json({ error: 'Join code is required' });

  const { data, error } = await supabase
    .from('users')
    .select()
    .eq('join_code', joinCode.trim().toUpperCase())
    .single();

  if (error || !data) return res.status(404).json({ error: 'Invalid join code' });
  res.json({ user: formatUser(data) });
});

app.get('/api/auth/users', async (_req, res) => {
  const { data } = await supabase.from('users').select().order('created_at');
  res.json({ users: (data || []).map(formatUserPublic) });
});

app.delete('/api/auth/account/:userId', async (req, res) => {
  const { userId } = req.params;
  const { joinCode } = req.body || {};

  // Verify the requester owns this account
  const { data: owner } = await supabase
    .from('users')
    .select('join_code')
    .eq('id', userId)
    .single();

  if (!owner || !joinCode || owner.join_code !== joinCode.trim().toUpperCase()) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Delete reactions by this user
  await supabase.from('reactions').delete().eq('user_id', userId);

  // Get user's photos to delete from storage
  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_path')
    .eq('user_id', userId);

  if (photos && photos.length > 0) {
    // Delete reactions on this user's photos
    const photoIds = photos.map((p) => p.id);
    await supabase.from('reactions').delete().in('photo_id', photoIds);

    // Delete photos from storage
    const paths = photos.map((p) => p.storage_path);
    await supabase.storage.from('photos').remove(paths);

    // Delete photo records
    await supabase.from('photos').delete().eq('user_id', userId);
  }

  // Delete user
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// ========== PHOTOS ==========

app.post('/api/photos', async (req, res) => {
  const { userId, storagePath, caption } = req.body;
  if (!userId || !storagePath) {
    return res.status(400).json({ error: 'userId and storagePath are required' });
  }
  if (caption && caption.length > 200) {
    return res.status(400).json({ error: 'Caption must be 200 characters or less' });
  }

  const { data: user } = await supabase.from('users').select().eq('id', userId).single();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const now = new Date();
  const challengeHour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}`;

  // Check if already submitted this hour
  const { data: existing } = await supabase
    .from('photos')
    .select('id')
    .eq('user_id', userId)
    .eq('challenge_hour', challengeHour)
    .single();

  if (existing) {
    return res.status(409).json({ error: 'You already submitted a photo this hour' });
  }

  const { data: photo, error } = await supabase
    .from('photos')
    .insert({
      user_id: userId,
      storage_path: storagePath,
      caption: caption || null,
      challenge_hour: challengeHour,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    photo: {
      ...formatPhoto(photo),
      userName: user.name,
      avatarColor: user.avatar_color,
    },
  });
});

app.get('/api/photos/feed', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const { data: photos } = await supabase
    .from('photos')
    .select('*, users(name, avatar_color)')
    .order('challenge_hour', { ascending: false })
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (!photos || photos.length === 0) {
    return res.json({ feed: {} });
  }

  const photoIds = photos.map((p) => p.id);
  const { data: reactions } = await supabase
    .from('reactions')
    .select('*, users(name)')
    .in('photo_id', photoIds);

  const reactionsByPhoto = {};
  for (const r of reactions || []) {
    if (!reactionsByPhoto[r.photo_id]) reactionsByPhoto[r.photo_id] = [];
    reactionsByPhoto[r.photo_id].push({
      id: r.id,
      emoji: r.emoji,
      userId: r.user_id,
      userName: r.users?.name,
    });
  }

  // Build public URLs and group by hour
  const grouped = {};
  for (const p of photos) {
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(p.storage_path);

    const formatted = {
      id: p.id,
      userId: p.user_id,
      userName: p.users?.name,
      avatarColor: p.users?.avatar_color,
      photoUrl: urlData?.publicUrl,
      caption: p.caption,
      challengeHour: p.challenge_hour,
      createdAt: p.created_at,
      reactions: reactionsByPhoto[p.id] || [],
    };

    if (!grouped[p.challenge_hour]) grouped[p.challenge_hour] = [];
    grouped[p.challenge_hour].push(formatted);
  }

  res.json({ feed: grouped });
});

app.post('/api/photos/:photoId/react', async (req, res) => {
  const { userId, emoji } = req.body;
  const { photoId } = req.params;
  if (!userId || !emoji) {
    return res.status(400).json({ error: 'userId and emoji are required' });
  }
  if (emoji.length > 8) {
    return res.status(400).json({ error: 'Invalid emoji' });
  }

  // Try insert, if duplicate constraint → delete (toggle)
  const { error } = await supabase
    .from('reactions')
    .insert({ photo_id: photoId, user_id: userId, emoji });

  if (error && error.code === '23505') {
    await supabase
      .from('reactions')
      .delete()
      .eq('photo_id', photoId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
  }

  const { data: reactions } = await supabase
    .from('reactions')
    .select('*, users(name)')
    .eq('photo_id', photoId);

  res.json({
    reactions: (reactions || []).map((r) => ({
      id: r.id,
      emoji: r.emoji,
      userId: r.user_id,
      userName: r.users?.name,
    })),
  });
});

app.get('/api/photos/scoreboard', async (_req, res) => {
  const { data: users } = await supabase.from('users').select().order('created_at');
  if (!users) return res.json({ scoreboard: [] });

  const scoreboard = [];

  for (const user of users) {
    const { count } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: recentHours } = await supabase
      .from('photos')
      .select('challenge_hour')
      .eq('user_id', user.id)
      .order('challenge_hour', { ascending: false })
      .limit(168);

    // Calculate streak
    let streak = 0;
    const now = new Date();
    const currentHour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}`;
    const hourSet = new Set((recentHours || []).map((r) => r.challenge_hour));

    const checkDate = new Date(now);
    checkDate.setMinutes(0, 0, 0);
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

    scoreboard.push({
      id: user.id,
      name: user.name,
      avatarColor: user.avatar_color,
      totalPhotos: count || 0,
      streak,
    });
  }

  scoreboard.sort((a, b) => b.streak - a.streak || b.totalPhotos - a.totalPhotos);
  res.json({ scoreboard });
});

// ========== NOTIFICATIONS ==========

app.get('/api/notifications/vapid-public-key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post('/api/notifications/subscribe', async (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription) {
    return res.status(400).json({ error: 'userId and subscription required' });
  }

  // First verify the user exists
  const { data: user, error: lookupError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (lookupError || !user) {
    console.error('Subscribe: user lookup failed', { userId, error: lookupError?.message });
    return res.status(404).json({ error: `User not found for id: ${userId}` });
  }

  const { data: updated, error } = await supabase
    .from('users')
    .update({ push_subscription: subscription })
    .eq('id', userId)
    .select('id, push_subscription')
    .single();

  if (error) {
    console.error('Failed to save push subscription:', error.message);
    return res.status(500).json({ error: 'Failed to save subscription: ' + error.message });
  }

  if (!updated?.push_subscription) {
    console.error('Subscribe: update returned but push_subscription is null', { updated });
    return res.status(500).json({ error: 'Subscription was not saved. The update ran but the value is still null.' });
  }

  res.json({ success: true });
});

app.post('/api/notifications/unsubscribe', async (req, res) => {
  const { userId } = req.body;
  await supabase
    .from('users')
    .update({ push_subscription: null })
    .eq('id', userId);

  res.json({ success: true });
});

// Send push to all subscribed users (same logic as hourly-ping scheduled function)
app.post('/api/notifications/send-hourly', async (_req, res) => {
  webPush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:fordaboys@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { data: users } = await supabase
    .from('users')
    .select('id, name, push_subscription')
    .not('push_subscription', 'is', null);

  if (!users || users.length === 0) {
    return res.json({ sent: 0, message: 'No users with push subscriptions' });
  }

  const payload = JSON.stringify({
    title: "IT'S GO TIME",
    body: 'New hour, new photo. Send it for the boys.',
    icon: '/icon-192.png',
    tag: 'hourly-challenge',
  });

  let sent = 0;
  let expired = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await webPush.sendNotification(user.push_subscription, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from('users')
          .update({ push_subscription: null })
          .eq('id', user.id);
        expired++;
      } else {
        console.error(`Push failed for ${user.name}:`, err.message);
        failed++;
      }
    }
  }

  res.json({ sent, expired, failed });
});

// ========== Helpers ==========

function formatUser(u) {
  return {
    id: u.id,
    name: u.name,
    avatarColor: u.avatar_color,
    joinCode: u.join_code,
    createdAt: u.created_at,
  };
}

function formatUserPublic(u) {
  return {
    id: u.id,
    name: u.name,
    avatarColor: u.avatar_color,
    createdAt: u.created_at,
  };
}

function formatPhoto(p) {
  return {
    id: p.id,
    userId: p.user_id,
    storagePath: p.storage_path,
    caption: p.caption,
    challengeHour: p.challenge_hour,
    createdAt: p.created_at,
  };
}

// ========== Export ==========

export const handler = serverless(app);

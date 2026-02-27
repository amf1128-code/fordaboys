const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Auth
export const join = (name) => request('/auth/join', { method: 'POST', body: JSON.stringify({ name }) });
export const login = (joinCode) => request('/auth/login', { method: 'POST', body: JSON.stringify({ joinCode }) });
export const getUsers = () => request('/auth/users');

// Photos
export const uploadPhoto = (userId, file, caption) => {
  const form = new FormData();
  form.append('userId', userId);
  form.append('photo', file);
  if (caption) form.append('caption', caption);
  return fetch(`${BASE}/photos`, { method: 'POST', body: form }).then((r) => r.json());
};

export const getFeed = (limit = 50, offset = 0) =>
  request(`/photos/feed?limit=${limit}&offset=${offset}`);

export const reactToPhoto = (photoId, userId, emoji) =>
  request(`/photos/${photoId}/react`, { method: 'POST', body: JSON.stringify({ userId, emoji }) });

export const getScoreboard = () => request('/photos/scoreboard');

// Notifications
export const getVapidKey = () => request('/notifications/vapid-public-key');
export const subscribePush = (userId, subscription) =>
  request('/notifications/subscribe', { method: 'POST', body: JSON.stringify({ userId, subscription }) });
export const unsubscribePush = (userId) =>
  request('/notifications/unsubscribe', { method: 'POST', body: JSON.stringify({ userId }) });

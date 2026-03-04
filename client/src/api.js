import { supabase } from './lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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
export const join = (name) =>
  request('/auth/join', { method: 'POST', body: JSON.stringify({ name }) });
export const login = (joinCode) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ joinCode }) });
export const getUsers = () => request('/auth/users');
export const deleteAccount = (userId, joinCode) =>
  request(`/auth/account/${userId}`, {
    method: 'DELETE',
    body: JSON.stringify({ joinCode }),
  });

// Photos — upload file directly to Supabase Storage, then save metadata via API
export const uploadPhoto = async (userId, file, caption) => {
  const ext = file.name.split('.').pop() || 'jpg';
  const storagePath = `${userId}/${uuidv4()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '31536000',
    });

  if (uploadError) throw new Error(uploadError.message);

  return request('/photos', {
    method: 'POST',
    body: JSON.stringify({ userId, storagePath, caption }),
  });
};

export const getFeed = (limit = 50, offset = 0) =>
  request(`/photos/feed?limit=${limit}&offset=${offset}`);

export const reactToPhoto = (photoId, userId, emoji) =>
  request(`/photos/${photoId}/react`, {
    method: 'POST',
    body: JSON.stringify({ userId, emoji }),
  });

export const getScoreboard = () => request('/photos/scoreboard');

// Notifications
export const getVapidKey = () => request('/notifications/vapid-public-key');
export const subscribePush = (userId, subscription) =>
  request('/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({ userId, subscription }),
  });
export const unsubscribePush = (userId) =>
  request('/notifications/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });

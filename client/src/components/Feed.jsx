import { useState, useEffect } from 'react';
import { getFeed, reactToPhoto } from '../api';
import PhotoCard from './PhotoCard';

export default function Feed({ user }) {
  const [feed, setFeed] = useState({});
  const [loading, setLoading] = useState(true);

  const loadFeed = async () => {
    try {
      const { feed: data } = await getFeed();
      setFeed(data);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
    const interval = setInterval(loadFeed, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleReact = async (photoId, emoji) => {
    try {
      const { reactions } = await reactToPhoto(photoId, user.id, emoji);
      setFeed((prev) => {
        const updated = { ...prev };
        for (const hour in updated) {
          updated[hour] = updated[hour].map((p) =>
            p.id === photoId ? { ...p, reactions } : p
          );
        }
        return updated;
      });
    } catch (err) {
      console.error('React failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="feed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const hours = Object.keys(feed).sort().reverse();

  if (hours.length === 0) {
    return (
      <div className="feed">
        <div className="empty-state">
          <h3>No photos yet</h3>
          <p>Be the first to send it</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feed">
      {hours.map((hour) => (
        <div key={hour} className="hour-group">
          <div className="hour-label">{formatHourLabel(hour)}</div>
          {feed[hour].map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              currentUserId={user.id}
              onReact={handleReact}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function formatHourLabel(hourStr) {
  // hourStr is like "2024-01-15T14"
  const [datePart, hourPart] = hourStr.split('T');
  const date = new Date(`${datePart}T${hourPart}:00:00`);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today ${timeStr}`;
  if (isYesterday) return `Yesterday ${timeStr}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
}

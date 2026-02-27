import { useState, useEffect } from 'react';
import { getScoreboard } from '../api';

export default function Scoreboard() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScoreboard()
      .then(({ scoreboard }) => setBoard(scoreboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="scoreboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (board.length === 0) {
    return (
      <div className="scoreboard">
        <div className="empty-state">
          <h3>No scores yet</h3>
          <p>Start sending photos to build streaks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scoreboard">
      {board.map((entry, i) => (
        <div key={entry.id} className="scoreboard-row">
          <div className={`scoreboard-rank${i === 0 ? ' top' : ''}`}>
            {i + 1}
          </div>
          <div className="avatar" style={{ background: entry.avatarColor }}>
            {entry.name.charAt(0).toUpperCase()}
          </div>
          <div className="scoreboard-info">
            <div className="scoreboard-name">{entry.name}</div>
            <div className="scoreboard-stats">{entry.totalPhotos} photos total</div>
          </div>
          <div className="scoreboard-streak">
            {entry.streak}
            <span>streak</span>
          </div>
        </div>
      ))}
    </div>
  );
}

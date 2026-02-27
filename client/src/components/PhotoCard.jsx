const QUICK_REACTIONS = ['\uD83D\uDD25', '\uD83D\uDE02', '\uD83D\uDCAA', '\uD83D\uDC80', '\uD83D\uDC51'];

export default function PhotoCard({ photo, currentUserId, onReact }) {
  // Group reactions by emoji
  const grouped = {};
  for (const r of photo.reactions || []) {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    grouped[r.emoji].push(r);
  }

  return (
    <div className="photo-card">
      <div className="photo-card-header">
        <div className="avatar" style={{ background: photo.avatarColor }}>
          {photo.userName.charAt(0).toUpperCase()}
        </div>
        <span className="photo-card-name">{photo.userName}</span>
        <span className="photo-card-time">
          {new Date(photo.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>
      <img src={photo.photoUrl} alt={photo.caption || 'Photo'} loading="lazy" />
      {photo.caption && <div className="photo-card-caption">{photo.caption}</div>}
      <div className="photo-card-reactions">
        {QUICK_REACTIONS.map((emoji) => {
          const reactions = grouped[emoji] || [];
          const isActive = reactions.some((r) => r.userId === currentUserId);
          return (
            <button
              key={emoji}
              className={`reaction-btn${isActive ? ' active' : ''}`}
              onClick={() => onReact(photo.id, emoji)}
            >
              {emoji}
              {reactions.length > 0 && (
                <span className="reaction-count">{reactions.length}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getVapidKey, subscribePush, unsubscribePush, deleteAccount } from '../api';

export default function Settings({ user, onLogout, onAccountDeleted }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Check if notifications are already enabled
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setNotificationsEnabled(!!sub);
        });
      });
    }
  }, []);

  const toggleNotifications = async () => {
    setNotifLoading(true);
    try {
      if (notificationsEnabled) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        await unsubscribePush(user.id);
        setNotificationsEnabled(false);
      } else {
        // Request permission and subscribe
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Notifications permission denied. Enable them in your browser settings.');
          return;
        }
        const { publicKey } = await getVapidKey();
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        await subscribePush(user.id, sub.toJSON());
        setNotificationsEnabled(true);
      }
    } catch (err) {
      console.error('Notification toggle failed:', err);
      alert('Failed to toggle notifications. Make sure you allowed notifications for this site.');
    } finally {
      setNotifLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(user.joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="settings">
      <div className="settings-section">
        <h3>Your join code</h3>
        <div className="settings-row" onClick={copyCode} style={{ cursor: 'pointer' }}>
          <span className="join-code">{user.joinCode}</span>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {copied ? 'Copied!' : 'Tap to copy'}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>
          Use this code to log in on another device. Don't share it — it's your login.
        </p>
      </div>

      <div className="settings-section">
        <h3>Notifications</h3>
        <div className="settings-row">
          <span>Hourly reminders</span>
          <button
            className={`btn btn-small ${notificationsEnabled ? '' : 'btn-outline'}`}
            onClick={toggleNotifications}
            disabled={notifLoading}
          >
            {notifLoading ? '...' : notificationsEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Share</h3>
        <div className="settings-row">
          <span style={{ fontSize: 14 }}>
            Send the link to your WhatsApp group and tell the boys to join
          </span>
        </div>
      </div>

      <div className="settings-section">
        <button
          className="btn btn-outline"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          onClick={onLogout}
        >
          Log out
        </button>
      </div>

      <div className="settings-section">
        {!deleteConfirm ? (
          <button
            className="btn-link"
            style={{ color: 'var(--text-dim)', fontSize: 13 }}
            onClick={() => setDeleteConfirm(true)}
          >
            Delete my account
          </button>
        ) : (
          <div className="settings-row" style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
            <p style={{ fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}>
              Are you sure? This deletes all your photos and data permanently.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-small btn-outline"
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-small"
                style={{ background: 'var(--danger)' }}
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteAccount(user.id);
                    localStorage.removeItem('fordaboys_user');
                    onAccountDeleted();
                  } catch (err) {
                    alert('Failed to delete account: ' + err.message);
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? 'Deleting...' : 'Yes, delete everything'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

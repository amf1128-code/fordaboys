import { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import OnboardingScreen from './components/OnboardingScreen';
import Feed from './components/Feed';
import Camera from './components/Camera';
import Scoreboard from './components/Scoreboard';
import Settings from './components/Settings';

const TABS = ['feed', 'camera', 'scores', 'settings'];

function App() {
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tab, setTab] = useState('feed');
  const [countdown, setCountdown] = useState('');
  const [toast, setToast] = useState('');

  // Load saved user
  useEffect(() => {
    const saved = localStorage.getItem('fordaboys_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  // Countdown to next hour
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const mins = 59 - now.getMinutes();
      const secs = 59 - now.getSeconds();
      setCountdown(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleLogout = () => {
    localStorage.removeItem('fordaboys_user');
    setUser(null);
  };

  const handleLogin = (u, isNewUser) => {
    setUser(u);
    if (isNewUser) setShowOnboarding(true);
  };

  if (!user) {
    return (
      <div className="app">
        <AuthScreen onLogin={handleLogin} />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="app">
        <OnboardingScreen
          user={user}
          onComplete={() => setShowOnboarding(false)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>fordaboys</h1>
        <div className="countdown">{countdown}</div>
      </div>

      {tab === 'feed' && <Feed user={user} />}
      {tab === 'camera' && (
        <Camera
          user={user}
          onUploaded={() => {
            showToast('Photo sent!');
            setTab('feed');
          }}
        />
      )}
      {tab === 'scores' && <Scoreboard />}
      {tab === 'settings' && <Settings user={user} onLogout={handleLogout} onAccountDeleted={handleLogout} />}

      <nav className="nav">
        <button className={tab === 'feed' ? 'active' : ''} onClick={() => setTab('feed')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Feed
        </button>
        <button className={tab === 'camera' ? 'active' : ''} onClick={() => setTab('camera')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Send it
        </button>
        <button className={tab === 'scores' ? 'active' : ''} onClick={() => setTab('scores')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
          </svg>
          Scores
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          Settings
        </button>
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;

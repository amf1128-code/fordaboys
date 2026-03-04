import { useState, useEffect } from 'react';
import { getVapidKey, subscribePush } from '../api';
import { urlBase64ToUint8Array } from '../lib/utils';

export default function OnboardingScreen({ user, onComplete }) {
  const [step, setStep] = useState('phone'); // phone | joincode | homescreen | notifications
  const [phone, setPhone] = useState(null); // iphone | android
  const [isStandalone, setIsStandalone] = useState(false);
  const [notifStatus, setNotifStatus] = useState('idle'); // idle | loading | done | error
  const [notifError, setNotifError] = useState('');

  useEffect(() => {
    // Detect if already running as installed PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);
  }, []);

  const handlePhoneSelect = (type) => {
    setPhone(type);
    setStep('joincode');
  };

  const handleHomescreenDone = () => {
    setStep('notifications');
  };

  const handleEnableNotifications = async () => {
    setNotifStatus('loading');
    setNotifError('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotifError('Permission denied. Enable notifications in your browser settings.');
        setNotifStatus('error');
        return;
      }
      const { publicKey } = await getVapidKey();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await subscribePush(user.id, sub.toJSON());
      setNotifStatus('done');
      setTimeout(onComplete, 1000);
    } catch (err) {
      console.error('Notification setup failed:', err);
      setNotifError(err.message || 'Something went wrong. Try again.');
      setNotifStatus('error');
    }
  };

  // ── Step 1: Phone selection ──
  if (step === 'phone') {
    return (
      <div className="onboarding">
        <div className="onboarding-steps">
          <span className="step-dot active" />
          <span className="step-dot" />
          <span className="step-dot" />
          <span className="step-dot" />
        </div>
        <h1>What phone do you have?</h1>
        <p>We'll walk you through setting up the app</p>
        <div className="onboarding-choices">
          <button className="phone-choice" onClick={() => handlePhoneSelect('iphone')}>
            <span className="phone-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17.75h.01" />
                <rect x="6" y="2" width="12" height="20" rx="2" />
              </svg>
            </span>
            <span className="phone-label">iPhone</span>
          </button>
          <button className="phone-choice" onClick={() => handlePhoneSelect('android')}>
            <span className="phone-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
            </span>
            <span className="phone-label">Android</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Save your join code ──
  if (step === 'joincode') {
    return (
      <div className="onboarding">
        <div className="onboarding-steps">
          <span className="step-dot done" />
          <span className="step-dot active" />
          <span className="step-dot" />
          <span className="step-dot" />
        </div>
        <h1>Save your login code</h1>
        <p>
          This is how you log back in. No passwords, no email — just this code.
        </p>
        <div className="onboarding-card">
          <span className="join-code" style={{ fontSize: 32, letterSpacing: 4 }}>
            {user.joinCode}
          </span>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>
            If you lose access to the app, this code is the only way back in.
          </p>
        </div>
        <div className="onboarding-instructions">
          <div className="instruction-step">
            <span className="instruction-num">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <circle cx="12" cy="18" r="0.5" />
              </svg>
            </span>
            <span><strong>Screenshot this screen now</strong> so you always have it</span>
          </div>
        </div>
        <div className="onboarding-actions">
          <button className="btn" onClick={() => setStep('homescreen')}>
            I've saved it
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Add to home screen ──
  if (step === 'homescreen') {
    return (
      <div className="onboarding">
        <div className="onboarding-steps">
          <span className="step-dot done" />
          <span className="step-dot done" />
          <span className="step-dot active" />
          <span className="step-dot" />
        </div>
        <h1>Add to home screen</h1>
        <p>
          {phone === 'iphone'
            ? 'This is required on iPhone for notifications to work'
            : 'This makes it feel like a real app'}
        </p>

        {isStandalone ? (
          <div className="onboarding-card">
            <div className="check-circle">✓</div>
            <p style={{ fontWeight: 600, marginTop: 8 }}>You're already set up!</p>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4 }}>
              The app is installed on your home screen
            </p>
          </div>
        ) : phone === 'iphone' ? (
          <div className="onboarding-instructions">
            <div className="instruction-step">
              <span className="instruction-num">1</span>
              <span>
                Tap the <strong>Share</strong> button
                <svg className="share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                at the bottom of Safari
              </span>
            </div>
            <div className="instruction-step">
              <span className="instruction-num">2</span>
              <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
            </div>
            <div className="instruction-step">
              <span className="instruction-num">3</span>
              <span>Tap <strong>"Add"</strong> in the top right</span>
            </div>
            <div className="instruction-step">
              <span className="instruction-num">4</span>
              <span>Open <strong>fordaboys</strong> from your home screen and come back here</span>
            </div>
          </div>
        ) : (
          <div className="onboarding-instructions">
            <div className="instruction-step">
              <span className="instruction-num">1</span>
              <span>
                Tap the <strong>three-dot menu</strong> (⋮) in Chrome
              </span>
            </div>
            <div className="instruction-step">
              <span className="instruction-num">2</span>
              <span>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span>
            </div>
            <div className="instruction-step">
              <span className="instruction-num">3</span>
              <span>Tap <strong>"Install"</strong> to confirm</span>
            </div>
          </div>
        )}

        <div className="onboarding-actions">
          <button className="btn" onClick={handleHomescreenDone}>
            {isStandalone ? 'Next' : "I've done this"}
          </button>
          <button
            className="btn-link"
            onClick={handleHomescreenDone}
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4: Enable notifications ──
  return (
    <div className="onboarding">
      <div className="onboarding-steps">
        <span className="step-dot done" />
        <span className="step-dot done" />
        <span className="step-dot done" />
        <span className="step-dot active" />
      </div>
      <h1>Turn on notifications</h1>
      <p>
        Get a reminder every hour so you never miss a moment
      </p>

      <div className="onboarding-card" style={{ fontSize: 48 }}>
        🔔
      </div>

      {notifStatus === 'error' && (
        <p style={{ color: 'var(--danger)', fontSize: 14 }}>
          {notifError || (phone === 'iphone'
            ? "Couldn't enable notifications. Make sure you added the app to your home screen and opened it from there."
            : "Couldn't enable notifications. Check your browser settings and try again.")}
        </p>
      )}

      {notifStatus === 'done' ? (
        <div style={{ textAlign: 'center' }}>
          <div className="check-circle">✓</div>
          <p style={{ fontWeight: 600, marginTop: 8 }}>You're all set!</p>
        </div>
      ) : (
        <div className="onboarding-actions">
          <button
            className="btn"
            onClick={handleEnableNotifications}
            disabled={notifStatus === 'loading'}
          >
            {notifStatus === 'loading' ? 'Setting up...' : 'Enable notifications'}
          </button>
          <button className="btn-link" onClick={onComplete}>
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}

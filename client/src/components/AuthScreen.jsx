import { useState } from 'react';
import { join, login } from '../api';

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('welcome'); // welcome | join | login
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await join(name);
      localStorage.setItem('fordaboys_user', JSON.stringify(user));
      onLogin(user, true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await login(code);
      localStorage.setItem('fordaboys_user', JSON.stringify(user));
      onLogin(user, false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'welcome') {
    return (
      <div className="auth-screen">
        <h1>fordaboys</h1>
        <p>
          Every hour, on the hour — snap a photo and send it.<br />
          No excuses. No filters. Just vibes.
        </p>
        <div className="auth-form">
          <button className="btn" onClick={() => setMode('join')}>
            I'm new here
          </button>
          <button className="btn btn-outline" onClick={() => setMode('login')}>
            I have a code
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="auth-screen">
        <h1>Join up</h1>
        <p>Pick a name the boys will recognize</p>
        <form className="auth-form" onSubmit={handleJoin}>
          <input
            className="input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
          <button className="btn" disabled={!name.trim() || loading}>
            {loading ? 'Joining...' : "Let's go"}
          </button>
        </form>
        <button
          className="btn btn-outline btn-small"
          onClick={() => { setMode('welcome'); setError(''); }}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <h1>Welcome back</h1>
      <p>Enter your join code</p>
      <form className="auth-form" onSubmit={handleLogin}>
        <input
          className="input"
          placeholder="e.g. A1B2C3D4"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          style={{ textAlign: 'center', letterSpacing: 2, fontFamily: 'monospace', fontSize: 20 }}
          autoFocus
        />
        {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
        <button className="btn" disabled={!code.trim() || loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <button
        className="btn btn-outline btn-small"
        onClick={() => { setMode('welcome'); setError(''); }}
      >
        Back
      </button>
    </div>
  );
}

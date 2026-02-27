import { useState, useRef } from 'react';
import { uploadPhoto } from '../api';

export default function Camera({ user, onUploaded }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadPhoto(user.id, file, caption);
      if (result.error) {
        setError(result.error);
      } else {
        setFile(null);
        setPreview(null);
        setCaption('');
        onUploaded();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption('');
    setError('');
  };

  return (
    <div className="camera-screen">
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Send it</h2>

      <div className="camera-preview">
        {preview ? (
          <img src={preview} alt="Preview" />
        ) : (
          <div className="camera-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <p>Tap to take a photo</p>
          </div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInput}
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {!preview && (
        <div className="camera-actions">
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Take Photo
          </button>
        </div>
      )}

      {preview && (
        <>
          <input
            className="input caption-input"
            placeholder="Add a caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
          <div className="camera-actions">
            <button className="btn btn-outline" onClick={reset} disabled={uploading}>
              Retake
            </button>
            <button className="btn" onClick={handleSubmit} disabled={uploading}>
              {uploading ? 'Sending...' : 'Send it'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

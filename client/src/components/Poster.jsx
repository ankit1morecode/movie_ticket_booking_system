import { useState } from 'react';

// Movie poster image; falls back to a coloured card with the title if the image can't load
export default function Poster({ src, title, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`poster poster-fallback ${className}`}>
        <span>{title}</span>
      </div>
    );
  }
  return <img className={`poster ${className}`} src={src} alt={title} loading="lazy" onError={() => setFailed(true)} />;
}

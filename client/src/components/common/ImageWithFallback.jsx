import { useState } from 'react';

/** Image with a graceful branded fallback when the remote asset fails. */
export function ImageWithFallback({ src, alt, className = '', fallbackLabel = 'Crust & Craft' }) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div className={`img-fallback ${className}`} role="img" aria-label={alt}>
        {fallbackLabel}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default ImageWithFallback;

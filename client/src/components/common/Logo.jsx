import { Link } from 'react-router-dom';
import { Pizza } from 'lucide-react';

export function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className="logo" aria-label="Crust & Craft home">
      <span className="logo__mark" aria-hidden="true">
        <Pizza size={20} />
      </span>
      <span className="logo__text" style={light ? { color: '#fff' } : undefined}>
        Crust &amp; Craft
        <small style={light ? { color: 'rgba(255,255,255,0.7)' } : undefined}>Artisan Pizza</small>
      </span>
    </Link>
  );
}

export default Logo;

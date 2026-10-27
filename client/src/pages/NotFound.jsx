import { Pizza } from 'lucide-react';
import { LinkButton } from '../components/ui/Button.jsx';

export function NotFound() {
  return (
    <div className="page">
      <div className="container not-found">
        <div className="feature__icon" style={{ margin: '0 auto' }}>
          <Pizza size={26} />
        </div>
        <h1>404 — Nothing on this plate</h1>
        <p className="muted">We could not find the page you were looking for.</p>
        <div className="row" style={{ justifyContent: 'center', gap: 'var(--space-3)' }}>
          <LinkButton to="/">Back home</LinkButton>
          <LinkButton to="/menu" variant="secondary">
            Browse the menu
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

export default NotFound;

import { AlertTriangle, CheckCircle2, Info, Loader2, PackageOpen, RefreshCw, XCircle } from 'lucide-react';
import { STATUS_LABELS, STATUS_TONES, PAYMENT_LABELS, PAYMENT_TONES } from '../../lib/constants.js';

export function Badge({ children, tone = 'neutral', className = '' }) {
  return <span className={`badge badge--${tone} ${className}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONES[status] || 'neutral'}>{STATUS_LABELS[status] || status}</Badge>;
}

export function PaymentBadge({ status }) {
  return <Badge tone={PAYMENT_TONES[status] || 'neutral'}>{PAYMENT_LABELS[status] || status}</Badge>;
}

const ALERT_ICONS = { error: XCircle, success: CheckCircle2, warning: AlertTriangle, info: Info };

export function Alert({ tone = 'info', children, title }) {
  const Icon = ALERT_ICONS[tone] || Info;
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        {title && <strong style={{ display: 'block' }}>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function Spinner({ size = 22 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <Loader2 size={26} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ height = 16, className = '', style }) {
  return <div className={`skeleton ${className}`} style={{ height, ...style }} aria-hidden="true" />;
}

export function CardSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid--3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton--card" />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        {icon || <PackageOpen size={30} />}
      </div>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <div className="empty-state__icon" aria-hidden="true">
        <AlertTriangle size={30} />
      </div>
      <h3>{title}</h3>
      {message && <p className="muted">{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          <RefreshCw size={16} /> Try again
        </button>
      )}
    </div>
  );
}

export default Badge;

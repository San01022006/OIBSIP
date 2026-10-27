import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function buttonClass(variant = 'primary', extra = '') {
  return `btn btn--${variant} ${extra}`.trim();
}

export function Button({
  children,
  variant = 'primary',
  size,
  loading = false,
  disabled,
  type = 'button',
  className = '',
  ...rest
}) {
  const sizeClass = size === 'sm' ? 'btn--sm' : size === 'lg' ? 'btn--lg' : '';
  return (
    <button
      type={type}
      className={buttonClass(variant, `${sizeClass} ${className}`)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 size={16} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({ to, children, variant = 'primary', size, className = '', ...rest }) {
  const sizeClass = size === 'sm' ? 'btn--sm' : size === 'lg' ? 'btn--lg' : '';
  return (
    <Link to={to} className={buttonClass(variant, `${sizeClass} ${className}`)} {...rest}>
      {children}
    </Link>
  );
}

export default Button;

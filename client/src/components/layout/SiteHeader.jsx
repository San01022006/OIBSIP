import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, User as UserIcon, LogOut, ClipboardList, LayoutDashboard } from 'lucide-react';
import { Logo } from '../common/Logo.jsx';
import { LinkButton } from '../ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { initials } from '../../lib/format.js';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/menu', label: 'Menu' },
  { to: '/build', label: 'Build Your Pizza' },
  { to: '/my-orders', label: 'My Orders' },
];

function UserMenu() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => {
    await logout();
    toast.success('You have been signed out');
    navigate('/');
  };

  return (
    <div className="user-menu">
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="user-menu__avatar">{initials(user.name)}</span>
        <span>{user.name.split(' ')[0]}</span>
      </button>
      {open && (
        <div className="user-menu__dropdown" role="menu" onMouseLeave={() => setOpen(false)}>
          <div style={{ padding: 'var(--space-2) var(--space-3)' }}>
            <strong style={{ fontSize: 'var(--text-sm)' }}>{user.name}</strong>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              {user.email}
            </div>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
          {user.role === 'admin' && (
            <NavLink to="/admin" onClick={() => setOpen(false)}>
              <LayoutDashboard size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Admin dashboard
            </NavLink>
          )}
          <NavLink to="/my-orders" onClick={() => setOpen(false)}>
            <ClipboardList size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} /> My orders
          </NavLink>
          <button type="button" onClick={doLogout}>
            <LogOut size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { user } = useAuth();
  const { count } = useCart();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Logo />
        <nav className={`nav ${navOpen ? 'nav--open' : ''}`} aria-label="Main navigation">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav__link ${isActive ? 'active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <NavLink to="/checkout" className="icon-btn cart-link" aria-label={`Cart, ${count} items`}>
            <ShoppingBag size={20} />
            {count > 0 && <span className="cart-badge">{count}</span>}
          </NavLink>
          {user ? (
            <UserMenu />
          ) : (
            <LinkButton to="/login" variant="secondary" size="sm">
              <UserIcon size={15} /> Sign In
            </LinkButton>
          )}
          <button
            type="button"
            className="nav-toggle"
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
          >
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;

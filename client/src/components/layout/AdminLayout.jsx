import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Store,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '../common/Logo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { initials } from '../../lib/format.js';

const LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/inventory', label: 'Inventory', icon: Package },
];

export function AdminLayout() {
  const { user, logoutAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => {
    await logoutAdmin();
    toast.success('Signed out of the admin console');
    navigate('/admin/login');
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? 'admin-sidebar--open' : ''}`}>
        <Logo to="/admin" light />
        <nav className="admin-sidebar__nav" aria-label="Admin navigation">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
          <NavLink to="/" className="admin-nav-link" onClick={() => setOpen(false)}>
            <Store size={18} /> View store
          </NavLink>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button type="button" className="admin-nav-link" style={{ width: '100%' }} onClick={doLogout}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="admin-main">
        <div className="admin-topbar">
          <button
            type="button"
            className="icon-btn admin-sidebar-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle sidebar"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="row" style={{ gap: 8, fontWeight: 600 }}>
            <ShieldCheck size={18} color="var(--color-primary)" /> Admin Console
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="user-menu__avatar">{initials(user?.name)}</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{user?.name}</span>
          </div>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;

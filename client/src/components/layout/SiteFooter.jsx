import { Link } from 'react-router-dom';
import { Pizza } from 'lucide-react';
import { Logo } from '../common/Logo.jsx';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo light />
            <p style={{ color: '#b7b2aa', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>
              Freshly made artisan pizzas, crafted your way. Order online and follow every step from
              our kitchen to your door.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li>
                <Link to="/menu">Menu</Link>
              </li>
              <li>
                <Link to="/build">Build Your Pizza</Link>
              </li>
              <li>
                <Link to="/my-orders">Track Order</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li>
                <Link to="/login">Sign In</Link>
              </li>
              <li>
                <Link to="/register">Create Account</Link>
              </li>
              <li>
                <Link to="/forgot-password">Forgot Password</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>hello@crustandcraft.test</li>
              <li>+91 98765 43210</li>
              <li>Open 11:00–23:00 daily</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Crust &amp; Craft. Crafted for the Oasis Infobyte SIP.</span>
          <span className="row" style={{ gap: 6 }}>
            <Pizza size={14} /> Made with fresh ingredients
          </span>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;

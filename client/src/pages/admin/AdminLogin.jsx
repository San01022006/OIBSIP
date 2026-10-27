import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { TextInput, PasswordInput } from '../../components/ui/Field.jsx';
import { Alert } from '../../components/ui/Feedback.jsx';
import { Logo } from '../../components/common/Logo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export function AdminLogin() {
  const { loginAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAdmin(form);
      toast.success('Signed in to the admin console');
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="container auth-card">
        <div className="text-center" style={{ marginBottom: 'var(--space-4)' }}>
          <Logo />
        </div>
        <div className="section-head" style={{ textAlign: 'center' }}>
          <span className="eyebrow">
            <ShieldCheck size={13} style={{ verticalAlign: '-2px' }} /> Restricted
          </span>
          <h1>Admin sign in</h1>
          <p className="muted">Manage orders and inventory for Crust &amp; Craft.</p>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <form onSubmit={onSubmit} className="stack" noValidate>
          <TextInput
            label="Admin email"
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            autoComplete="username"
          />
          <PasswordInput
            label="Password"
            name="password"
            value={form.password}
            onChange={onChange}
            required
            autoComplete="current-password"
          />
          <Button type="submit" loading={loading} size="lg">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;

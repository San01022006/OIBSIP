import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Field } from '../components/ui/Field.jsx';
import { Alert } from '../components/ui/Feedback.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(user.role === 'admin' ? '/admin' : redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="container auth-card">
        <div className="section-head" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Welcome back</span>
          <h1>Sign in to your account</h1>
          <p className="muted">Track orders, reorder favourites and check out faster.</p>
        </div>

        {error && <Alert tone="error">{error}</Alert>}
        {location.state?.notice && <Alert tone="info">{location.state.notice}</Alert>}

        <form onSubmit={onSubmit} className="stack" noValidate>
          <Field label="Email address" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="input"
              value={form.email}
              onChange={onChange}
              required
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={form.password}
              onChange={onChange}
              required
            />
          </Field>
          <div className="row row--between">
            <Link to="/forgot-password" className="link-sm">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" loading={loading} size="lg">
            Sign In
          </Button>
        </form>

        <p className="muted text-center" style={{ marginTop: 'var(--space-4)' }}>
          New to Crust &amp; Craft? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

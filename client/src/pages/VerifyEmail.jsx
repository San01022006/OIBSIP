import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { MailCheck, RefreshCw } from 'lucide-react';
import { Button, LinkButton } from '../components/ui/Button.jsx';
import { TextInput } from '../components/ui/Field.jsx';
import { Alert, Spinner } from '../components/ui/Feedback.jsx';
import authService from '../services/authService.js';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const location = useLocation();
  const token = params.get('token');

  const [state, setState] = useState(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(location.state?.email || '');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setState('verifying');
    authService
      .verifyEmail(token)
      .then(() => active && setState('success'))
      .catch((err) => {
        if (!active) return;
        setState('error');
        setMessage(err.message);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const resend = async (e) => {
    e.preventDefault();
    setResending(true);
    try {
      await authService.resendVerification(email);
      setMessage('If that email exists, a fresh verification link has been sent.');
      setState('resent');
    } catch (err) {
      setMessage(err.message);
      setState('error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="container auth-card">
        {state === 'verifying' && (
          <div className="text-center">
            <Spinner size={30} />
            <h1>Verifying your email…</h1>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div className="feature__icon" style={{ margin: '0 auto' }}>
              <MailCheck size={24} />
            </div>
            <h1>Email verified</h1>
            <p className="muted">Your account is active. You can sign in now.</p>
            <LinkButton to="/login" size="lg">
              Continue to sign in
            </LinkButton>
          </div>
        )}

        {(state === 'idle' || state === 'resent') && (
          <div>
            <div className="section-head" style={{ textAlign: 'center' }}>
              <span className="eyebrow">Almost there</span>
              <h1>Verify your email</h1>
              <p className="muted">
                We have sent a verification link to your inbox. In local development the link is
                printed in the server console.
              </p>
            </div>
            {state === 'resent' && <Alert tone="success">{message}</Alert>}
            <form onSubmit={resend} className="stack" noValidate>
              <TextInput
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" variant="secondary" loading={resending}>
                <RefreshCw size={16} /> Resend verification link
              </Button>
            </form>
          </div>
        )}

        {state === 'error' && (
          <div>
            <Alert tone="error" title="Verification failed">
              {message || 'The link is invalid or has expired.'}
            </Alert>
            <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
              <Link to="/login">Back to sign in</Link>
              <Link to="/forgot-password">Reset your password instead</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;

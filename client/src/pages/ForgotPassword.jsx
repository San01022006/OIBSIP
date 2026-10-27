import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { TextInput } from '../components/ui/Field.jsx';
import { Alert } from '../components/ui/Feedback.jsx';
import authService from '../services/authService.js';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
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
          <span className="eyebrow">Account help</span>
          <h1>Forgot your password?</h1>
          <p className="muted">Enter your email and we will send you a reset link.</p>
        </div>

        {error && <Alert tone="error">{error}</Alert>}
        {sent ? (
          <Alert tone="success" title="Check your inbox">
            If that email is registered, a password reset link is on its way. In local development it
            is printed in the server console.
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="stack" noValidate>
            <TextInput
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" loading={loading} size="lg">
              Send reset link
            </Button>
          </form>
        )}

        <p className="muted text-center" style={{ marginTop: 'var(--space-4)' }}>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;

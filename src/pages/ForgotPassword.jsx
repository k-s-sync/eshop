import { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
      } else {
        setError(data.message || 'Request failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h2 className="auth-title">Reset Password</h2>
      <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-text-light)' }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {message && <div className="auth-success">{message}</div>}
      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-input-group">
          <label className="auth-label">Email Address</label>
          <input 
            type="email" 
            className="auth-input"
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isLoading}>
          {isLoading ? 'Sending link...' : 'Send Reset Link'}
        </button>
      </form>
      
      <p className="auth-footer">
        Back to <Link to="/login" className="auth-link">Login</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await response.json();

      if (data.success) {
        setMessage('Password successfully reset! You can now log in.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.message || 'Reset failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h2 className="auth-title">Set New Password</h2>
      
      {message && <div className="auth-success">{message}</div>}
      {error && <div className="auth-error">{error}</div>}

      {!message && (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label className="auth-label">New Password</label>
            <input 
              type="password" 
              className="auth-input"
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength="6"
            />
          </div>
          <div className="auth-input-group">
            <label className="auth-label">Confirm New Password</label>
            <input 
              type="password" 
              className="auth-input"
              required 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength="6"
            />
          </div>
          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isLoading || !token}>
            {isLoading ? 'Resetting...' : 'Update Password'}
          </button>
        </form>
      )}
      
      <p className="auth-footer">
        Back to <Link to="/login" className="auth-link">Login</Link>
      </p>
    </div>
  );
};

export default ResetPassword;

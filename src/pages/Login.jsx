import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (data.success) {
        login(data.token, data.user);
        navigate('/'); // Redirect to home or checkout if coming from cart
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h2 className="auth-title">Welcome Back</h2>
      
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
        <div className="auth-input-group">
          <label className="auth-label">Password</label>
          <input 
            type="password" 
            className="auth-input"
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Forgot Password?</Link>
          </div>
        </div>
        <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      
      <p className="auth-footer">
        Don't have an account? <Link to="/register" className="auth-link">Register here</Link>
      </p>
    </div>
  );
};

export default Login;

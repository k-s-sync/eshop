import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (data.success) {
        login(data.token, { name: formData.fullName, email: formData.email });
        navigate('/'); 
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h2 className="auth-title">Create an Account</h2>
      
      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-input-group">
          <label className="auth-label">Full Name</label>
          <input type="text" name="fullName" className="auth-input" required value={formData.fullName} onChange={handleChange} />
        </div>
        <div className="auth-input-group">
          <label className="auth-label">Email Address</label>
          <input type="email" name="email" className="auth-input" required value={formData.email} onChange={handleChange} />
        </div>
        <div className="auth-input-group">
          <label className="auth-label">Phone Number</label>
          <input type="tel" name="phone" className="auth-input" value={formData.phone} onChange={handleChange} />
        </div>
        <div className="auth-input-group">
          <label className="auth-label">Password</label>
          <input type="password" name="password" className="auth-input" required value={formData.password} onChange={handleChange} />
        </div>
        <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      
      <p className="auth-footer">
        Already have an account? <Link to="/login" className="auth-link">Log in</Link>
      </p>
    </div>
  );
};

export default Register;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiCpu, FiLock, FiMail, FiZap } from 'react-icons/fi';
import api from '../services/api';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Login successful!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('admin@semiconfab.com');
    setPassword('password123');
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <FiCpu size={40} />
          </div>
          <h1>AI Semiconductor Fab</h1>
          <p className="login-subtitle">Yield Optimizer Platform</p>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label><FiMail size={14} /> Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label><FiLock size={14} /> Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : 'Sign In'}
          </button>
          <button type="button" className="btn btn-secondary btn-full" onClick={handleDemoLogin}>
            <FiZap size={14} /> Demo Login
          </button>
        </form>
        <p className="login-footer">Powered by AI-driven semiconductor analytics</p>
      </div>
    </div>
  );
}

export default LoginPage;

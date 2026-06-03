import React, { useState } from 'react';
import { LogIn, UserPlus, Key, Mail, User, Clock, AlertCircle } from 'lucide-react';
import { loginUser, registerUser } from '../utils/storage';

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (isSignUp && !name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      if (isSignUp) {
        const res = registerUser(email, password, name);
        if (res.success) {
          onLoginSuccess(res.user);
        } else {
          setError(res.error);
        }
      } else {
        const res = loginUser(email, password);
        if (res.success) {
          onLoginSuccess(res.user);
        } else {
          setError(res.error);
        }
      }
      setLoading(false);
    }, 600); // Small delay for nice transition feeling
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.1), transparent 40%)',
      padding: '2rem 1rem'
    }}>
      <div className="card" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-color)',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        {/* Logo Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem' }}>
          <img 
            src="/tempo_logo.png" 
            alt="Tempo Logo" 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '14px',
              objectFit: 'cover',
              boxShadow: '0 8px 24px -4px rgba(99, 102, 241, 0.3)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            Welcome to Tempo
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            {isSignUp ? 'Create your account to start tracking hours.' : 'Sign in to manage your time and client invoices.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            color: '#ef4444',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isSignUp && (
            <div className="form-group">
              <label>Full Name</label>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Alex Mercer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              marginTop: '0.5rem'
            }}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }} />
            ) : isSignUp ? (
              <>
                <UserPlus size={18} /> Sign Up
              </>
            ) : (
              <>
                <LogIn size={18} /> Log In
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Dynamic Keyframe Injection */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

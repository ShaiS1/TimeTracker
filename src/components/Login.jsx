import React, { useState } from 'react';
import { LogIn, UserPlus, Key, Mail, User, Clock, AlertCircle, ShieldAlert, CheckCircle } from 'lucide-react';
import { signIn, signUp, confirmSignUp, getCurrentUser } from 'aws-amplify/auth';

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    setLoading(true);

    try {
      if (needsConfirmation) {
        // Step A: Confirm Sign Up verification code
        if (!confirmationCode.trim()) {
          setError('Please enter the confirmation code sent to your email.');
          setLoading(false);
          return;
        }

        await confirmSignUp({
          username: email.toLowerCase().trim(),
          confirmationCode: confirmationCode.trim()
        });

        setSuccessMsg('Account verified successfully! Please log in now.');
        setNeedsConfirmation(false);
        setIsSignUp(false);
        setPassword('');
      } else if (isSignUp) {
        // Step B: Sign Up new account
        if (!email.trim() || !password.trim() || !name.trim()) {
          setError('All fields are required.');
          setLoading(false);
          return;
        }

        // Cognito password validation: Cognito requires at least 8 characters, numbers, symbols, uppercase, etc. by default.
        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setLoading(false);
          return;
        }

        await signUp({
          username: email.toLowerCase().trim(),
          password: password,
          options: {
            userAttributes: {
              email: email.toLowerCase().trim(),
              name: name.trim()
            }
          }
        });

        setNeedsConfirmation(true);
        setSuccessMsg('Sign up successful! A verification code has been sent to your email.');
      } else {
        // Step C: Log In existing account
        if (!email.trim() || !password.trim()) {
          setError('Email and password are required.');
          setLoading(false);
          return;
        }

        const res = await signIn({
          username: email.toLowerCase().trim(),
          password: password
        });

        if (res.isSignedIn) {
          const user = await getCurrentUser();
          onLoginSuccess(user);
        } else if (res.nextStep && res.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
          // Trigger confirmation code screen if account was not verified
          setNeedsConfirmation(true);
          setSuccessMsg('Please verify your email address to log in.');
        } else {
          setError('Further authentication steps are required. Please check with your administrator.');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      // Friendly messages for common Cognito exceptions
      if (err.name === 'UserNotConfirmedException') {
        setNeedsConfirmation(true);
        setSuccessMsg('Please confirm your registration using the code sent to your email.');
      } else if (err.name === 'UsernameExistsException') {
        setError('An account with this email address already exists.');
      } else if (err.name === 'NotAuthorizedException') {
        setError('Incorrect email or password.');
      } else if (err.name === 'UserNotFoundException') {
        setError('No account found with this email address.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
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
            {needsConfirmation 
              ? 'Verify your email address to activate your account.' 
              : isSignUp 
                ? 'Create your cloud account to start tracking hours.' 
                : 'Sign in to access your secure client invoices.'}
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

        {/* Success Message */}
        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-paid)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {needsConfirmation ? (
            /* Confirmation Code Form */
            <div className="form-group">
              <label>Verification Code</label>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem', letterSpacing: '0.25em', textAlign: 'center', fontWeight: 'bold' }}
                  placeholder="123456"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Enter the numerical code sent to <strong>{email}</strong>.
              </p>
            </div>
          ) : (
            /* Standard Login / Signup Forms */
            <>
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
            </>
          )}

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
            ) : needsConfirmation ? (
              <>
                <CheckCircle size={18} /> Confirm Code
              </>
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

          {needsConfirmation && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setNeedsConfirmation(false);
                setError('');
                setSuccessMsg('');
              }}
              style={{ padding: '0.5rem' }}
            >
              Cancel Verification
            </button>
          )}
        </form>

        {/* Toggle Mode */}
        {!needsConfirmation && (
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
                    setSuccessMsg('');
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
                    setSuccessMsg('');
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
        )}
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

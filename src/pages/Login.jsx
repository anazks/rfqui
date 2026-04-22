import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forgotPassword } from '../services/api'
import { PLATFORM } from '../config/platform'

// SVG Icons
const MailIcon = () => (
  <svg className="floating-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);

const LockIcon = () => (
  <svg className="floating-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);

function Login() {
  const navigate  = useNavigate()
  const { login } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState('')

  const [showForgot,  setShowForgot]  = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetResult, setResetResult] = useState(null)
  const [resetError,  setResetError]  = useState('')

  const handleLogin = async () => {
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }
    setIsLoading(true)
    try {
      const { redirectTo } = await login(email, password)
      navigate(redirectTo || '/tool-launcher')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleLogin() }

  const handleForgotPassword = async () => {
    setResetError('')
    setResetResult(null)
    if (!forgotEmail) { setResetError('Please enter your email address'); return }
    setIsResetting(true)
    try {
      const response = await forgotPassword({ email: forgotEmail })
      setResetResult(response.data)
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="login-container">
      {/* LEFT PANEL - Branding (Hidden on Mobile) */}
      <div className="login-left-panel gradient-bg">
        <div style={styles.brandContent}>
          <div style={styles.logoCircleLarge}>S</div>
          <h1 style={styles.brandTitle}>{PLATFORM.name}</h1>
          <p style={styles.brandSubtitle}>
            Streamline your workflow with our advanced enterprise portal. 
            Experience unparalleled efficiency and precision.
          </p>
        </div>
        
        {/* Abstract Background Elements */}
        <div style={styles.blob1}></div>
        <div style={styles.blob2}></div>
      </div>

      {/* RIGHT PANEL - Interaction */}
      <div className="login-right-panel">
        <div className="glass" style={styles.card}>
          {/* HEADER */}
          <div style={styles.header}>
            <h2 style={styles.authTitle}>
              {showForgot ? 'Reset Password' : 'Welcome Back'}
            </h2>
            <p style={styles.authSubtitle}>
              {showForgot 
                ? 'Enter your email to generate a temporary password.' 
                : 'Please sign in to your enterprise account.'}
            </p>
          </div>

          {/* ALERTS */}
          {error && !showForgot && <div style={styles.errorBox}>❌ {error}</div>}
          {resetError && showForgot && <div style={styles.errorBox}>{resetError}</div>}

          {/* FORGOT PASSWORD FLOW */}
          {showForgot && resetResult ? (
            resetResult.found ? (
              <div style={styles.animFadeIn}>
                <div style={styles.successBox}>
                  <p style={styles.successTitle}>✅ Temporary Password Generated</p>
                  <p style={styles.forUser}>For: {resetResult.userName}</p>
                  <div style={styles.tempPasswordBox}>
                    <p style={styles.tempPasswordLabel}>Your Temporary Password</p>
                    <p style={styles.tempPassword}>{resetResult.tempPassword}</p>
                  </div>
                  <p style={styles.noteText}>⚠️ {resetResult.note}</p>
                </div>
                <button className="premium-btn" onClick={() => {
                  setShowForgot(false); setResetResult(null)
                  setForgotEmail(''); setEmail(forgotEmail)
                }}>
                  Return to Login
                </button>
              </div>
            ) : (
              <div style={styles.animFadeIn}>
                <div style={styles.infoBox}><p>{resetResult.message}</p></div>
                <button className="premium-btn" onClick={() => { setShowForgot(false); setResetResult(null); setForgotEmail('') }}>
                  Back to Login
                </button>
              </div>
            )
          ) : showForgot && !resetResult ? (
            <div style={styles.animFadeIn}>
              <div className="input-group">
                <label style={styles.label}>Email Address</label>
                <div className="input-icon-wrapper">
                  <MailIcon />
                  <input type="email" className="floating-input" value={forgotEmail}
                    placeholder="name@company.com"
                    onChange={(e) => setForgotEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                    disabled={isResetting} />
                </div>
              </div>
              <button className="premium-btn" onClick={handleForgotPassword} disabled={isResetting}>
                {isResetting && <span className="spin-loader"></span>}
                {isResetting ? 'Generating...' : 'Generate Password'}
              </button>
              <button style={styles.backLink}
                onClick={() => { setShowForgot(false); setResetError(''); setForgotEmail('') }}>
                ← Back to Login
              </button>
            </div>
          ) : (
             /* STANDARD LOGIN FLOW */
             <div style={styles.animFadeIn}>
                <div className="input-group">
                  <label style={styles.label}>Email Address</label>
                  <div className="input-icon-wrapper">
                    <MailIcon />
                    <input type="email" className="floating-input" value={email}
                      placeholder="name@company.com"
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown} disabled={isLoading} />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '8px' }}>
                  <label style={styles.label}>Password</label>
                  <div className="input-icon-wrapper">
                    <LockIcon />
                    <input type="password" className="floating-input" value={password}
                      placeholder="••••••••"
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown} disabled={isLoading} />
                  </div>
                </div>

                <div style={styles.forgotRow}>
                  <button style={styles.textLink}
                    onClick={() => { setShowForgot(true); setForgotEmail(email); setError('') }}>
                    Forgot password?
                  </button>
                </div>

                <button className="premium-btn" onClick={handleLogin} disabled={isLoading}>
                  {isLoading && <span className="spin-loader"></span>}
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  // Card layout adjustments for right panel
  card: {
    padding: '48px',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: '460px',
    transition: 'var(--transition)',
  },
  
  // Left Panel Typography
  brandContent: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '500px',
  },
  logoCircleLarge: {
    width: '80px', height: '80px', backgroundColor: 'var(--primary)',
    color: '#fff', borderRadius: 'var(--radius-lg)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '36px',
    fontWeight: '800', marginBottom: '30px', boxShadow: '0 10px 25px rgba(15,23,42,0.2)',
  },
  brandTitle: {
    fontSize: '48px',
    color: 'var(--primary)',
    fontWeight: '800',
    marginBottom: '16px',
    lineHeight: '1.2',
  },
  brandSubtitle: {
    fontSize: '18px',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    fontWeight: '400',
  },
  
  // Abstract background blobs
  blob1: {
    position: 'absolute', top: '-10%', right: '-10%',
    width: '400px', height: '400px',
    background: 'radial-gradient(circle, hsla(var(--accent-base), 95%, 43%, 0.15) 0%, transparent 70%)',
    borderRadius: '50%', zIndex: 1, filter: 'blur(40px)',
  },
  blob2: {
    position: 'absolute', bottom: '-20%', left: '-10%',
    width: '500px', height: '500px',
    background: 'radial-gradient(circle, hsla(var(--primary-base), 47%, 11%, 0.08) 0%, transparent 70%)',
    borderRadius: '50%', zIndex: 1, filter: 'blur(60px)',
  },

  // Auth Card Formatting
  header: {
    marginBottom: '32px',
  },
  authTitle: {
    fontSize: '28px',
    color: 'var(--primary)',
    fontWeight: '700',
    marginBottom: '8px',
  },
  authSubtitle: {
    fontSize: '15px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  label: { 
    display: 'block', marginBottom: '8px', fontSize: '14px', 
    fontWeight: '600', color: 'var(--text-main)', 
  },
  forgotRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '24px',
  },
  textLink: {
    background: 'none', border: 'none', color: 'var(--accent)',
    fontSize: '14px', cursor: 'pointer', fontWeight: '600',
    transition: 'var(--transition)', padding: 0,
  },
  backLink: {
    width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)',
    fontSize: '14px', cursor: 'pointer', textAlign: 'center', padding: '12px 0 0 0',
    marginTop: '16px', fontWeight: '500', transition: 'var(--transition)',
  },
  
  // Alert Boxes
  errorBox: {
    padding: '14px', backgroundColor: '#fff5f5', border: '1px solid #fc8181',
    borderRadius: 'var(--radius-sm)', color: '#c53030', fontSize: '14px', marginBottom: '24px',
    boxShadow: 'var(--shadow-sm)',
  },
  successBox: {
    padding: '24px', backgroundColor: '#ecfdf5', border: '1px solid #10b981',
    borderRadius: 'var(--radius-md)', marginBottom: '24px', boxShadow: 'var(--shadow-sm)',
  },
  successTitle:     { fontWeight: '700', color: '#065f46', marginBottom: '8px', fontSize: '16px' },
  forUser:          { fontSize: '14px', color: '#374151', marginBottom: '20px' },
  tempPasswordBox:  { backgroundColor: 'var(--primary)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center', marginBottom: '20px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' },
  tempPasswordLabel:{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' },
  tempPassword:     { fontSize: '32px', fontWeight: '800', color: '#ffffff', letterSpacing: '4px' },
  noteText:         { fontSize: '14px', color: '#92400e', lineHeight: '1.6', backgroundColor: '#fef3c7', padding: '12px', borderRadius: 'var(--radius-sm)' },
  infoBox: {
    padding: '16px', backgroundColor: '#eff6ff', border: '1px solid #3b82f6',
    borderRadius: 'var(--radius-md)', fontSize: '14px', color: '#1e40af', marginBottom: '24px',
  },

  animFadeIn: {
    animation: 'fadeIn 0.4s ease forwards',
  }
}

export default Login

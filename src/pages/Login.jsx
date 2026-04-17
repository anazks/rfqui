// Login.jsx — SourceHUB login page.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forgotPassword } from '../services/api'
import { PLATFORM } from '../config/platform'

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

  // ── Forgot Password Screen ────────────────────
  if (showForgot) {
    return (
      <div className="gradient-bg" style={styles.container}>
        <div className="glass" style={styles.card}>
          <h1 style={styles.title}>Reset Password</h1>
          <p style={styles.subtitle}>Enter your email to generate a temporary password</p>

          {!resetResult ? (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Email Address</label>
                <input type="email" style={styles.input} value={forgotEmail}
                  placeholder="name@company.com"
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                  disabled={isResetting} />
              </div>
              {resetError && <div style={styles.errorBox}>{resetError}</div>}
              <button style={{ ...styles.button, opacity: isResetting ? 0.7 : 1 }}
                onClick={handleForgotPassword} disabled={isResetting}>
                {isResetting ? 'Generating...' : 'Generate New Password'}
              </button>
              <button style={styles.backLink}
                onClick={() => { setShowForgot(false); setResetError(''); setForgotEmail('') }}>
                ← Back to Login
              </button>
            </>
          ) : (
            resetResult.found ? (
              <div>
                <div style={styles.successBox}>
                  <p style={styles.successTitle}>✅ Temporary Password Generated</p>
                  <p style={styles.forUser}>For: {resetResult.userName}</p>
                  <div style={styles.tempPasswordBox}>
                    <p style={styles.tempPasswordLabel}>Temporary Password</p>
                    <p style={styles.tempPassword}>{resetResult.tempPassword}</p>
                  </div>
                  <p style={styles.noteText}>⚠️ {resetResult.note}</p>
                </div>
                <button style={styles.button} onClick={() => {
                  setShowForgot(false); setResetResult(null)
                  setForgotEmail(''); setEmail(forgotEmail)
                }}>
                  Go to Login
                </button>
              </div>
            ) : (
              <div>
                <div style={styles.infoBox}><p>{resetResult.message}</p></div>
                <button style={styles.button}
                  onClick={() => { setShowForgot(false); setResetResult(null); setForgotEmail('') }}>
                  Back to Login
                </button>
              </div>
            )
          )}
        </div>
      </div>
    )
  }

  // ── Login Screen ──────────────────────────────
  return (
    <div className="gradient-bg" style={styles.container}>
      <div className="glass" style={styles.card}>
        <div style={styles.logoArea}>
          <div style={styles.logoCircle}>S</div>
          <h1 style={styles.title}>{PLATFORM.name}</h1>
          <p style={styles.subtitle}>Access your Enterprise Portal</p>
        </div>

        {error && <div style={styles.errorBox}>❌ {error}</div>}

        <div style={styles.field}>
          <label style={styles.label}>Email Address</label>
          <input type="email" style={styles.input} value={email}
            placeholder="name@company.com"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown} disabled={isLoading} />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input type="password" style={styles.input} value={password}
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown} disabled={isLoading} />
        </div>

        <button style={{ ...styles.button, opacity: isLoading ? 0.7 : 1 }}
          onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Authenticating...' : 'Sign In'}
        </button>

        <button style={styles.forgotLink}
          onClick={() => { setShowForgot(true); setForgotEmail(email); setError('') }}>
          Forgot your password?
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100vh', width: '100vw',
  },
  card: {
    padding: '48px', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '440px',
    transition: 'var(--transition)',
  },
  logoArea:  { textAlign: 'center', marginBottom: '32px' },
  logoCircle: {
    width: '56px', height: '56px', backgroundColor: 'var(--primary)',
    color: '#fff', borderRadius: 'var(--radius-md)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '24px',
    fontWeight: '700', margin: '0 auto 16px', boxShadow: 'var(--shadow-md)',
  },
  title:     { margin: '0 0 6px 0', fontSize: '32px', color: 'var(--primary)', fontWeight: '800' },
  subtitle:  { margin: 0, color: 'var(--text-muted)', fontSize: '15px' },
  errorBox: {
    padding: '14px', backgroundColor: '#fff5f5', border: '1px solid #fc8181',
    borderRadius: 'var(--radius-sm)', color: '#c53030', fontSize: '14px', marginBottom: '20px',
  },
  successBox: {
    padding: '20px', backgroundColor: '#ecfdf5', border: '1px solid #10b981',
    borderRadius: 'var(--radius-md)', marginBottom: '20px',
  },
  successTitle:     { fontWeight: '700', color: '#065f46', marginBottom: '8px', fontSize: '15px' },
  forUser:          { fontSize: '14px', color: '#374151', marginBottom: '16px' },
  tempPasswordBox:  { backgroundColor: 'var(--primary)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center', marginBottom: '16px' },
  tempPasswordLabel:{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' },
  tempPassword:     { fontSize: '28px', fontWeight: '700', color: '#ffffff', letterSpacing: '4px' },
  noteText:         { fontSize: '13px', color: '#92400e', lineHeight: '1.6' },
  infoBox: {
    padding: '16px', backgroundColor: '#eff6ff', border: '1px solid #3b82f6',
    borderRadius: 'var(--radius-md)', fontSize: '14px', color: '#1e40af', marginBottom: '20px',
  },
  field:     { marginBottom: '20px' },
  label:     { display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' },
  input: {
    width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)',
    border: '1.5px solid #e2e8f0', fontSize: '15px', boxSizing: 'border-box',
    transition: 'var(--transition)', backgroundColor: 'rgba(255,255,255,0.8)',
  },
  button: {
    width: '100%', padding: '14px', backgroundColor: 'var(--primary)',
    color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
    fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px',
    boxShadow: 'var(--shadow-md)',
  },
  forgotLink: {
    width: '100%', background: 'none', border: 'none', color: 'var(--accent)',
    fontSize: '14px', cursor: 'pointer', textAlign: 'center', padding: '6px',
    fontWeight: '500',
  },
  backLink: {
    width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)',
    fontSize: '14px', cursor: 'pointer', textAlign: 'center', padding: '6px', marginTop: '10px',
  },
}

export default Login

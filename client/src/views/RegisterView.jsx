import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterView() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showAdminSection, setShowAdminSection] = useState(false);
  const [adminSecretKey, setAdminSecretKey] = useState('');
  
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        adminSecretKey: showAdminSection ? adminSecretKey.trim() : undefined
      });

      if (user.role === 'admin') {
        navigate('/admin/projects', { replace: true });
      } else {
        navigate('/learner/browse', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: '1rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '490px',
        background: 'var(--color-surface, #ffffff)',
        borderRadius: '16px',
        border: '1px solid var(--color-border, #e2e8f0)',
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        padding: '1.6rem 2rem',
        boxSizing: 'border-box'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h1 style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--color-text-main, #0f172a)',
            margin: '0 0 0.25rem 0',
            letterSpacing: '-0.02em'
          }}>
            AI Task Evaluator
          </h1>
          <p style={{
            fontSize: '0.82rem',
            color: 'var(--color-text-muted, #64748b)',
            margin: 0
          }}>
            Join the platform to access project PRDs and evaluate code.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'var(--color-danger-bg, #fef2f2)',
            border: '1px solid #fecaca',
            color: 'var(--color-danger-text, #991b1b)',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '0.85rem'
          }}>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Row 1: Full Name & Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-text-body, #334155)',
                marginBottom: '0.3rem'
              }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohith Kumar"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  background: '#ffffff',
                  color: 'var(--color-text-main, #0f172a)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-text-body, #334155)',
                marginBottom: '0.3rem'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="learner@evaluator.ai"
                required
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  background: '#ffffff',
                  color: 'var(--color-text-main, #0f172a)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Row 2: Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-text-body, #334155)',
                marginBottom: '0.3rem'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 chars"
                required
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  background: '#ffffff',
                  color: 'var(--color-text-main, #0f172a)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-text-body, #334155)',
                marginBottom: '0.3rem'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  background: '#ffffff',
                  color: 'var(--color-text-main, #0f172a)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Admin Role Toggle Section */}
          <div style={{
            padding: '0.55rem 0.75rem',
            background: 'var(--color-surface-subtle, #f8fafc)',
            border: '1px dashed var(--color-border, #e2e8f0)',
            borderRadius: '8px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-text-body, #334155)',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={showAdminSection}
                onChange={(e) => setShowAdminSection(e.target.checked)}
                style={{ accentColor: 'var(--color-primary, #16a34a)' }}
              />
              <span>Registering as an Instructor or Admin?</span>
            </label>

            {showAdminSection && (
              <div style={{ marginTop: '0.5rem' }}>
                <input
                  type="password"
                  value={adminSecretKey}
                  onChange={(e) => setAdminSecretKey(e.target.value)}
                  placeholder="Enter Admin Secret Key"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.7rem',
                    fontSize: '0.84rem',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border, #e2e8f0)',
                    background: '#ffffff',
                    color: 'var(--color-text-main, #0f172a)',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-text-muted, #64748b)',
                  margin: '0.25rem 0 0 0'
                }}>
                  Enter <code>ADMIN_SECRET_KEY</code> to enable PRD creation and grading permissions.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.68rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '8px',
              marginTop: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div style={{
          textAlign: 'center',
          marginTop: '1rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--color-border, #e2e8f0)',
          fontSize: '0.82rem',
          color: 'var(--color-text-muted, #64748b)'
        }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--color-primary, #16a34a)',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
}

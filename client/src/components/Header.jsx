import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/UIContext';
import { IconPlus } from './Icons';

export default function Header({ onOpenCreateModal }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin: isUserAdmin } = useAuth();
  const { openCreateProject } = useModals();

  const handleCreateClick = () => {
    if (onOpenCreateModal) {
      onOpenCreateModal();
    } else {
      openCreateProject();
    }
  };

  const isAdminRoute = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.startsWith('/admin/projects') || path === '/admin') {
      return (
        <>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>Admin</span>
          <span style={{ color: 'var(--color-border)', margin: '0 0.35rem' }}>/</span>
          <span style={{ color: 'var(--color-text-main)', fontWeight: 700, fontSize: '0.88rem' }}>Evaluation Projects</span>
        </>
      );
    }
    if (path.startsWith('/admin/submissions')) {
      return (
        <>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>Admin</span>
          <span style={{ color: 'var(--color-border)', margin: '0 0.35rem' }}>/</span>
          <span style={{ color: 'var(--color-text-main)', fontWeight: 700, fontSize: '0.88rem' }}>Student Submissions</span>
        </>
      );
    }
    if (path.startsWith('/learner/browse')) {
      return (
        <>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>Learner</span>
          <span style={{ color: 'var(--color-border)', margin: '0 0.35rem' }}>/</span>
          <span style={{ color: 'var(--color-text-main)', fontWeight: 700, fontSize: '0.88rem' }}>Browse Projects</span>
        </>
      );
    }
    if (path.startsWith('/learner/projects')) {
      return (
        <>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>Learner</span>
          <span style={{ color: 'var(--color-border)', margin: '0 0.35rem' }}>/</span>
          <span style={{ color: 'var(--color-text-main)', fontWeight: 700, fontSize: '0.88rem' }}>Project Workspace</span>
        </>
      );
    }
    if (path.startsWith('/learner/submissions')) {
      return (
        <>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>Learner</span>
          <span style={{ color: 'var(--color-border)', margin: '0 0.35rem' }}>/</span>
          <span style={{ color: 'var(--color-text-main)', fontWeight: 700, fontSize: '0.88rem' }}>My Submissions</span>
        </>
      );
    }
    if (path.startsWith('/evaluations')) {
      return (
        <>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>Evaluation</span>
          <span style={{ color: 'var(--color-border)', margin: '0 0.35rem' }}>/</span>
          <span style={{ color: 'var(--color-text-main)', fontWeight: 700, fontSize: '0.88rem' }}>Scorecard & Codebase</span>
        </>
      );
    }
    return (
      <span style={{ color: 'var(--color-text-main)', fontWeight: 700, fontSize: '0.88rem' }}>
        Evaluation Dashboard
      </span>
    );
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="top-header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div className="header-breadcrumbs" style={{ display: 'flex', alignItems: 'center' }}>
          {getBreadcrumb()}
        </div>
        <span className={`role-pill ${isAdminRoute ? 'admin' : 'learner'}`}>
          {isAdminRoute ? 'Instructor Admin' : 'Learner Portal'}
        </span>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {isAdminRoute && isUserAdmin && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleCreateClick}
            id="btn-header-create-project"
            style={{ fontWeight: 700, padding: '0.45rem 1rem' }}
          >
            <IconPlus size={15} />
            <span>New Project</span>
          </button>
        )}

        {/* User Profile Pill & Logout */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            paddingLeft: '0.75rem',
            borderLeft: '1px solid var(--color-border, #e2e8f0)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: 'var(--color-surface-subtle, #f8fafc)',
              padding: '0.35rem 0.65rem 0.35rem 0.4rem',
              borderRadius: '20px',
              border: '1px solid var(--color-border, #e2e8f0)'
            }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: user.role === 'admin' ? 'var(--color-primary, #16a34a)' : '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.72rem'
              }}>
                {getInitials(user.name)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--color-text-main, #0f172a)'
                }}>
                  {user.name}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: user.role === 'admin' ? 'var(--color-primary, #16a34a)' : '#0284c7',
                  textTransform: 'capitalize'
                }}>
                  {user.role}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.7rem',
                color: 'var(--color-text-muted, #64748b)'
              }}
              title="Log out of your account"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

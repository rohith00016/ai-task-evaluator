import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  IconFolder, 
  IconCompass, 
  IconFileCheck, 
  IconChevronLeft, 
  IconChevronRight,
  IconPin,
  IconClose
} from './Icons';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ 
  projectsCount = 0, 
  submissionsCount = 0,
  isMobileOpen = false,
  onCloseMobile
}) {
  const [isPinned, setIsPinned] = useState(() => {
    try {
      const saved = localStorage.getItem('pe_sidebar_pinned');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, user, logout } = useAuth();

  const isExpanded = isPinned || isHovered;
  const currentPath = location.pathname;

  // Active state detection
  const isAdminProjectsActive = currentPath.startsWith('/admin/projects') || (currentPath === '/' && isAdmin);
  const isAdminSubmissionsActive = currentPath.startsWith('/admin/submissions');

  const isLearnerProjectsActive = currentPath.startsWith('/learner/browse') || currentPath.startsWith('/learner/projects') || (currentPath === '/' && !isAdmin);
  const isLearnerSubmissionsActive = currentPath.startsWith('/learner/submissions') || (!isAdmin && currentPath.startsWith('/evaluations'));

  const handlePin = (e) => {
    if (e) e.stopPropagation();
    setIsPinned(true);
    setIsHovered(false);
    try {
      localStorage.setItem('pe_sidebar_pinned', 'true');
    } catch {}
  };

  const handleUnpin = (e) => {
    if (e) e.stopPropagation();
    setIsPinned(false);
    setIsHovered(false);
    try {
      localStorage.setItem('pe_sidebar_pinned', 'false');
    } catch {}
  };

  const handleNav = (path) => {
    if (!isPinned) setIsHovered(false);
    if (onCloseMobile) onCloseMobile();
    navigate(path);
  };

  const homePath = isAdmin ? '/admin/projects' : '/learner/browse';

  return (
    <>
      <div 
        className="sidebar-container-slot"
      style={{
        width: isPinned ? '280px' : '76px',
        minWidth: isPinned ? '280px' : '76px',
        transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <aside 
        className={`sidebar ${!isPinned ? 'collapsed' : ''} ${!isPinned && isHovered ? 'hovered' : ''}`}
        onMouseEnter={() => {
          if (!isPinned) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (!isPinned) setIsHovered(false);
        }}
        style={{
          width: isExpanded ? '280px' : '76px',
          minWidth: isExpanded ? '280px' : '76px',
          position: !isPinned && isHovered ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          height: '100vh',
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          boxShadow: !isPinned && isHovered ? '0 10px 30px rgba(15, 23, 42, 0.16)' : 'none',
          transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
          zIndex: 50
        }}
      >
        {/* Brand & Pin Header */}
        <div 
          className="sidebar-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isExpanded ? 'space-between' : 'center',
            padding: isExpanded ? '1.25rem 1.15rem' : '1.25rem 0.5rem',
            borderBottom: '1px solid var(--color-border-light)',
            gap: '0.5rem'
          }}
        >
          {isExpanded ? (
            <>
              <div 
                style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => handleNav(homePath)}
                title="Project Evaluator"
              >
                <div className="brand-title" style={{ whiteSpace: 'nowrap', fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
                  Project Evaluator
                </div>
              </div>

              {!isPinned ? (
                <button
                  type="button"
                  onClick={handlePin}
                  className="sidebar-collapse-btn"
                  title="Pin sidebar open"
                  aria-label="Pin sidebar open"
                  style={{
                    backgroundColor: 'var(--color-primary-light)',
                    borderColor: 'var(--color-primary-border)',
                    color: 'var(--color-primary-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0 0.5rem',
                    width: 'auto',
                    height: '26px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  <IconPin size={13} />
                  <span>Pin</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUnpin}
                  className="sidebar-collapse-btn"
                  title="Collapse sidebar (hover to expand)"
                  aria-label="Collapse sidebar"
                >
                  <IconChevronLeft size={16} />
                </button>
              )}
            </>
          ) : (
            <div 
              title="Project Evaluator (Click to pin open)"
              onClick={handlePin}
              style={{ 
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.85rem',
                letterSpacing: '0.04em',
                color: 'var(--color-text-main)',
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border-light)',
                borderRadius: 'var(--radius-md)',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none'
              }}
            >
              PE
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="sidebar-nav" style={{ flex: 1, padding: isExpanded ? '1.25rem 0.75rem' : '1rem 0.45rem' }}>
          <ul className="nav-list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {isAdmin ? (
              /* =======================================
               * ADMIN SIDEBAR: Exactly 2 Menu Items
               * ======================================= */
              <>
                <li>
                  <button
                    type="button"
                    className={`nav-item-btn ${isAdminProjectsActive ? 'active' : ''}`}
                    onClick={() => handleNav('/admin/projects')}
                    id="nav-admin-projects"
                    title="Evaluation Projects"
                    style={{
                      justifyContent: isExpanded ? 'flex-start' : 'center',
                      padding: isExpanded ? '0.625rem 0.75rem' : '0.65rem 0',
                      width: '100%'
                    }}
                  >
                    <span className="nav-icon">
                      <IconFolder size={18} />
                    </span>
                    {isExpanded && (
                      <span style={{ whiteSpace: 'nowrap' }}>Projects</span>
                    )}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`nav-item-btn ${isAdminSubmissionsActive ? 'active' : ''}`}
                    onClick={() => handleNav('/admin/submissions')}
                    id="nav-admin-submissions"
                    title={`Student Submissions (${submissionsCount})`}
                    style={{
                      justifyContent: isExpanded ? 'flex-start' : 'center',
                      padding: isExpanded ? '0.625rem 0.75rem' : '0.65rem 0',
                      width: '100%'
                    }}
                  >
                    <span className="nav-icon">
                      <IconFileCheck size={18} />
                    </span>
                    {isExpanded && (
                      <span style={{ whiteSpace: 'nowrap' }}>Submissions</span>
                    )}
                  </button>
                </li>
              </>
            ) : (
              /* =======================================
               * LEARNER SIDEBAR: Clean 2 Menu Items
               * ======================================= */
              <>
                <li>
                  <button
                    type="button"
                    className={`nav-item-btn ${isLearnerProjectsActive ? 'active' : ''}`}
                    onClick={() => handleNav('/learner/browse')}
                    id="nav-learner-browse"
                    title="Projects"
                    style={{
                      justifyContent: isExpanded ? 'flex-start' : 'center',
                      padding: isExpanded ? '0.625rem 0.75rem' : '0.65rem 0',
                      width: '100%'
                    }}
                  >
                    <span className="nav-icon">
                      <IconFolder size={18} />
                    </span>
                    {isExpanded && (
                      <span style={{ whiteSpace: 'nowrap' }}>Projects</span>
                    )}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`nav-item-btn ${isLearnerSubmissionsActive ? 'active' : ''}`}
                    onClick={() => handleNav('/learner/submissions')}
                    id="nav-learner-submissions"
                    title={`Submissions (${submissionsCount})`}
                    style={{
                      justifyContent: isExpanded ? 'flex-start' : 'center',
                      padding: isExpanded ? '0.625rem 0.75rem' : '0.65rem 0',
                      width: '100%'
                    }}
                  >
                    <span className="nav-icon">
                      <IconFileCheck size={18} />
                    </span>
                    {isExpanded && (
                      <span style={{ whiteSpace: 'nowrap' }}>Submissions</span>
                    )}
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>

      </aside>
    </div>

    {/* Mobile Off-Canvas Drawer Backdrop */}
    <div 
      className={`mobile-sidebar-overlay ${isMobileOpen ? 'open' : ''}`}
      onClick={onCloseMobile}
      aria-hidden={!isMobileOpen}
    />

    {/* Mobile Off-Canvas Drawer */}
    <aside 
      className={`mobile-sidebar-drawer ${isMobileOpen ? 'open' : ''}`}
      aria-label="Mobile navigation"
    >
      <div 
        className="sidebar-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.15rem 1rem',
          borderBottom: '1px solid var(--color-border-light)'
        }}
      >
        <div 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => handleNav(homePath)}
        >
          <div className="brand-title" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
            Project Evaluator
          </div>
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          style={{ width: '30px', height: '30px' }}
        >
          <IconClose size={18} />
        </button>
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, padding: '1rem 0.75rem' }}>
        <ul className="nav-list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {isAdmin ? (
            <>
              <li>
                <button
                  type="button"
                  className={`nav-item-btn ${isAdminProjectsActive ? 'active' : ''}`}
                  onClick={() => handleNav('/admin/projects')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <span className="nav-icon">
                    <IconFolder size={18} />
                  </span>
                  <span>Projects</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-btn ${isAdminSubmissionsActive ? 'active' : ''}`}
                  onClick={() => handleNav('/admin/submissions')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <span className="nav-icon">
                    <IconFileCheck size={18} />
                  </span>
                  <span>Submissions ({submissionsCount})</span>
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <button
                  type="button"
                  className={`nav-item-btn ${isLearnerProjectsActive ? 'active' : ''}`}
                  onClick={() => handleNav('/learner/browse')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <span className="nav-icon">
                    <IconFolder size={18} />
                  </span>
                  <span>Projects</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-btn ${isLearnerSubmissionsActive ? 'active' : ''}`}
                  onClick={() => handleNav('/learner/submissions')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <span className="nav-icon">
                    <IconFileCheck size={18} />
                  </span>
                  <span>Submissions ({submissionsCount})</span>
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Mobile Drawer User Footer */}
      {user && (
        <div style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid var(--color-border-light)',
          backgroundColor: 'var(--color-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: user.role === 'admin' ? 'var(--color-primary)' : '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              flexShrink: 0
            }}>
              {(user.name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: user.role === 'admin' ? 'var(--color-primary)' : '#0284c7', textTransform: 'capitalize' }}>
                {user.role}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              logout();
              navigate('/login');
            }}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
          >
            Logout
          </button>
        </div>
      )}
    </aside>
  </>
  );
}

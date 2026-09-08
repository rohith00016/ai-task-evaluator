import { useLocation } from 'react-router-dom';
import { IconPlus } from './Icons';

export default function Header({ onOpenCreateModal }) {
  const location = useLocation();

  const isAdmin = location.pathname.startsWith('/admin');

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

  return (
    <header className="top-header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div className="header-breadcrumbs" style={{ display: 'flex', alignItems: 'center' }}>
          {getBreadcrumb()}
        </div>
        <span className={`role-pill ${isAdmin ? 'admin' : 'learner'}`}>
          {isAdmin ? 'Instructor Admin' : 'Learner Portal'}
        </span>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenCreateModal}
            id="btn-header-create-project"
            style={{ fontWeight: 700, padding: '0.45rem 1rem' }}
          >
            <IconPlus size={15} />
            <span>New Project</span>
          </button>
        )}
      </div>
    </header>
  );
}

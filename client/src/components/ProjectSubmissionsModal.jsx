import { IconClose, IconGithub, IconFileCheck, IconArrowRight } from './Icons';

export default function ProjectSubmissionsModal({ 
  isOpen, 
  onClose, 
  project, 
  submissions, 
  onViewEvaluation 
}) {
  if (!isOpen || !project) return null;

  const projectSubmissions = submissions.filter((s) => s.projectId === project.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              Learner Submissions: {project.title}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {projectSubmissions.length} submission(s) logged for this project
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '4px', border: 'none' }}>
            <IconClose size={18} />
          </button>
        </div>

        <div className="modal-body">
          {projectSubmissions.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Repository Link</th>
                    <th>Branch</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th style={{ textAlign: 'right' }}>Scorecard</th>
                  </tr>
                </thead>
                <tbody>
                  {projectSubmissions.map((sub) => {
                    const isPassed = sub.score >= 75;
                    return (
                      <tr key={sub.id}>
                        <td>
                          <a 
                            href={sub.repoUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.35rem', 
                              color: 'var(--color-primary)', 
                              textDecoration: 'none',
                              fontSize: '0.8125rem',
                              fontFamily: "'Plus Jakarta Sans', sans-serif"
                            }}
                          >
                            <IconGithub size={13} />
                            <span>{sub.repoUrl.replace('https://github.com/', '')}</span>
                          </a>
                        </td>
                        <td style={{ fontSize: '0.78rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {sub.branch || 'main'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </td>
                        <td>
                          <span 
                            style={{
                              fontWeight: 800,
                              color: isPassed ? 'var(--color-primary)' : 'var(--color-warning)'
                            }}
                          >
                            {sub.score}/100
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                            onClick={() => {
                              onClose();
                              onViewEvaluation(sub);
                            }}
                          >
                            <span>Inspect</span>
                            <IconArrowRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <IconFileCheck size={24} />
              </div>
              <h3>No student submissions</h3>
              <p>No learners have submitted a repository for this project yet.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

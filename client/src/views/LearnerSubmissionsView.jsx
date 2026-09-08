import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IconFileCheck, 
  IconSparkles, 
  IconSearch, 
  IconGithub, 
  IconArrowRight,
  IconCheck
} from '../components/Icons';
import { useSubmissions } from '../hooks/useSubmissionsQuery';

export default function LearnerSubmissionsView({ 
  submissions: propSubmissions, 
  onViewEvaluation, 
  onSelectProjectById 
}) {
  const navigate = useNavigate();
  const { data: hookSubmissions = [] } = useSubmissions();
  const submissions = propSubmissions !== undefined ? propSubmissions : hookSubmissions;

  const handleView = onViewEvaluation || ((sub) => navigate(`/evaluations/${sub.id || sub._id}`));
  const handleSelectProj = onSelectProjectById || ((projId) => navigate(`/learner/projects/${projId}`));

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const totalSubmissions = submissions.length;
  const avgScore = totalSubmissions > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.score || 0), 0) / totalSubmissions) 
    : 0;
  const passedCount = submissions.filter((s) => (s.score || 0) >= 75).length;

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch = s.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.repoUrl.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>My Submissions</h1>
          <p className="dashboard-description">
            Track evaluation history, examine detailed performance scorecards, and re-submit corrected repositories.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-content">
            <h3>Total Submissions</h3>
            <div className="metric-value">{totalSubmissions}</div>
          </div>
          <div className="metric-icon-wrap">
            <IconFileCheck size={22} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-content">
            <h3>Average Score</h3>
            <div className="metric-value" style={{ color: avgScore >= 75 ? 'var(--color-primary)' : 'var(--color-text-main)' }}>
              {avgScore} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>/ 100</span>
            </div>
          </div>
          <div className="metric-icon-wrap">
            <IconSparkles size={22} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-content">
            <h3>Passed Projects</h3>
            <div className="metric-value" style={{ color: 'var(--color-primary)' }}>
              {passedCount}
            </div>
          </div>
          <div className="metric-icon-wrap">
            <IconCheck size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="browse-filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'passed', 'review'].map((status) => (
            <button
              key={status}
              type="button"
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(status)}
              style={{ textTransform: 'capitalize', fontSize: '0.8125rem' }}
            >
              {status === 'all' ? 'All Submissions' : status}
            </button>
          ))}
        </div>

        <div className="browse-search-box">
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
            <IconSearch size={15} />
          </span>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '32px', fontSize: '0.84rem' }}
            placeholder="Search by project or repo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Submissions Table */}
      {filteredSubmissions.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Repository Link</th>
                <th>Submitted Date</th>
                <th>Score</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((sub) => {
                const isPassed = sub.score >= 75;
                const isReview = sub.score >= 50 && sub.score < 75;

                return (
                  <tr key={sub.id}>
                    <td style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                      <span 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSelectProj(sub.projectId)}
                        title="Click to view project details"
                      >
                        {sub.projectTitle}
                      </span>
                    </td>
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
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <span 
                        style={{
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          color: isPassed ? 'var(--color-primary)' : isReview ? 'var(--color-warning)' : 'var(--color-danger)'
                        }}
                      >
                        {sub.score}
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>/100</span>
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${isPassed ? 'passed' : isReview ? 'review' : 'failed'}`}>
                        {isPassed ? 'Passed' : isReview ? 'Review' : 'Failed'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleView(sub)}
                        style={{ fontSize: '0.78rem' }}
                      >
                        <span>View Evaluation</span>
                        <IconArrowRight size={13} />
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
          <h3>No submissions recorded</h3>
          <p>Browse through available capstone projects and submit a repository to see AI grading here.</p>
        </div>
      )}
    </div>
  );
}

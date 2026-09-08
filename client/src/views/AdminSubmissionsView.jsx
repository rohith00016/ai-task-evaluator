import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IconFileCheck, 
  IconSparkles, 
  IconSearch, 
  IconGithub, 
  IconArrowRight,
  IconCheck,
  IconFolder
} from '../components/Icons';
import { useSubmissions, useReevaluateMutation } from '../hooks/useSubmissionsQuery';
import { useProjects } from '../hooks/useProjectsQuery';
import { useToast } from '../context/UIContext';

export default function AdminSubmissionsView({ 
  submissions: propSubmissions, 
  projects: propProjects,
  onViewEvaluation, 
  onReevaluate,
  onSelectProjectById 
}) {
  const navigate = useNavigate();

  // Autonomous React Query state
  const { data: hookSubmissions = [] } = useSubmissions();
  const { data: hookProjects = [] } = useProjects();
  const reevaluateMutation = useReevaluateMutation();
  const { showToast } = useToast();

  const submissions = propSubmissions !== undefined ? propSubmissions : hookSubmissions;
  const projects = propProjects !== undefined ? propProjects : hookProjects;

  const handleView = onViewEvaluation || ((sub) => navigate(`/evaluations/${sub.id || sub._id}`));
  const handleSelectProj = onSelectProjectById || ((projId) => navigate(`/learner/projects/${projId}`));

  const triggerReevaluate = onReevaluate || (async (sub) => {
    try {
      const updated = await reevaluateMutation.mutateAsync(sub.id || sub._id);
      showToast(`Re-evaluation completed! New Score: ${updated.score}/100`);
    } catch (err) {
      console.error('Re-evaluation failed:', err);
      showToast(err.message || 'Re-evaluation failed', 'error');
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [reevaluatingId, setReevaluatingId] = useState(null);

  const totalSubmissions = submissions.length;
  const avgScore = totalSubmissions > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.score || 0), 0) / totalSubmissions) 
    : 0;
  const passedCount = submissions.filter((s) => (s.score || 0) >= 75).length;
  const reviewCount = submissions.filter((s) => (s.score || 0) >= 50 && (s.score || 0) < 75).length;

  const filteredSubmissions = submissions.filter((s) => {
    const studentName = (s.userName || '').toLowerCase();
    const studentEmail = (s.userEmail || '').toLowerCase();
    const projectTitle = (s.projectTitle || '').toLowerCase();
    const repo = (s.repoUrl || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = studentName.includes(term) ||
      studentEmail.includes(term) ||
      projectTitle.includes(term) ||
      repo.includes(term);

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesProject = selectedProjectId === 'all' || s.projectId === selectedProjectId;

    return matchesSearch && matchesStatus && matchesProject;
  });

  const handleTriggerReevaluate = async (e, sub) => {
    e.stopPropagation();
    setReevaluatingId(sub.id || sub._id);
    try {
      await triggerReevaluate(sub);
    } finally {
      setReevaluatingId(null);
    }
  };

  return (
    <div>
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>Student Submissions</h1>
          <p className="dashboard-description">
            Monitor and audit all learner code submissions across your organization. Review AI evaluation rubrics, inspected source files, and trigger instant re-evaluations.
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

        <div className="metric-card">
          <div className="metric-content">
            <h3>Requires Review</h3>
            <div className="metric-value" style={{ color: reviewCount > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
              {reviewCount}
            </div>
          </div>
          <div className="metric-icon-wrap">
            <IconFolder size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}
      >
        {/* Status Filters & Project Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {['all', 'passed', 'review', 'failed'].map((status) => (
              <button
                key={status}
                type="button"
                className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(status)}
                style={{ textTransform: 'capitalize', fontSize: '0.8125rem' }}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>

          {/* Project Dropdown Filter */}
          {projects.length > 0 && (
            <select
              className="form-input"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface)',
                cursor: 'pointer',
                maxWidth: '220px'
              }}
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '300px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
            <IconSearch size={15} />
          </span>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '32px', fontSize: '0.84rem' }}
            placeholder="Search by student, email, project, repo..."
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
                <th>Learner</th>
                <th>Project</th>
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
                const isSubReevaluating = reevaluatingId === (sub.id || sub._id);

                return (
                  <tr key={sub.id || sub._id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                          {sub.userName || 'Learner'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {sub.userEmail || '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
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
                      {new Date(sub.submittedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
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
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        {onReevaluate && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => handleTriggerReevaluate(e, sub)}
                            disabled={isSubReevaluating}
                            title="Re-run AI code evaluation with Gemini"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.55rem' }}
                          >
                            <IconSparkles size={12} />
                            <span>{isSubReevaluating ? 'Evaluating...' : 'Re-evaluate'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleView(sub)}
                          style={{ fontSize: '0.78rem' }}
                        >
                          <span>View</span>
                          <IconArrowRight size={13} />
                        </button>
                      </div>
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
          <h3>No student submissions match</h3>
          <p>
            {searchTerm || statusFilter !== 'all' || selectedProjectId !== 'all'
              ? 'No submissions match your active filter criteria. Try resetting search or filters.'
              : 'No student has submitted code for evaluation yet. Submissions will automatically appear here.'}
          </p>
        </div>
      )}
    </div>
  );
}

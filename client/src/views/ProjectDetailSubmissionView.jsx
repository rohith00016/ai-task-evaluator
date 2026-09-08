import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  IconSparkles, 
  IconFileCheck,
  IconBookOpen,
  IconCheck,
  IconCopy,
  IconGithub
} from '../components/Icons';

import MarkdownViewer from '../components/MarkdownViewer';
import { getProjectPRDMarkdown, fetchProjectById } from '../services/api';

export default function ProjectDetailSubmissionView({ 
  project: propProject, 
  projects = [],
  onBack, 
  onSubmitRepo, 
  submissions = [], 
  onViewEvaluation 
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [fetchedProject, setFetchedProject] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check if project exists in passed props for instant rendering
  const matchingProp = (propProject && (propProject.id === id || propProject._id === id))
    ? propProject
    : projects.find((p) => p.id === id || p._id === id);

  useEffect(() => {
    // Reset form states on id change
    setRepoUrl('');
    setNotes('');
    setSubmissionError(null);

    if (!id) return;

    let isMounted = true;

    // If not in cache/props, show loading indicator
    if (!matchingProp) {
      setLoading(true);
    }

    // Always fetch latest project document from MongoDB
    fetchProjectById(id)
      .then((data) => {
        if (isMounted && data) {
          setFetchedProject(data);
        }
      })
      .catch((err) => {
        console.error('Error fetching latest project details:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const project = fetchedProject || matchingProp;
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/learner/browse');
    }
  };
  const handleViewEvaluation = onViewEvaluation || ((sub) => navigate(`/evaluations/${sub.id || sub._id}`));

  const [activeSubTab, setActiveSubTab] = useState('docs'); // 'docs' | 'requirements' | 'rubric'
  const [repoUrl, setRepoUrl] = useState('');
  const branch = 'main';
  const [notes, setNotes] = useState('');
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="eval-card" style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
        <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="empty-state" style={{ marginTop: '2rem' }}>
        <h3>Project not found</h3>
        <p>The requested evaluation project could not be located.</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleBack}>
          ← Back to Browse Projects
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmissionError(null);
    if (!repoUrl.trim()) {
      setSubmissionError({
        message: 'Please enter a valid GitHub repository URL.',
        hint: 'Example: https://github.com/username/repository-name'
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmitRepo({
        projectId: project.id,
        projectTitle: project.title,
        repoUrl: repoUrl.trim(),
        branch: 'main',
        notes: notes.trim()
      });
    } catch (err) {
      setSubmissionError({
        message: err.message || 'Repository could not be evaluated. Please verify the GitHub URL.',
        hint: err.hint || (err.errorType === 'REPO_NOT_FOUND_OR_PRIVATE'
          ? 'GitHub requires repositories to be set to Public for automated code grading. Check repository visibility in GitHub Settings > Danger Zone.'
          : 'Please ensure the repository is public and the specified branch exists on GitHub.')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const prdMarkdown = getProjectPRDMarkdown(project);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(prdMarkdown);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  return (
    <div>
      {/* Top Nav & Breadcrumbs */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={handleBack}
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '0.75rem' }}
        >
          ← Back to Projects
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800 }}>{project.title}</h1>
            <span 
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: 'var(--color-surface-subtle)',
                color: 'var(--color-primary-hover)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-surface-subtle-border)'
              }}
            >
              {project.course || project.category || 'MERN'} Track
            </span>
            <span 
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)'
              }}
            >
              ✨ Full PRD Available
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopyMarkdown}
            id="btn-copy-prd-markdown"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <IconCopy size={13} />
            <span>{copiedDoc ? '✓ Copied PRD!' : 'Copy PRD Markdown'}</span>
          </button>
        </div>

        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginTop: '0.35rem', maxWidth: '850px', lineHeight: 1.5 }}>
          {project.description}
        </p>
      </div>

      {/* Main Grid: Left Documentation View vs Right Submission Form */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.85fr) minmax(320px, 1fr)', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* Left Column: PRD Documentation As It Is */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Documentation / Deliverables Nav Tabs */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--color-border)', 
              paddingBottom: '0.5rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${activeSubTab === 'docs' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveSubTab('docs')}
                id="tab-project-docs"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <IconBookOpen size={15} />
                <span>PRD Documentation</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${activeSubTab === 'requirements' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveSubTab('requirements')}
                id="tab-project-requirements"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <IconCheck size={14} />
                <span>Deliverables ({project.requirements?.length || 0})</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${activeSubTab === 'rubric' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveSubTab('rubric')}
                id="tab-project-rubric"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <IconFileCheck size={14} />
                <span>Evaluation Rubric ({project.criteria?.length || 0})</span>
              </button>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {activeSubTab === 'docs' ? '📖 Complete Technical Requirements Document' : activeSubTab === 'requirements' ? '✓ Implementation Deliverables' : '⚖️ Grading Pillars & Score Weights'}
            </div>
          </div>

          {/* TAB 1: PRD DOCUMENTATION "AS IT IS" */}
          {activeSubTab === 'docs' && (
            <div 
              className="card" 
              style={{ 
                padding: '2rem 2.25rem', 
                backgroundColor: '#ffffff',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {/* Document Banner */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  paddingBottom: '1.25rem', 
                  marginBottom: '1.5rem', 
                  borderBottom: '1px solid var(--color-border-light)',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div 
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: 'var(--radius-md)', 
                      backgroundColor: 'var(--color-surface-subtle)', 
                      color: 'var(--color-primary-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <IconBookOpen size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                      Project Requirement Document
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Official Specification for Engineering Capstone
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Reading time: ~4 min
                  </span>
                </div>
              </div>

              {/* Rendered PRD Markdown as it is */}
              <MarkdownViewer content={prdMarkdown} />
            </div>
          )}

          {/* TAB 2: REQUIREMENTS / DELIVERABLES CHECKLIST */}
          {activeSubTab === 'requirements' && (
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                    Deliverables Checklist ({project.requirements?.length || 0})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Mandatory features and architectural milestones required for project completion.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {project.requirements?.map((req, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.85rem 1.15rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.875rem',
                      lineHeight: 1.5
                    }}
                  >
                    <span 
                      style={{ 
                        color: 'var(--color-primary)', 
                        fontWeight: 800, 
                        minWidth: '26px',
                        backgroundColor: 'var(--color-surface-subtle)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        textAlign: 'center'
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <span style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{req}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EVALUATION CRITERIA RUBRIC */}
          {activeSubTab === 'rubric' && (
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                    Evaluation Scoring Rubric ({project.criteria?.length || 0} Pillars)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Automated AI grading evaluates your repository against these customized pillars totaling {project.criteria?.reduce((s, c) => s + (Number(c.maxScore) || 0), 0) || 100} points.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {project.criteria && project.criteria.length > 0 ? (
                  project.criteria.map((crit, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        padding: '0.85rem 1.15rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.875rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span 
                          style={{ 
                            color: 'var(--color-primary)', 
                            fontWeight: 800, 
                            minWidth: '26px',
                            backgroundColor: 'var(--color-surface-subtle)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            textAlign: 'center'
                          }}
                        >
                          #{idx + 1}
                        </span>
                        <span style={{ color: 'var(--color-text-main)', fontWeight: 700 }}>{crit.name}</span>
                      </div>

                      <span 
                        style={{ 
                          fontSize: '0.78rem', 
                          fontWeight: 800, 
                          color: '#15803d', 
                          backgroundColor: '#dcfce7', 
                          padding: '3px 10px', 
                          borderRadius: '9999px',
                          border: '1px solid #bbf7d0'
                        }}
                      >
                        {crit.maxScore} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Standard 4-pillar evaluation rubric (Architecture, Deliverables, Code Quality, Documentation).
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Submission Form & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '80px' }}>
          
          <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                <IconGithub size={18} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  Submit Repository
                </h3>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                Gemini 2.5 Flash will evaluate your repository against the PRD requirements and provide scorecard feedback.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="repo-url">GitHub Repository URL *</label>
                <input
                  id="repo-url"
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/your-username/repository"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    if (submissionError) setSubmissionError(null);
                  }}
                  required
                  style={{ width: '100%' }}
                />
                <span className="form-helper">
                  Public repo with code in main or default branch.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="repo-branch">Branch to Evaluate</label>
                <input
                  id="repo-branch"
                  type="text"
                  className="form-input"
                  value="main"
                  disabled
                  readOnly
                  style={{
                    backgroundColor: 'var(--color-surface-subtle)',
                    cursor: 'not-allowed',
                    color: 'var(--color-text-muted)',
                    opacity: 0.85
                  }}
                />
                <span className="form-helper">
                  Evaluation branch is locked to <code>main</code>.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="submission-notes">Submission Notes (Optional)</label>
                <textarea
                  id="submission-notes"
                  rows={2}
                  className="form-textarea"
                  placeholder="Notes on architecture or setup instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Dedicated Inline Validation Error Banner */}
              {submissionError && (
                <div 
                  style={{
                    marginBottom: '1rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '0.825rem',
                    lineHeight: 1.45
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                        Repository Inaccessible or Invalid
                      </strong>
                      <span>{submissionError.message}</span>
                    </div>
                  </div>
                  {submissionError.hint && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #fca5a5', fontSize: '0.78rem', color: '#b91c1c' }}>
                      💡 {submissionError.hint}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '0.5rem' }}
                id="btn-submit-eval"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner" style={{ width: '14px', height: '14px', borderTopColor: '#ffffff' }}></span>
                    <span>Validating Repository...</span>
                  </>
                ) : (
                  <>
                    <IconSparkles size={18} />
                    <span>Submit for Evaluation</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

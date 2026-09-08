import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconSparkles,
  IconFileCheck,
  IconBookOpen,
  IconCheck,
  IconGithub,
  IconClose
} from '../components/Icons';

import { useAuth } from '../context/AuthContext';
import { useSubmitEvaluationMutation } from '../hooks/useSubmissionsQuery';
import { useProject } from '../hooks/useProjectsQuery';
import { useUI, useToast } from '../context/UIContext';
import MarkdownViewer from '../components/MarkdownViewer';
import { getProjectPRDMarkdown } from '../services/api';

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
  const { isAdmin } = useAuth();
  const submitEvaluationMutation = useSubmitEvaluationMutation();
  const { startEvaluation, setEvalStage, setEvalProgress, stopEvaluation } = useUI();
  const { showToast } = useToast();

  // Check if project exists in passed props for instant rendering
  const matchingProp = (propProject && (propProject.id === id || propProject._id === id))
    ? propProject
    : projects.find((p) => p.id === id || p._id === id);

  // Authenticated React Query hook: loads project details by ID with caching & background revalidation
  const {
    data: fetchedProject,
    isLoading: isProjectLoading
  } = useProject(id, {
    initialData: matchingProp
  });

  const project = fetchedProject || matchingProp;
  const loading = isProjectLoading && !project;

  useEffect(() => {
    // Reset form states on id change
    setRepoUrl('');
    setNotes('');
    setSubmissionError(null);
  }, [id]);
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(isAdmin ? '/admin/projects' : '/learner/browse');
    }
  };
  const handleViewEvaluation = onViewEvaluation || ((sub) => navigate(`/evaluations/${sub.id || sub._id}`));

  const [activeSubTab, setActiveSubTab] = useState('docs'); // 'docs' | 'requirements' | 'rubric'
  const [repoUrl, setRepoUrl] = useState('');
  const branch = 'main';
  const [notes, setNotes] = useState('');
  const [submissionError, setSubmissionError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const handleOpenSubmitModal = () => {
    setSubmissionError(null);
    setIsSubmitModalOpen(true);
  };

  const handleCloseSubmitModal = () => {
    if (!isSubmitting) {
      setIsSubmitModalOpen(false);
      setSubmissionError(null);
    }
  };

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
          ← Back to Projects
        </button>
      </div>
    );
  }

  const handleDefaultSubmit = async (submissionData) => {
    setIsSubmitModalOpen(false);
    startEvaluation(submissionData.repoUrl);

    const timer1 = setTimeout(() => {
      setEvalProgress(45);
      setEvalStage({ stageIndex: 1, totalStages: 4, message: 'Unpacking source code files & analyzing architecture...', progressPercent: 45 });
    }, 1000);

    const timer2 = setTimeout(() => {
      setEvalProgress(75);
      setEvalStage({ stageIndex: 2, totalStages: 4, message: 'Inspecting code lines with Gemini 2.5 Flash against PRD...', progressPercent: 75 });
    }, 2200);

    try {
      const newSubmission = await submitEvaluationMutation.mutateAsync({
        projectId: project.id || project._id,
        repoUrl: submissionData.repoUrl,
        branch: submissionData.branch || 'main',
        notes: submissionData.notes || ''
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      setEvalProgress(100);
      setEvalStage({ stageIndex: 3, totalStages: 4, message: 'Evaluation completed! Saved to MongoDB.', progressPercent: 100 });
      await new Promise((r) => setTimeout(r, 500));

      stopEvaluation();
      navigate(`/evaluations/${newSubmission.id || newSubmission._id}`);
      showToast(`Evaluation completed! Overall Score: ${newSubmission.score}/100`);
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      stopEvaluation();
      setIsSubmitModalOpen(true);
      showToast(err.message || 'Evaluation failed. Please verify GitHub repo URL.', 'error');
      throw err;
    }
  };

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
      const submitFn = onSubmitRepo || handleDefaultSubmit;
      await submitFn({
        projectId: project.id || project._id,
        projectTitle: project.title,
        repoUrl: repoUrl.trim(),
        branch: 'main',
        notes: notes.trim()
      });
      setIsSubmitModalOpen(false);
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

        <div className="project-detail-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="project-detail-title" style={{ fontSize: '1.65rem', fontWeight: 800 }}>{project.title}</h1>
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
              {project.course || project.category || 'MERN'}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenSubmitModal}
              id="btn-open-submit-modal"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
            >
              <IconGithub size={15} />
              <span>{isAdmin ? 'Test Evaluation' : 'Submit Repository'}</span>
            </button>
          </div>
        </div>

        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginTop: '0.35rem', maxWidth: '850px', lineHeight: 1.5 }}>
          {project.description}
        </p>
      </div>

      {/* Documentation, Deliverables & Rubric Section */}
      <div className="project-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Documentation / Deliverables Nav Tabs */}
        <div className="project-detail-nav-bar" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div className="project-detail-tabs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            className="card prd-doc-card"
            style={{
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

            {/* Ready to Submit Banner CTA */}
            <div
              style={{
                marginTop: '2.5rem',
                padding: '1.25rem 1.5rem',
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text-main)', marginBottom: '2px' }}>
                  Ready to evaluate your repository against this PRD?
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Provide your public GitHub repository link for instant AI code grading and deliverables verification.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenSubmitModal}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
              >
                <IconGithub size={15} />
                <span>{isAdmin ? 'Test Evaluation' : 'Submit Repository'}</span>
              </button>
            </div>
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

            {/* Ready to Submit Banner CTA */}
            <div
              style={{
                marginTop: '2rem',
                padding: '1.25rem 1.5rem',
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text-main)', marginBottom: '2px' }}>
                  Finished your deliverables?
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Submit your GitHub repository to evaluate your implementation with Gemini 2.5 Flash.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenSubmitModal}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
              >
                <IconGithub size={15} />
                <span>{isAdmin ? 'Test Evaluation' : 'Submit Repository'}</span>
              </button>
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

            {/* Ready to Submit Banner CTA */}
            <div
              style={{
                marginTop: '2rem',
                padding: '1.25rem 1.5rem',
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text-main)', marginBottom: '2px' }}>
                  Ready for scoring?
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Submit your repository to generate a full evaluation scorecard across these pillars.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenSubmitModal}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
              >
                <IconGithub size={15} />
                <span>{isAdmin ? 'Test Evaluation' : 'Submit Repository'}</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Submit Repository Modal Dialog */}
      {isSubmitModalOpen && (
        <div className="modal-overlay" onClick={handleCloseSubmitModal} style={{ zIndex: 90 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px', width: '100%', overflow: 'hidden' }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-primary-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <IconGithub size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                    {isAdmin ? 'Test Project Evaluation' : 'Submit Repository for Evaluation'}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {project.title}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseSubmitModal}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px', borderRadius: 'var(--radius-md)', border: 'none' }}
                aria-label="Close modal"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  {isAdmin
                    ? 'Verify this project by evaluating a sample repository against the PRD rules with Gemini 2.5 Flash.'
                    : 'Gemini 2.5 Flash will evaluate your repository against the PRD requirements and provide scorecard feedback.'}
                </p>

                <div className="form-group" style={{ marginBottom: '1.15rem' }}>
                  <label className="form-label" htmlFor="modal-repo-url" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    GitHub Repository URL <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    id="modal-repo-url"
                    type="url"
                    className="form-input"
                    placeholder="https://github.com/your-username/repository"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      if (submissionError) setSubmissionError(null);
                    }}
                    required
                    autoFocus
                    style={{ width: '100%' }}
                  />
                  <span className="form-helper" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    Repository must be <strong>Public</strong> with code in the default branch.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '1.15rem' }}>
                  <label className="form-label" htmlFor="modal-repo-branch" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    Branch to Evaluate
                  </label>
                  <input
                    id="modal-repo-branch"
                    type="text"
                    className="form-input"
                    value="main"
                    disabled
                    readOnly
                    style={{
                      backgroundColor: 'var(--color-surface-subtle)',
                      cursor: 'not-allowed',
                      color: 'var(--color-text-muted)',
                      opacity: 0.85,
                      width: '100%'
                    }}
                  />
                  <span className="form-helper" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    Evaluation branch is locked to <code>main</code>.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '1.15rem' }}>
                  <label className="form-label" htmlFor="modal-submission-notes" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    Submission Notes (Optional)
                  </label>
                  <textarea
                    id="modal-submission-notes"
                    rows={2}
                    className="form-textarea"
                    placeholder="Notes on architecture, environment variables, or setup instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Dedicated Inline Validation Error Banner */}
                {submissionError && (
                  <div
                    style={{
                      marginBottom: '0.5rem',
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
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseSubmitModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  id="btn-submit-eval"
                  disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner" style={{ width: '14px', height: '14px', borderTopColor: '#ffffff' }}></span>
                      <span>Validating Repository...</span>
                    </>
                  ) : (
                    <>
                      <IconSparkles size={16} />
                      <span>{isAdmin ? 'Start Test Evaluation' : 'Submit for Evaluation'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

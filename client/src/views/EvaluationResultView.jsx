import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubmission, useReevaluateMutation } from '../hooks/useSubmissionsQuery';
import { useToast } from '../context/UIContext';
import {
  IconCopy,
  IconRefreshCw,
  IconGithub,
  IconSearch,
  IconExternalLink,
  IconCheck,
  IconFileCheck,
  IconCode
} from '../components/Icons';

export default function EvaluationResultView({
  submission: propSubmission,
  onBack,
  onReevaluate
}) {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const reevaluateMutation = useReevaluateMutation();
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState('scorecard'); // 'scorecard' | 'code'
  const [copied, setCopied] = useState(false);
  const [copiedFile, setCopiedFile] = useState(false);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [fileSearchQuery, setFileSearchQuery] = useState('');

  const isPropMatching = propSubmission && (propSubmission.id === submissionId || propSubmission._id === submissionId);

  // Authenticated React Query hook: loads submission by ID with Bearer token & caching
  const {
    data: querySubmission,
    isLoading: isQueryLoading,
    error: queryError
  } = useSubmission(submissionId, {
    initialData: isPropMatching ? propSubmission : undefined
  });

  const submission = querySubmission || (isPropMatching ? propSubmission : null);
  const loading = (isQueryLoading || reevaluateMutation.isPending) && !submission;
  const fetchError = queryError ? queryError.message : null;

  // Reset file explorer state when changing route submissionId
  useEffect(() => {
    setSelectedFileIdx(0);
    setFileSearchQuery('');
  }, [submissionId]);

  const handleBackAction = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(isAdmin ? '/admin/submissions' : '/learner/submissions');
    }
  };

  const handleReevaluateAction = async (sub) => {
    if (onReevaluate) {
      onReevaluate(sub);
      return;
    }
    const targetId = sub?.id || sub?._id || submissionId;
    if (!targetId) return;
    try {
      const updated = await reevaluateMutation.mutateAsync(targetId);
      showToast(`Re-evaluation completed! New Score: ${updated.score}/100`);
    } catch (err) {
      showToast(`Re-evaluation failed: ${err.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="eval-card" style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
        <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Loading evaluation result...</p>
      </div>
    );
  }

  if (fetchError || !submission || !submission.evaluation) {
    return (
      <div className="eval-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h3>No evaluation record found</h3>
        {fetchError && <p style={{ color: 'var(--color-danger)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{fetchError}</p>}
        <button type="button" className="btn btn-primary" onClick={handleBackAction} style={{ marginTop: '1rem' }}>
          ← Back to Submissions
        </button>
      </div>
    );
  }

  const { evaluation } = submission;
  const score = evaluation.score || submission.score || 0;
  const maxScore = evaluation.maxScore || 100;
  const scrapedFiles = evaluation.scrapedFiles || [];

  const handleCopyFeedback = () => {
    const feedbackText = `=== AI Evaluation Feedback for ${submission.projectTitle} ===
Score: ${score} / ${maxScore}

## Completed
${evaluation.completed?.map((c) => `✓ ${c}`).join('\n')}

## Missing
${evaluation.missing?.map((m) => `• ${m}`).join('\n')}

## Issues
${evaluation.issues?.map((i) => `• ${typeof i === 'string' ? i : `${i.title} (${i.location}) - ${i.suggestion}`}`).join('\n')}
`;
    navigator.clipboard.writeText(feedbackText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJumpToFile = (location) => {
    if (!location || scrapedFiles.length === 0) {
      setActiveSubTab('code');
      return;
    }

    const cleanPath = location.split(':')[0].trim().toLowerCase();
    const filename = cleanPath.split('/').pop();

    let matchIdx = scrapedFiles.findIndex((f) => f.path.toLowerCase() === cleanPath);
    if (matchIdx === -1) {
      matchIdx = scrapedFiles.findIndex((f) => f.path.toLowerCase().endsWith(cleanPath) || cleanPath.endsWith(f.path.toLowerCase()));
    }
    if (matchIdx === -1) {
      matchIdx = scrapedFiles.findIndex((f) => f.path.toLowerCase().endsWith(filename));
    }

    if (matchIdx !== -1) {
      setSelectedFileIdx(matchIdx);
    }
    setActiveSubTab('code');
  };

  const filteredFiles = scrapedFiles.filter((f) =>
    f.path.toLowerCase().includes(fileSearchQuery.toLowerCase().trim())
  );

  const activeFile = scrapedFiles[selectedFileIdx] || filteredFiles[0] || scrapedFiles[0];

  return (
    <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          type="button"
          onClick={handleBackAction}
          className="btn btn-secondary btn-sm"
          id="btn-back-to-submissions"
        >
          ← Back to Submissions
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopyFeedback}
            id="btn-copy-feedback"
          >
            <IconCopy size={14} />
            <span>{copied ? 'Copied Feedback!' : 'Copy Feedback'}</span>
          </button>
        </div>
      </div>

      {/* Top Level View Subtabs Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          borderBottom: '2px solid var(--color-border)',
          paddingBottom: '0.1rem'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('scorecard')}
          id="tab-btn-scorecard"
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            backgroundColor: activeSubTab === 'scorecard' ? 'var(--color-surface)' : 'transparent',
            color: activeSubTab === 'scorecard' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeSubTab === 'scorecard' ? 700 : 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            borderBottom: activeSubTab === 'scorecard' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            marginBottom: '-2.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'var(--transition-fast)'
          }}
        >
          <IconFileCheck size={16} />
          <span>Evaluation Scorecard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('code')}
          id="tab-btn-code"
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: 'none',
            backgroundColor: activeSubTab === 'code' ? 'var(--color-surface)' : 'transparent',
            color: activeSubTab === 'code' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeSubTab === 'code' ? 700 : 600,
            fontSize: '0.92rem',
            cursor: 'pointer',
            borderBottom: activeSubTab === 'code' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            marginBottom: '-2.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'var(--transition-fast)'
          }}
        >
          <IconCode size={16} />
          <span>Scraped Codebase</span>
          <span
            style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: activeSubTab === 'code' ? 'var(--color-surface-subtle)' : '#e2e8f0',
              color: activeSubTab === 'code' ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
              fontWeight: 700
            }}
          >
            {scrapedFiles.length} files
          </span>
        </button>
      </div>

      {/* TAB 1: Evaluation Scorecard */}
      {activeSubTab === 'scorecard' && (
        <div className="eval-layout-grid">
          {/* LEFT COLUMN: Summary, Score & Criteria Breakdown */}
          <div className="eval-left-col">
            {/* Score & Meta Card */}
            <div className="eval-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                  Evaluation Summary
                </span>
                <span className={`status-pill ${score >= 75 ? 'passed' : score >= 50 ? 'review' : 'failed'}`}>
                  {score >= 75 ? 'Passed Evaluation' : score >= 50 ? 'Review Required' : 'Needs Rework'}
                </span>
              </div>

              {/* Visual Score Display */}
              <div className="score-highlight-container" style={{ margin: '0.5rem 0 1.25rem 0', padding: '1.5rem 1rem' }}>
                <div className="score-number" style={{ fontSize: '3.5rem' }}>{score}</div>
                <div className="score-max">/ {maxScore}</div>
                <div className="score-label">Overall Performance Score</div>
              </div>

              {/* Project & Repo Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--color-border-light)', paddingTop: '1rem', fontSize: '0.82rem' }}>
                <div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Project</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text-main)', marginTop: '2px', fontSize: '0.9rem' }}>{submission.projectTitle}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Repository</div>
                  <a
                    href={submission.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--color-primary)',
                      textDecoration: 'none',
                      fontWeight: 600,
                      marginTop: '2px',
                      wordBreak: 'break-all'
                    }}
                  >
                    <IconGithub size={14} />
                    <span>{submission.repoUrl.replace('https://github.com/', '')}</span>
                    <IconExternalLink size={11} />
                  </a>
                </div>

                <div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Evaluated At</div>
                  <div style={{ color: 'var(--color-text-main)', marginTop: '2px' }}>
                    {new Date(submission.submittedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border-light)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleReevaluateAction(submission)}
                  id="btn-reevaluate"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <IconRefreshCw size={15} />
                  <span>{loading ? 'Evaluating...' : 'Re-evaluate Repository'}</span>
                </button>

                {scrapedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('code')}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    View Codebase ({scrapedFiles.length} files) →
                  </button>
                )}
              </div>
            </div>

            {/* Criteria Breakdown Card */}
            {evaluation.criteriaBreakdown && evaluation.criteriaBreakdown.length > 0 && (
              <div className="eval-card" style={{ padding: '1.5rem' }}>
                <h3 className="criteria-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Criteria Breakdown</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {evaluation.criteriaBreakdown.length} pillars
                  </span>
                </h3>
                <div className="criteria-bar-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {evaluation.criteriaBreakdown.map((crit, idx) => {
                    const pct = Math.min(100, Math.round((crit.score / crit.maxScore) * 100));
                    return (
                      <div key={idx} className="criteria-bar-item">
                        <div className="criteria-bar-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                          <span style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{crit.name}</span>
                          <span style={{ color: 'var(--color-primary-hover)', fontWeight: 700 }}>
                            {crit.score}/{crit.maxScore} ({pct}%)
                          </span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Comprehensive AI Evaluation Feedback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Executive AI Summary Box */}
            <div className="eval-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-hover)', fontWeight: 800 }}>
                  ✦
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                    AI Evaluation Analysis
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Automated code & deliverable verification engine
                  </div>
                </div>
              </div>

              {evaluation.summary ? (
                <div style={{ fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--color-text-main)', backgroundColor: 'var(--color-background)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                  {evaluation.summary}
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  No summary notes provided for this submission.
                </div>
              )}
            </div>

            {/* ## Completed Deliverables */}
            <div className="eval-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '0.75rem' }}>
                <h4 className="feedback-section-title completed" style={{ margin: 0 }}>
                  <span>✓ Verified Deliverables</span>
                </h4>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
                  {evaluation.completed?.length || 0} passed
                </span>
              </div>

              {evaluation.completed && evaluation.completed.length > 0 ? (
                <ul className="feedback-list">
                  {evaluation.completed.map((item, idx) => (
                    <li key={idx} className="feedback-item completed-item" style={{ padding: '0.75rem 1rem' }}>
                      <span className="item-check" style={{ fontSize: '1.1rem', marginTop: '1px' }}>✓</span>
                      <span style={{ lineHeight: '1.5', fontSize: '0.88rem' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  No verified deliverables recorded.
                </p>
              )}
            </div>

            {/* ## Missing Requirements */}
            <div className="eval-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '0.75rem' }}>
                <h4 className="feedback-section-title missing" style={{ margin: 0 }}>
                  <span>⚠ Unfulfilled Requirements</span>
                </h4>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', backgroundColor: evaluation.missing?.length > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)', color: evaluation.missing?.length > 0 ? 'var(--color-warning-text)' : 'var(--color-success-text)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  {evaluation.missing?.length || 0} unfulfilled
                </span>
              </div>

              {evaluation.missing && evaluation.missing.length > 0 ? (
                <ul className="feedback-list">
                  {evaluation.missing.map((item, idx) => (
                    <li key={idx} className="feedback-item missing-item" style={{ padding: '0.75rem 1rem' }}>
                      <span className="item-bullet" style={{ fontSize: '1.2rem', marginTop: '-2px' }}>•</span>
                      <span style={{ lineHeight: '1.5', fontSize: '0.88rem' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', color: 'var(--color-success-text)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <span>✓</span>
                  <span>All core project requirements and deliverables were identified!</span>
                </div>
              )}
            </div>

            {/* ## Flagged Issues */}
            <div className="eval-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '0.75rem' }}>
                <h4 className="feedback-section-title issues" style={{ margin: 0 }}>
                  <span>🔍 Code Quality & Diagnostics</span>
                </h4>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', backgroundColor: evaluation.issues?.length > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)', color: evaluation.issues?.length > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {evaluation.issues?.length || 0} flagged
                </span>
              </div>

              {evaluation.issues && evaluation.issues.length > 0 ? (
                <ul className="feedback-list">
                  {evaluation.issues.map((issue, idx) => {
                    const isObj = typeof issue === 'object';
                    const title = isObj ? issue.title : issue;
                    const location = isObj ? issue.location : null;
                    const suggestion = isObj ? issue.suggestion : null;
                    const severity = isObj ? issue.severity : 'warning';

                    return (
                      <li key={idx} className="feedback-item issue-item" style={{ padding: '0.85rem 1rem' }}>
                        <div className="item-issue-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--color-danger)', fontWeight: 800 }}>•</span>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{title}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {severity && (
                              <span className="issue-tag">{severity}</span>
                            )}
                            {location && (
                              <button
                                type="button"
                                onClick={() => handleJumpToFile(location)}
                                title="Click to view this file in Scraped Codebase"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  color: 'var(--color-primary-hover)',
                                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                                  backgroundColor: 'var(--color-surface-subtle)',
                                  border: '1px solid rgba(22, 163, 74, 0.25)',
                                  borderRadius: '4px',
                                  padding: '2px 7px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                <span>[{location}]</span>
                                <IconExternalLink size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        {suggestion && (
                          <div className="issue-suggestion" style={{ marginTop: '0.5rem', lineHeight: '1.5' }}>
                            💡 <strong>Recommendation:</strong> {suggestion}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', color: 'var(--color-success-text)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <span>✓</span>
                  <span>No security vulnerabilities or major anti-patterns flagged.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Scraped Codebase Viewer */}
      {activeSubTab === 'code' && (
        <div className="eval-card" style={{ padding: '1.75rem' }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Scraped Codebase Explorer</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-primary-hover)',
                    fontWeight: 700
                  }}
                >
                  {scrapedFiles.length} files extracted
                </span>
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                These are the exact source files extracted from GitHub with numbered lines provided to the AI for evaluation.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleReevaluateAction(submission)}
              id="btn-reevaluate-from-code"
            >
              <IconRefreshCw size={14} />
              <span>Re-fetch Codebase</span>
            </button>
          </div>

          {scrapedFiles.length > 0 ? (
            <div className="code-explorer-grid">
              {/* Left Sidebar: File Filter & List */}
              <div className="code-explorer-sidebar">
                {/* Search Bar */}
                <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', backgroundColor: '#ffffff' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '0.65rem', color: 'var(--color-text-light)', display: 'flex' }}>
                      <IconSearch size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Filter files (e.g. auth, package)..."
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem 0.45rem 2rem',
                        fontSize: '0.78rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-sans)',
                        outline: 'none'
                      }}
                    />
                    {fileSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFileSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '0.5rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-muted)',
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Showing {filteredFiles.length} of {scrapedFiles.length} files</span>
                  </div>
                </div>

                {/* File Items List */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map((file) => {
                      const realIdx = scrapedFiles.findIndex((f) => f.path === file.path);
                      const isSelected = selectedFileIdx === realIdx;

                      return (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => setSelectedFileIdx(realIdx)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.55rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isSelected ? '#ffffff' : 'transparent',
                            border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid transparent',
                            color: isSelected ? 'var(--color-primary-hover)' : 'var(--color-text-main)',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.78rem',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.4rem',
                            marginBottom: '3px',
                            boxShadow: isSelected ? '0 1px 4px rgba(22, 163, 74, 0.15)' : 'none',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            📄 {file.path}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: isSelected ? 'var(--color-surface-subtle)' : '#e2e8f0',
                              color: isSelected ? 'var(--color-primary-hover)' : '#64748b',
                              flexShrink: 0
                            }}
                          >
                            {file.lineCount}L
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      No files match &quot;{fileSearchQuery}&quot;
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Code Content Viewer */}
              <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', overflow: 'hidden' }}>
                {activeFile ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 1rem',
                        backgroundColor: '#1e293b',
                        borderBottom: '1px solid #334155',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#f8fafc', fontSize: '0.82rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                          📄 {activeFile.path}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                          ({activeFile.lineCount} lines • {Math.round(activeFile.size / 1024 * 10) / 10 || (activeFile.size ? '<1' : '0')} KB)
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(activeFile.content);
                          setCopiedFile(true);
                          setTimeout(() => setCopiedFile(false), 1800);
                        }}
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 10px',
                          backgroundColor: '#334155',
                          color: '#f8fafc',
                          border: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        {copiedFile ? (
                          <>
                            <IconCheck size={13} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <IconCopy size={13} />
                            <span>Copy File Content</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre
                      style={{
                        flex: 1,
                        margin: 0,
                        padding: '1.25rem',
                        overflowY: 'auto',
                        maxHeight: '560px',
                        color: '#f1f5f9',
                        fontSize: '0.82rem',
                        fontFamily: "'Plus Jakarta Sans', monospace",
                        lineHeight: 1.65,
                        backgroundColor: '#0f172a'
                      }}
                    >
                      <code>{activeFile.content || '// (Empty file)'}</code>
                    </pre>
                  </>
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    Select a file from the sidebar to inspect its content.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.35rem' }}>
                No Scraped Files Stored Yet
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)', maxWidth: '450px', margin: '0 auto' }}>
                This submission was evaluated before full codebase caching was enabled, or the GitHub repository did not contain readable code files.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleReevaluateAction(submission)}
                style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <IconRefreshCw size={14} />
                <span>Re-evaluate Repository to Download & Cache Codebase</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

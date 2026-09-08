import { useState, useEffect } from 'react';
import {
  IconClose,
  IconSparkles,
  IconPlus,
  IconTrash,
  IconBookOpen,
  IconCheck,
  IconRefreshCw,
  IconFileCheck
} from './Icons';
import {
  generateDeliverablesFromPRD,
  formatDocumentationWithAI,
  generateCriteriaFromPRD,
  getProjectPRDMarkdown
} from '../services/api';
import MarkdownViewer from './MarkdownViewer';
import { useToast } from '../context/UIContext';

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSaveProject,
  project = null
}) {
  const { showToast } = useToast();
  const isEditMode = !!project;
  const [step, setStep] = useState(1); // 1: PRD Documentation, 2: Deliverables Checklist, 3: Evaluation Criteria
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('MERN');
  const [prdMarkdown, setPrdMarkdown] = useState('');
  const [deliverables, setDeliverables] = useState([]);
  const [criteria, setCriteria] = useState([]);

  // Deliverable editing state
  const [editingIdx, setEditingIdx] = useState(null);
  const [editText, setEditText] = useState('');
  const [newDeliverableInput, setNewDeliverableInput] = useState('');

  // Criteria editing state
  const [editingCritIdx, setEditingCritIdx] = useState(null);
  const [editCritName, setEditCritName] = useState('');
  const [editCritScore, setEditCritScore] = useState('');
  const [newCritName, setNewCritName] = useState('');
  const [newCritScore, setNewCritScore] = useState('25');

  // AI loading states
  const [isFormatting, setIsFormatting] = useState(false);
  const [isGeneratingDeliverables, setIsGeneratingDeliverables] = useState(false);
  const [isGeneratingCriteria, setIsGeneratingCriteria] = useState(false);
  const [formatStats, setFormatStats] = useState(null);

  // Synchronize state when modal opens or project changes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (project) {
        setTitle(project.title || '');
        setCourse(project.course || project.category || 'MERN');
        setPrdMarkdown(getProjectPRDMarkdown(project));
        setDeliverables(Array.isArray(project.requirements) ? [...project.requirements] : []);
        setCriteria(
          Array.isArray(project.criteria) && project.criteria.length > 0
            ? project.criteria.map((c) => ({ name: c.name, maxScore: c.maxScore || 25 }))
            : []
        );
      } else {
        setTitle('');
        setCourse('MERN');
        setPrdMarkdown('');
        setDeliverables([]);
        setCriteria([]);
      }
      setFormatStats(null);
      setEditingIdx(null);
      setEditText('');
      setNewDeliverableInput('');
      setEditingCritIdx(null);
      setEditCritName('');
      setEditCritScore('');
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const insertToken = (before, after = '') => {
    const textarea = document.getElementById('create-prd-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selectedText = prdMarkdown.substring(start, end);
    const replacement = before + (selectedText || 'text') + after;
    const newContent = prdMarkdown.substring(0, start) + replacement + prdMarkdown.substring(end);

    setPrdMarkdown(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + replacement.length - after.length);
    }, 50);
  };

  const handleLoadSampleNotes = () => {
    const sample = `# ${title || 'E-Commerce Platform'} - Project Requirement Document (PRD)

## Problem Statement & Scope
Online retail applications need a high-performance, responsive shopping experience with resilient inventory sync and authenticated checkout. This project challenges learners to implement a production-grade web platform.

## System Architecture & Tech Stack
- **Frontend Layer**: React.js / Next.js with state management and responsive CSS
- **Backend / API Layer**: Node.js Express or FastAPI with JWT authentication
- **Data & Persistence**: PostgreSQL or MongoDB with relational schemas and indexes
- **DevOps & Standards**: Dockerfile, GitHub Actions CI, and environment isolation

## Functional Specifications & User Stories

### US-101: User Authentication & Profile Security
As a customer, I want to securely register, sign in, and persist my active session.
**Acceptance Criteria:**
- ✓ Store passwords hashed via bcrypt (minimum salt rounds 10)
- ✓ Emit signed JWT tokens with 24-hour expiration
- ✓ Guard private account endpoints with verification middleware

### US-102: Product Catalog & Category Search
As a shopper, I want to search and filter products by category, price, and availability.
**Acceptance Criteria:**
- ✓ Implement query search across product title and description
- ✓ Filter by category IDs and price ranges
- ✓ Paginate results with limit and offset cursor

### US-103: Persistent Cart & Session Synchronization
As a shopper, I want my shopping cart to stay synchronized between refreshes and logins.
**Acceptance Criteria:**
- ✓ Persist cart state in localStorage and merge with account on login
- ✓ Validate product stock before incrementing quantity

### US-104: Checkout & Order Processing
As a customer, I want to submit orders and receive confirmation records.
**Acceptance Criteria:**
- ✓ Atomic database transaction creating order and line items
- ✓ Validate customer shipping address and payment token

## REST API Specifications

| Method | Endpoint Path | Description | Authentication |
| :--- | :--- | :--- | :--- |
| **POST** | \`/api/v1/auth/register\` | Registers new customer account | \`Public\` |
| **POST** | \`/api/v1/auth/login\` | Authenticates credentials and returns JWT | \`Public\` |
| **GET** | \`/api/v1/products\` | Lists products with filtering and pagination | \`Public\` |
| **POST** | \`/api/v1/cart/sync\` | Synchronizes client cart items | \`Bearer JWT\` |
| **POST** | \`/api/v1/orders\` | Creates order and initiates checkout | \`Bearer JWT\` |

## Submission Guidelines & Repository Standards
Provide clean commit history, a complete README with setup commands, and an .env.example file.`;

    setPrdMarkdown(sample);
    setFormatStats(null);
  };

  const handleAIFormat = async () => {
    if (!prdMarkdown.trim()) {
      showToast('Please enter or paste raw documentation text first.', 'error');
      return;
    }

    setIsFormatting(true);
    try {
      const result = await formatDocumentationWithAI(prdMarkdown);
      setPrdMarkdown(result.formattedMarkdown);
      setFormatStats(result.stats);
    } catch (err) {
      console.error('AI formatting failed:', err);
      showToast(`AI Formatting Error: ${err.message || 'Formatting failed. Please retry.'}`, 'error');
    } finally {
      setIsFormatting(false);
    }
  };

  const handleProceedToDeliverables = async () => {
    if (!title.trim()) {
      showToast('Please provide a Project Title before proceeding.', 'error');
      return;
    }

    if (!prdMarkdown.trim()) {
      showToast('Please write or paste the PRD Documentation before continuing.', 'error');
      return;
    }

    // If deliverables are already present (e.g. editing an existing project), proceed directly
    if (deliverables.length > 0) {
      setStep(2);
      return;
    }

    setIsGeneratingDeliverables(true);
    try {
      const generated = await generateDeliverablesFromPRD(prdMarkdown, title);
      setDeliverables(generated);
      setStep(2);
    } catch (err) {
      console.error('Deliverable generation failed:', err);
      showToast(`Deliverable Extraction Error: ${err.message || 'Gemini could not parse the PRD. Please retry.'}`, 'error');
    } finally {
      setIsGeneratingDeliverables(false);
    }
  };

  const handleRegenerateDeliverables = async () => {
    setIsGeneratingDeliverables(true);
    try {
      const generated = await generateDeliverablesFromPRD(prdMarkdown, title);
      setDeliverables(generated);
    } catch (err) {
      console.error('Regeneration failed:', err);
      showToast(`Regeneration Error: ${err.message || 'Please retry.'}`, 'error');
    } finally {
      setIsGeneratingDeliverables(false);
    }
  };

  // Deliverables manipulation handlers
  const handleStartEdit = (idx, text) => {
    setEditingIdx(idx);
    setEditText(text);
  };

  const handleSaveEdit = (idx) => {
    if (editText.trim()) {
      const updated = [...deliverables];
      updated[idx] = editText.trim();
      setDeliverables(updated);
    }
    setEditingIdx(null);
    setEditText('');
  };

  const handleDeleteDeliverable = (idx) => {
    setDeliverables(deliverables.filter((_, i) => i !== idx));
  };

  const handleAddDeliverable = () => {
    if (newDeliverableInput.trim()) {
      setDeliverables([...deliverables, newDeliverableInput.trim()]);
      setNewDeliverableInput('');
    }
  };

  // Step 2 -> Step 3: Transition & Criteria Generation
  const handleProceedToCriteria = async () => {
    if (deliverables.length === 0) {
      showToast('Please have at least 1 deliverable in the checklist before proceeding.', 'error');
      return;
    }

    if (criteria.length > 0) {
      setStep(3);
      return;
    }

    setIsGeneratingCriteria(true);
    try {
      const generated = await generateCriteriaFromPRD(prdMarkdown, deliverables, title);
      setCriteria(generated);
      setStep(3);
    } catch (err) {
      console.error('Criteria generation failed:', err);
      showToast(`Criteria Generation Error: ${err.message || 'Gemini could not generate criteria. Please retry.'}`, 'error');
    } finally {
      setIsGeneratingCriteria(false);
    }
  };

  const handleRegenerateCriteria = async () => {
    setIsGeneratingCriteria(true);
    try {
      const generated = await generateCriteriaFromPRD(prdMarkdown, deliverables, title);
      setCriteria(generated);
    } catch (err) {
      console.error('Criteria regeneration failed:', err);
      showToast(`Regeneration Error: ${err.message || 'Please retry.'}`, 'error');
    } finally {
      setIsGeneratingCriteria(false);
    }
  };

  // Criteria manipulation handlers
  const handleStartEditCrit = (idx, crit) => {
    setEditingCritIdx(idx);
    setEditCritName(crit.name);
    setEditCritScore(crit.maxScore);
  };

  const handleSaveCritEdit = (idx) => {
    if (editCritName.trim()) {
      const updated = [...criteria];
      const parsedScore = Math.max(1, parseInt(editCritScore, 10) || 25);
      updated[idx] = {
        name: editCritName.trim(),
        maxScore: parsedScore
      };
      setCriteria(updated);
    }
    setEditingCritIdx(null);
    setEditCritName('');
    setEditCritScore('');
  };

  const handleDeleteCrit = (idx) => {
    if (criteria.length <= 1) {
      showToast('You must keep at least 1 evaluation criterion pillar.', 'error');
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== idx));
  };

  const handleAddCrit = () => {
    if (newCritName.trim()) {
      const parsedScore = Math.max(1, parseInt(newCritScore, 10) || 25);
      setCriteria([...criteria, { name: newCritName.trim(), maxScore: parsedScore }]);
      setNewCritName('');
      setNewCritScore('25');
    }
  };

  const handleNormalizeCriteria = () => {
    if (criteria.length === 0) return;
    const currentTotal = criteria.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);
    if (currentTotal <= 0) return;
    let remaining = 100;
    const normalized = criteria.map((c, i) => {
      if (i === criteria.length - 1) {
        return { ...c, maxScore: Math.max(1, remaining) };
      }
      const scaled = Math.round(((Number(c.maxScore) || 0) / currentTotal) * 100);
      remaining -= scaled;
      return { ...c, maxScore: Math.max(1, scaled) };
    });
    setCriteria(normalized);
  };

  const handlePublishProject = () => {
    if (!title.trim()) {
      showToast('Please enter a Project Title.', 'error');
      return;
    }

    if (deliverables.length === 0) {
      showToast('Please have at least 1 deliverable in the checklist.', 'error');
      return;
    }

    if (criteria.length === 0) {
      showToast('Please configure at least 1 evaluation criterion pillar.', 'error');
      return;
    }

    const summaryParagraph = prdMarkdown.trim().split('\n\n').find(p => !p.startsWith('#') && p.length > 20);
    const cleanSummary = summaryParagraph ? summaryParagraph.replace(/[*_`#]/g, '').trim().slice(0, 160) : title.trim();

    const projectData = {
      ...(project ? { id: project.id || project._id, _id: project._id || project.id } : {}),
      title: title.trim(),
      description: cleanSummary,
      course,
      requirements: deliverables,
      criteria: criteria.map(c => ({
        name: c.name.trim(),
        maxScore: Number(c.maxScore) || 25
      })),
      documentation: {
        rawMarkdown: prdMarkdown.trim()
      },
      ...(!project ? { createdAt: new Date().toISOString() } : {})
    };

    onSaveProject(projectData);
    // Reset state
    setTitle('');
    setPrdMarkdown('');
    setDeliverables([]);
    setCriteria([]);
    setStep(1);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content create-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Step Indicator */}
        <div className="modal-header" style={{ padding: '1.15rem 1.75rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
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
              <IconBookOpen size={18} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {isEditMode ? 'Edit Project & PRD Studio' : 'Create Evaluation Project'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '3px' }}>
                <span
                  onClick={() => setStep(1)}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: step === 1 ? 800 : 600,
                    color: step === 1 ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: 'pointer'
                  }}
                  title="Go to Step 1: PRD Documentation"
                >
                  <span style={{ width: '18px', height: '18px', borderRadius: '9999px', backgroundColor: step === 1 ? 'var(--color-primary)' : '#e2e8f0', color: step === 1 ? '#ffffff' : '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>1</span>
                  PRD Documentation
                </span>
                <span style={{ color: 'var(--color-text-light)' }}>→</span>
                <span
                  onClick={() => {
                    if (title.trim() && prdMarkdown.trim()) setStep(2);
                  }}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: step === 2 ? 800 : 600,
                    color: step === 2 ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: (title.trim() && prdMarkdown.trim()) ? 'pointer' : 'default'
                  }}
                  title="Go to Step 2: Deliverables Checklist"
                >
                  <span style={{ width: '18px', height: '18px', borderRadius: '9999px', backgroundColor: step === 2 ? 'var(--color-primary)' : '#e2e8f0', color: step === 2 ? '#ffffff' : '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>2</span>
                  Deliverables Checklist {deliverables.length > 0 ? `(${deliverables.length})` : ''}
                </span>
                <span style={{ color: 'var(--color-text-light)' }}>→</span>
                <span
                  onClick={() => {
                    if (deliverables.length > 0) setStep(3);
                  }}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: step === 3 ? 800 : 600,
                    color: step === 3 ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: deliverables.length > 0 ? 'pointer' : 'default'
                  }}
                  title="Go to Step 3: Evaluation Criteria"
                >
                  <span style={{ width: '18px', height: '18px', borderRadius: '9999px', backgroundColor: step === 3 ? 'var(--color-primary)' : '#e2e8f0', color: step === 3 ? '#ffffff' : '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>3</span>
                  Evaluation Criteria {criteria.length > 0 ? `(${criteria.length})` : ''}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px', border: 'none' }}
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* STEP 1: PRD DOCUMENTATION STUDIO */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* Title & Domain Row */}
            <div className="prd-title-domain-row">
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', fontSize: '0.78rem' }}>Project Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Microservices Banking Portal, Real-time Collaborative Board..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', fontSize: '0.78rem' }}>Course</label>
                <select
                  className="form-select"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <option value="MERN">MERN (MongoDB, Express, React, Node.js)</option>
                  <option value="JFSD">JFSD (Java Full Stack Development)</option>
                </select>
              </div>
            </div>

            {/* PRD Studio Toolbar */}
            <div
              style={{
                padding: '0.55rem 1.75rem',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              {/* Quick Markdown tags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('# ', '')} title="Heading 1" style={{ fontWeight: 800, padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>H1</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('## ', '')} title="Heading 2" style={{ fontWeight: 800, padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>H2</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('### ', '')} title="Heading 3" style={{ fontWeight: 800, padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>H3</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('**', '**')} title="Bold" style={{ fontWeight: 800, padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>B</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('*', '*')} title="Italic" style={{ fontStyle: 'italic', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>I</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('- ', '')} title="Bullet List" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>• List</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('| Method | Endpoint | Description |\n| :--- | :--- | :--- |\n| **GET** | `/api/v1/resource` | Handler |\n', '')} title="Table" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Table</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('```js\n', '\n```')} title="Code" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Code</button>
              </div>

              {/* AI & Sample Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleLoadSampleNotes}
                  style={{ fontSize: '0.78rem' }}
                >
                  <span>Load Sample PRD</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAIFormat}
                  disabled={isFormatting || !prdMarkdown.trim()}
                  style={{ fontSize: '0.78rem' }}
                >
                  {isFormatting ? (
                    <>
                      <span className="spinner" style={{ width: '12px', height: '12px', borderTopColor: '#ffffff' }}></span>
                      <span>Formatting...</span>
                    </>
                  ) : (
                    <>
                      <IconSparkles size={14} />
                      <span>✨ Format with AI (Preserve Context)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Formatting confirmation banner */}
            {formatStats && (
              <div
                style={{
                  backgroundColor: 'var(--color-surface-subtle)',
                  borderBottom: '1px solid var(--color-surface-subtle-border)',
                  padding: '0.4rem 1.75rem',
                  fontSize: '0.78rem',
                  color: 'var(--color-primary-hover)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <IconCheck size={14} />
                <span>Context Preserved 100%: Formatted {formatStats.headingsAdded || 0} headings, {formatStats.tablesFormatted || 0} API tables, and {formatStats.listsCleaned || 0} list items without altering technical terms.</span>
              </div>
            )}

            {/* Split Screen Workspace: Editor Left, Preview Right */}
            <div className="prd-split-editor">

              {/* Left Column: Raw Text Editor */}
              <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border)', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                <div style={{ padding: '0.45rem 1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                  RAW PRD NOTES / MARKDOWN
                </div>
                <textarea
                  id="create-prd-textarea"
                  value={prdMarkdown}
                  onChange={(e) => setPrdMarkdown(e.target.value)}
                  placeholder="Paste or write your Project Requirement Document (PRD) here... Click 'Load Sample PRD' to test."
                  style={{
                    flex: 1,
                    width: '100%',
                    padding: '1.25rem',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '0.84rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-main)',
                    overflowY: 'auto'
                  }}
                />
              </div>

              {/* Right Column: Live Visual Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa', overflow: 'hidden' }}>
                <div style={{ padding: '0.45rem 1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                  LIVE RENDERED PRD PREVIEW
                </div>
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', backgroundColor: '#ffffff' }}>
                  <MarkdownViewer content={prdMarkdown} />
                </div>
              </div>

            </div>

            {/* Step 1 Footer */}
            <div className="modal-footer" style={{ padding: '0.85rem 1.75rem', borderTop: '1px solid var(--color-border)' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToDeliverables}
                className="btn btn-primary"
                disabled={isGeneratingDeliverables || !title.trim() || !prdMarkdown.trim()}
              >
                {isGeneratingDeliverables ? (
                  <>
                    <span className="spinner" style={{ width: '13px', height: '13px', borderTopColor: '#ffffff' }}></span>
                    <span>AI Generating Deliverables from PRD...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {deliverables.length > 0
                        ? `Continue to Deliverables Checklist (${deliverables.length}) →`
                        : 'Continue to Deliverables Checklist →'
                      }
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: AI DELIVERABLES REVIEW & CONFIRMATION */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* Top Review Callout */}
            <div
              style={{
                padding: '1rem 1.75rem',
                backgroundColor: 'var(--color-surface-subtle)',
                borderBottom: '1px solid var(--color-surface-subtle-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-primary-hover)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <IconSparkles size={16} />
                  <span>{isEditMode ? 'Current Deliverables Checklist & Requirements' : 'Deliverables Synthesized Directly from PRD'}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-body)', marginTop: '2px' }}>
                  {isEditMode
                    ? `Review and verify the ${deliverables.length} concrete requirements for "${title}". Add, edit, remove, or re-extract deliverables with Gemini.`
                    : `Gemini analyzed your PRD for "${title}" and extracted ${deliverables.length} concrete technical milestones. Review, add, edit, or delete items below before publishing.`
                  }
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRegenerateDeliverables}
                disabled={isGeneratingDeliverables}
                style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Re-analyze the PRD with Gemini AI to generate new deliverables"
              >
                <IconRefreshCw size={13} />
                <span>{isGeneratingDeliverables ? 'Re-analyzing...' : 'Retry / Regenerate with AI'}</span>
              </button>
            </div>

            {/* Deliverables List Area */}
            <div style={{ flex: 1, padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                  Deliverables Checklist ({deliverables.length})
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Click Edit to modify wording, or Trash to remove
                </span>
              </div>

              {deliverables.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: editingIdx === idx ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${editingIdx === idx ? '#93c5fd' : 'var(--color-border)'}`,
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: 'var(--color-primary-hover)',
                      backgroundColor: 'var(--color-surface-subtle)',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      minWidth: '26px',
                      textAlign: 'center'
                    }}
                  >
                    #{idx + 1}
                  </span>

                  {editingIdx === idx ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <input
                        type="text"
                        className="form-input"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{ flex: 1, padding: '0.35rem 0.65rem', fontSize: '0.84rem' }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(idx);
                          if (e.key === 'Escape') setEditingIdx(null);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveEdit(idx)}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingIdx(null)}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.55rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.4 }}>
                        {item}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(idx, item)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '2px 7px' }}
                          title="Edit deliverable text"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeliverable(idx)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '2px 7px', color: '#dc2626' }}
                          title="Delete deliverable"
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Custom Deliverable Row */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--color-border)' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type a new custom deliverable and click Add..."
                  value={newDeliverableInput}
                  onChange={(e) => setNewDeliverableInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDeliverable();
                    }
                  }}
                  style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.84rem' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddDeliverable}
                  disabled={!newDeliverableInput.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <IconPlus size={14} />
                  <span>Add Deliverable</span>
                </button>
              </div>
            </div>

            {/* Step 2 Footer */}
            <div className="modal-footer" style={{ padding: '0.85rem 1.75rem', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
              >
                ← Back to PRD Documentation
              </button>
              <button
                type="button"
                onClick={handleProceedToCriteria}
                className="btn btn-primary"
                id="btn-proceed-to-criteria"
                disabled={isGeneratingCriteria || deliverables.length === 0}
              >
                {isGeneratingCriteria ? (
                  <>
                    <span className="spinner" style={{ width: '13px', height: '13px', borderTopColor: '#ffffff' }}></span>
                    <span>AI Generating Criteria Pillars...</span>
                  </>
                ) : (
                  <>
                    <span>Next: Evaluation Criteria & Scoring →</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* STEP 3: AI EVALUATION CRITERIA & SCORING PILLARS */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* Top Review Callout */}
            <div
              style={{
                padding: '1rem 1.75rem',
                backgroundColor: 'var(--color-surface-subtle)',
                borderBottom: '1px solid var(--color-surface-subtle-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-primary-hover)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <IconSparkles size={16} />
                  <span>{isEditMode ? 'Current Evaluation Criteria & Scoring Rubric' : 'Evaluation Criteria Synthesized Directly from PRD'}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-body)', marginTop: '2px' }}>
                  {isEditMode
                    ? `Review and verify the ${criteria.length} scoring pillars for "${title}". Adjust points, rename criteria, add new pillars, or re-extract with Gemini.`
                    : `Gemini analyzed your PRD for "${title}" and synthesized ${criteria.length} grading pillars totaling ${criteria.reduce((s, c) => s + (Number(c.maxScore) || 0), 0)} points. Customize weights, edit names, or re-generate below.`
                  }
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRegenerateCriteria}
                disabled={isGeneratingCriteria}
                style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Re-analyze the PRD with Gemini AI to generate fresh criteria pillars"
              >
                <IconRefreshCw size={13} />
                <span>{isGeneratingCriteria ? 'Re-analyzing...' : 'Retry / Regenerate with AI'}</span>
              </button>
            </div>

            {/* Total Points Status Banner */}
            {(() => {
              const total = criteria.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);
              const is100 = total === 100;
              return (
                <div
                  style={{
                    padding: '0.55rem 1.75rem',
                    backgroundColor: is100 ? '#f0fdf4' : '#fffbeb',
                    borderBottom: `1px solid ${is100 ? '#bbf7d0' : '#fde68a'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: is100 ? '#15803d' : '#b45309' }}>
                    <IconCheck size={15} style={{ color: is100 ? '#15803d' : '#b45309' }} />
                    <span>
                      {is100
                        ? 'Total Scoring Weightage: Exactly 100 / 100 points (Recommended for grading)'
                        : `Total Scoring Weightage: ${total} / 100 points (Criteria should ideally sum to 100)`}
                    </span>
                  </div>

                  {!is100 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleNormalizeCriteria}
                      style={{ fontSize: '0.74rem', padding: '2px 8px', fontWeight: 700, color: '#b45309' }}
                      title="Proportionally scale criteria scores so the total equals 100 points"
                    >
                      ⚡ Auto-Scale to 100 pts
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Criteria List Area */}
            <div style={{ flex: 1, padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                  Grading Pillars ({criteria.length})
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Each pillar defines a rubric standard used by Gemini when evaluating code repos
                </span>
              </div>

              {criteria.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: editingCritIdx === idx ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${editingCritIdx === idx ? '#93c5fd' : 'var(--color-border)'}`,
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: 'var(--color-primary-hover)',
                      backgroundColor: 'var(--color-surface-subtle)',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      minWidth: '26px',
                      textAlign: 'center'
                    }}
                  >
                    #{idx + 1}
                  </span>

                  {editingCritIdx === idx ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <input
                        type="text"
                        className="form-input"
                        value={editCritName}
                        onChange={(e) => setEditCritName(e.target.value)}
                        placeholder="Criterion name..."
                        style={{ flex: 1, padding: '0.35rem 0.65rem', fontSize: '0.84rem' }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input
                          type="number"
                          className="form-input"
                          min="1"
                          max="100"
                          value={editCritScore}
                          onChange={(e) => setEditCritScore(e.target.value)}
                          style={{ width: '65px', padding: '0.35rem 0.5rem', fontSize: '0.84rem', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>pts</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveCritEdit(idx)}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingCritIdx(null)}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.55rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#15803d',
                            backgroundColor: '#dcfce7',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            border: '1px solid #bbf7d0'
                          }}
                        >
                          {item.maxScore} pts
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleStartEditCrit(idx, item)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '2px 7px' }}
                          title="Edit criterion name and score"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCrit(idx)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '2px 7px', color: '#dc2626' }}
                          title="Delete criterion"
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Custom Criterion Row */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--color-border)', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="New criterion pillar name (e.g. Test Coverage & Robustness)..."
                  value={newCritName}
                  onChange={(e) => setNewCritName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCrit();
                    }
                  }}
                  style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.84rem' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="100"
                    placeholder="25"
                    value={newCritScore}
                    onChange={(e) => setNewCritScore(e.target.value)}
                    style={{ width: '70px', padding: '0.45rem 0.5rem', fontSize: '0.84rem', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>pts</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddCrit}
                  disabled={!newCritName.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                >
                  <IconPlus size={14} />
                  <span>Add Criterion</span>
                </button>
              </div>
            </div>

            {/* Step 3 Footer */}
            <div className="modal-footer" style={{ padding: '0.85rem 1.75rem', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-secondary"
              >
                ← Back to Deliverables
              </button>
              <button
                type="button"
                onClick={handlePublishProject}
                className="btn btn-primary"
                id="btn-confirm-publish-project"
                disabled={criteria.length === 0}
              >
                <IconCheck size={16} />
                <span>
                  {isEditMode
                    ? `Save Changes (${deliverables.length} Tasks, ${criteria.length} Criteria)`
                    : `Confirm & Publish Project (${deliverables.length} Tasks, ${criteria.length} Criteria)`
                  }
                </span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

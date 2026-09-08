import { useState, useEffect } from 'react';
import { 
  IconClose, 
  IconSparkles, 
  IconCheck, 
  IconBookOpen, 
  IconLayers,
  IconRefreshCw
} from './Icons';
import MarkdownViewer from './MarkdownViewer';
import { formatDocumentationWithAI, generateDeliverablesFromPRD, generateCriteriaFromPRD } from '../services/api';

export default function DocumentationEditorModal({ 
  isOpen, 
  onClose, 
  initialMarkdown = '', 
  projectTitle = '', 
  onApplyDocumentation 
}) {
  const [content, setContent] = useState(initialMarkdown || '');
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatStats, setFormatStats] = useState(null);
  
  // Deliverables refresh
  const [isRefreshingDeliverables, setIsRefreshingDeliverables] = useState(false);
  const [refreshedDeliverables, setRefreshedDeliverables] = useState(null);
  const [syncDeliverables, setSyncDeliverables] = useState(false);

  // Criteria refresh
  const [isRefreshingCriteria, setIsRefreshingCriteria] = useState(false);
  const [refreshedCriteria, setRefreshedCriteria] = useState(null);
  const [syncCriteria, setSyncCriteria] = useState(false);

  // Synchronize content whenever modal opens or initialMarkdown prop updates
  useEffect(() => {
    if (isOpen) {
      setContent(initialMarkdown || '');
      setFormatStats(null);
      setRefreshedDeliverables(null);
      setSyncDeliverables(false);
      setRefreshedCriteria(null);
      setSyncCriteria(false);
    }
  }, [isOpen, initialMarkdown]);

  if (!isOpen) return null;

  // Insert markdown helper at cursor or end
  const insertToken = (before, after = '') => {
    const textarea = document.getElementById('prd-raw-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selectedText = content.substring(start, end);
    const replacement = before + (selectedText || 'text') + after;
    const newContent = content.substring(0, start) + replacement + content.substring(end);

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + replacement.length - after.length);
    }, 50);
  };

  const handleAIFormat = async () => {
    if (!content.trim()) {
      alert('Please paste or write some raw documentation content first.');
      return;
    }

    setIsFormatting(true);
    try {
      const result = await formatDocumentationWithAI(content);
      setContent(result.formattedMarkdown);
      setFormatStats(result.stats);
    } catch (err) {
      console.error('Formatting failed:', err);
      alert(`AI Formatting Error: ${err.message || 'Gemini formatting failed. Please retry.'}`);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleLoadSampleNotes = () => {
    const sampleRaw = `# Raw Project Notes: Real-time Multi-tenant Dashboard
problem statement:
engineering teams need a unified telemetry dashboard that streams cpu memory and custom metrics in real time. latency must remain under 200ms.

architecture:
frontend: react with tailwind and chartjs
backend: nodejs express with websocket gateway
database: timescaledb with postgresql for timeseries storage

user stories:
US-1 telemetry ingestion
as a devops engineer i want to stream server health metrics over websocket so i can detect memory leaks
- accept json payloads with timestamp host and metric values
- reject invalid payloads with 400
- alert when cpu exceeds 90%

US-2 metric visualization
as an administrator i want interactive timeseries charts
- support 1h 24h 7d zoom levels
- toggle individual server nodes

endpoints:
POST /api/v1/auth/token - issue service account credentials
GET /api/v1/metrics/live - websocket handshake for real time stream
GET /api/v1/metrics/history - fetch historical timeseries aggregations
POST /api/v1/alerts/configure - update threshold rules

submission:
include docker-compose with timescaledb and provide mock data generator script in readme.`;
    setContent(sampleRaw);
    setFormatStats(null);
  };

  const handleRefreshDeliverables = async () => {
    if (!content.trim()) {
      alert('Please enter or paste PRD content first.');
      return;
    }

    setIsRefreshingDeliverables(true);
    try {
      const extracted = await generateDeliverablesFromPRD(content, projectTitle || 'Project');
      setRefreshedDeliverables(extracted);
      setSyncDeliverables(true);
    } catch (err) {
      console.error('Deliverable extraction failed:', err);
      alert(`Deliverable Extraction Error: ${err.message || 'Gemini could not parse the PRD.'}`);
    } finally {
      setIsRefreshingDeliverables(false);
    }
  };

  const handleRefreshCriteria = async () => {
    if (!content.trim()) {
      alert('Please enter or paste PRD content first.');
      return;
    }

    setIsRefreshingCriteria(true);
    try {
      const extracted = await generateCriteriaFromPRD(content, refreshedDeliverables || [], projectTitle || 'Project');
      setRefreshedCriteria(extracted);
      setSyncCriteria(true);
    } catch (err) {
      console.error('Criteria extraction failed:', err);
      alert(`Criteria Extraction Error: ${err.message || 'Gemini could not generate criteria.'}`);
    } finally {
      setIsRefreshingCriteria(false);
    }
  };

  const handleSaveAndApply = () => {
    onApplyDocumentation({
      rawMarkdown: content,
      updatedDeliverables: syncDeliverables && refreshedDeliverables ? refreshedDeliverables : null,
      updatedCriteria: syncCriteria && refreshedCriteria ? refreshedCriteria : null
    });
    onClose();
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '1100px', width: '95vw', height: '90vh' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div 
              style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--color-surface-subtle)', 
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <IconBookOpen size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                PRD Documentation Studio {projectTitle ? `• ${projectTitle}` : ''}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Paste raw project notes • AI formats structure while strictly preserving 100% of context
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '4px', border: 'none' }}>
            <IconClose size={20} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div 
          style={{ 
            padding: '0.65rem 1.75rem', 
            backgroundColor: '#f8fafc', 
            borderBottom: '1px solid var(--color-border)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          {/* Quick Markdown Formatting Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('# ', '')} title="Heading 1" style={{ fontWeight: 800, padding: '0.25rem 0.55rem' }}>H1</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('## ', '')} title="Heading 2" style={{ fontWeight: 800, padding: '0.25rem 0.55rem' }}>H2</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('**', '**')} title="Bold" style={{ fontWeight: 800, padding: '0.25rem 0.55rem' }}>B</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('*', '*')} title="Italic" style={{ fontStyle: 'italic', padding: '0.25rem 0.55rem' }}>I</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('- ', '')} title="Bullet List" style={{ padding: '0.25rem 0.55rem' }}>• List</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('| Method | Endpoint | Description |\n| :--- | :--- | :--- |\n| GET | /api/v1/resources | List items |\n')} title="Table" style={{ padding: '0.25rem 0.55rem' }}>Table</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('```javascript\n', '\n```')} title="Code Block" style={{ padding: '0.25rem 0.55rem' }}>Code</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertToken('> ', '')} title="Quote" style={{ padding: '0.25rem 0.55rem' }}>Quote</button>
          </div>

          {/* AI & Quick Load Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLoadSampleNotes}
              style={{ fontSize: '0.78rem' }}
            >
              <IconRefreshCw size={13} />
              <span>Load Sample Notes</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleAIFormat}
              disabled={isFormatting || !content.trim()}
              id="btn-ai-format-doc"
              style={{ boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)' }}
            >
              {isFormatting ? (
                <>
                  <span className="spinner" style={{ width: '13px', height: '13px', borderTopColor: '#ffffff' }}></span>
                  <span>Formatting (Preserving Context)...</span>
                </>
              ) : (
                <>
                  <IconSparkles size={15} />
                  <span>✨ Format with AI (Preserve Context)</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRefreshDeliverables}
              disabled={isRefreshingDeliverables || !content.trim()}
              id="btn-refresh-deliverables"
              title="Re-extract deliverables checklist directly from this PRD using Gemini 2.5 Flash"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {isRefreshingDeliverables ? (
                <>
                  <span className="spinner" style={{ width: '12px', height: '12px', borderTopColor: 'var(--color-primary)' }}></span>
                  <span>Extracting Deliverables...</span>
                </>
              ) : (
                <>
                  <IconSparkles size={13} style={{ color: 'var(--color-primary)' }} />
                  <span>⚡ Refresh Deliverables</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRefreshCriteria}
              disabled={isRefreshingCriteria || !content.trim()}
              id="btn-refresh-criteria"
              title="Re-synthesize grading criteria pillars directly from this PRD using Gemini 2.5 Flash"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {isRefreshingCriteria ? (
                <>
                  <span className="spinner" style={{ width: '12px', height: '12px', borderTopColor: 'var(--color-primary)' }}></span>
                  <span>Extracting Criteria...</span>
                </>
              ) : (
                <>
                  <IconSparkles size={13} style={{ color: 'var(--color-primary)' }} />
                  <span>⚖️ Refresh Criteria</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Refreshed Deliverables Sync Banner */}
        {refreshedDeliverables && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              borderBottom: '1px solid #bbf7d0',
              padding: '0.55rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <IconCheck size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-hover)' }}>
                Gemini synthesized {refreshedDeliverables.length} concrete deliverables from this PRD
              </span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={syncDeliverables}
                onChange={(e) => setSyncDeliverables(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span>Update deliverables checklist ({refreshedDeliverables.length} items) on save</span>
            </label>
          </div>
        )}

        {/* Refreshed Criteria Sync Banner */}
        {refreshedCriteria && (
          <div
            style={{
              backgroundColor: '#f5f3ff',
              borderBottom: '1px solid #ddd6fe',
              padding: '0.55rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <IconCheck size={16} style={{ color: '#7c3aed' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6d28d9' }}>
                Gemini synthesized {refreshedCriteria.length} evaluation pillars (Total: {refreshedCriteria.reduce((s, c) => s + (Number(c.maxScore) || 0), 0)} pts)
              </span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={syncCriteria}
                onChange={(e) => setSyncCriteria(e.target.checked)}
                style={{ accentColor: '#7c3aed' }}
              />
              <span>Update evaluation criteria ({refreshedCriteria.length} pillars) on save</span>
            </label>
          </div>
        )}

        {/* Strict Context Banner if formatted */}
        {formatStats && (
          <div 
            style={{
              backgroundColor: 'var(--color-surface-subtle)',
              borderBottom: '1px solid var(--color-surface-subtle-border)',
              padding: '0.5rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: 'var(--color-primary-hover)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <IconCheck size={15} />
              <span>Context Preserved 100%: Formatted {formatStats.headingsAdded || 0} headings, {formatStats.tablesFormatted || 0} API tables, and {formatStats.listsCleaned || 0} list items without altering technical terms.</span>
            </div>
          </div>
        )}

        {/* Split Screen Workspace */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          
          {/* Left Column: Raw Text Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border)', backgroundColor: '#ffffff' }}>
            <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>RAW DOCUMENTATION INPUT (PASTE HERE)</span>
              <span>{wordCount} words</span>
            </div>
            <textarea
              id="prd-raw-textarea"
              style={{
                flex: 1,
                width: '100%',
                padding: '1.25rem',
                border: 'none',
                resize: 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.84rem',
                lineHeight: 1.6,
                color: 'var(--color-text-main)',
                backgroundColor: '#ffffff',
                outline: 'none'
              }}
              placeholder="Paste raw documentation here (e.g. from Notion, Word, specs, or rough notes)... Then click 'Format with AI'."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Right Column: Live Formatted Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', overflowY: 'auto' }}>
            <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', position: 'sticky', top: 0, zIndex: 5 }}>
              LIVE FORMATTED PRD PREVIEW
            </div>
            <div style={{ padding: '1.5rem', flex: 1 }}>
              <MarkdownViewer content={content} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '1rem 1.75rem', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconLayers size={14} />
            <span>Changes will apply directly to the project's documentation tab.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSaveAndApply}
              disabled={!content.trim()}
              id="btn-apply-doc"
            >
              <IconCheck size={14} />
              <span>Apply & Save Documentation</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

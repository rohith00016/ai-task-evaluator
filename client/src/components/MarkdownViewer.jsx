// Lightweight, high-aesthetic Markdown visual renderer tailored for HCL GUVI ed-tech design language
import { useState } from 'react';

export default function MarkdownViewer({ content = '' }) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState(null);

  if (!content) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '2rem 1rem', textAlign: 'center' }}>
        No documentation content to display yet.
      </div>
    );
  }

  const handleCopyCode = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Parse lines into tokens
  const lines = content.split('\n');
  const renderedElements = [];
  let tableRows = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLang = '';
  let listItems = [];
  let listType = null; // 'ul' | 'ol'
  let quoteBuffer = [];

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        renderedElements.push(
          <ol key={`ol-${renderedElements.length}`} style={{ paddingLeft: '1.4rem', margin: '0.65rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {listItems.map((item, idx) => (
              <li key={idx} style={{ fontSize: '0.875rem', color: 'var(--color-text-body)', lineHeight: 1.55 }}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      } else {
        renderedElements.push(
          <ul key={`ul-${renderedElements.length}`} style={{ paddingLeft: '1.4rem', margin: '0.65rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {listItems.map((item, idx) => (
              <li key={idx} style={{ fontSize: '0.875rem', color: 'var(--color-text-body)', lineHeight: 1.55 }}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      }
      listItems = [];
      listType = null;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const dataRows = tableRows.slice(1).filter((r) => !r.every((cell) => cell.includes('---') || cell.includes(':-')));

      renderedElements.push(
        <div key={`table-${renderedElements.length}`} className="table-container" style={{ margin: '1.25rem 0', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                {headerRow.map((cell, idx) => (
                  <th key={idx} style={{ padding: '0.65rem 0.95rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'left' }}>
                    {renderInline(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rowIdx) => (
                <tr key={rowIdx} style={{ borderTop: '1px solid var(--color-border)', backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} style={{ padding: '0.7rem 0.95rem', fontSize: '0.85rem' }}>
                      {renderTableCell(cell.trim(), cellIdx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  const flushBlockquote = () => {
    if (quoteBuffer.length > 0) {
      renderedElements.push(
        <blockquote 
          key={`bq-${renderedElements.length}`} 
          style={{ 
            borderLeft: '4px solid var(--color-primary)', 
            backgroundColor: 'var(--color-surface-subtle)', 
            padding: '0.75rem 1.15rem', 
            margin: '0.85rem 0', 
            borderRadius: '0 var(--radius-md) var(--radius-md) 0', 
            fontSize: '0.86rem',
            lineHeight: 1.6,
            color: 'var(--color-text-body)'
          }}
        >
          {quoteBuffer.map((line, qIdx) => (
            <div key={qIdx} style={{ margin: '0.25rem 0' }}>
              {renderInline(line)}
            </div>
          ))}
        </blockquote>
      );
      quoteBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith('```')) {
      flushList();
      flushTable();
      flushBlockquote();
      if (inCodeBlock) {
        inCodeBlock = false;
        const codeText = codeBuffer.join('\n');
        const blockIdx = renderedElements.length;
        renderedElements.push(
          <div 
            key={`code-${blockIdx}`} 
            style={{ 
              position: 'relative',
              margin: '1.25rem 0', 
              backgroundColor: '#0f172a', 
              color: '#f8fafc', 
              padding: '1.1rem', 
              borderRadius: 'var(--radius-md)', 
              overflowX: 'auto', 
              fontFamily: "'Plus Jakarta Sans', monospace", 
              fontSize: '0.8125rem',
              border: '1px solid #334155'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                {codeLang || 'CODE'}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeText, blockIdx)}
                style={{
                  background: 'transparent',
                  border: '1px solid #475569',
                  color: '#cbd5e1',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  cursor: 'pointer'
                }}
              >
                {copiedCodeIdx === blockIdx ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{ margin: 0, overflowX: 'auto', lineHeight: 1.5 }}>{codeText}</pre>
          </div>
        );
        codeBuffer = [];
        codeLang = '';
      } else {
        inCodeBlock = true;
        codeLang = trimmed.replace('```', '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Blockquote / Callouts: Collect consecutive lines
    if (trimmed.startsWith('>')) {
      flushList();
      flushTable();
      quoteBuffer.push(trimmed.replace(/^>\s*/, ''));
      continue;
    } else if (quoteBuffer.length > 0) {
      flushBlockquote();
    }

    // Markdown Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      flushBlockquote();
      const cells = trimmed.split('|').slice(1, -1);
      tableRows.push(cells);
      continue;
    } else if (tableRows.length > 0) {
      flushTable();
    }

    // Empty lines
    if (!trimmed) {
      flushList();
      flushBlockquote();
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      flushList();
      flushBlockquote();
      renderedElements.push(
        <h1 key={`h1-${i}`} style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '1.5rem', marginBottom: '0.65rem', color: 'var(--color-text-main)', borderBottom: '2px solid var(--color-surface-subtle-border)', paddingBottom: '0.45rem' }}>
          {renderInline(trimmed.replace('# ', ''))}
        </h1>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      flushBlockquote();
      renderedElements.push(
        <h2 key={`h2-${i}`} style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-primary-hover)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {renderInline(trimmed.replace('## ', ''))}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      flushBlockquote();
      const headingContent = trimmed.replace('### ', '').trim();
      
      // If heading is a User Story like "US-01: User Authentication" or "US-101: ..."
      const usMatch = headingContent.match(/^(US[-_]?\d+)\s*[:–-]\s*(.*)$/i);
      if (usMatch) {
        renderedElements.push(
          <div 
            key={`h3-${i}`} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.65rem', 
              marginTop: '1.35rem', 
              marginBottom: '0.45rem',
              paddingBottom: '0.35rem',
              borderBottom: '1px solid var(--color-border-light)'
            }}
          >
            <span 
              style={{ 
                fontSize: '0.75rem', 
                fontWeight: 800, 
                backgroundColor: 'var(--color-surface-subtle)', 
                color: 'var(--color-primary-hover)', 
                padding: '2px 8px', 
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-surface-subtle-border)',
                letterSpacing: '0.03em'
              }}
            >
              {usMatch[1].toUpperCase()}
            </span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
              {renderInline(usMatch[2])}
            </h3>
          </div>
        );
      } else {
        renderedElements.push(
          <h3 key={`h3-${i}`} style={{ fontSize: '1.02rem', fontWeight: 700, marginTop: '1.15rem', marginBottom: '0.4rem', color: 'var(--color-text-main)' }}>
            {renderInline(headingContent)}
          </h3>
        );
      }
      continue;
    }

    // Bullet List items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      listType = 'ul';
      listItems.push(trimmed.replace(/^[-*•]\s*/, ''));
      continue;
    }

    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      listType = 'ol';
      listItems.push(numMatch[2]);
      continue;
    }

    // Regular paragraphs
    flushList();
    flushBlockquote();
    renderedElements.push(
      <p key={`p-${i}`} style={{ margin: '0.65rem 0', fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--color-text-body)' }}>
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  flushTable();
  flushBlockquote();

  return (
    <div className="markdown-preview-body" style={{ color: 'var(--color-text-main)', fontSize: '0.875rem' }}>
      {renderedElements}
    </div>
  );
}

// Special table cell renderer to style HTTP methods and API endpoints
function renderTableCell(cellText, cellIdx) {
  const clean = cellText.replace(/^\*+|\*+$/g, '').trim().toUpperCase();

  // If first column contains an HTTP method
  if (cellIdx === 0 && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(clean)) {
    let bg = '#eff6ff';
    let text = '#2563eb';
    let border = '#bfdbfe';

    if (clean === 'GET') {
      bg = 'var(--color-surface-subtle)';
      text = 'var(--color-primary-hover)';
      border = 'var(--color-surface-subtle-border)';
    } else if (clean === 'PUT' || clean === 'PATCH') {
      bg = '#fffbeb';
      text = '#d97706';
      border = '#fde68a';
    } else if (clean === 'DELETE') {
      bg = '#fef2f2';
      text = '#dc2626';
      border = '#fecaca';
    }

    return (
      <span 
        style={{ 
          display: 'inline-block', 
          padding: '2px 8px', 
          borderRadius: '4px', 
          fontSize: '0.72rem', 
          fontWeight: 800, 
          backgroundColor: bg, 
          color: text, 
          border: `1px solid ${border}` 
        }}
      >
        {clean}
      </span>
    );
  }

  return renderInline(cellText);
}

// Inline Markdown Parser for bold, italic, code, checkmarks, badges
function renderInline(text) {
  if (!text) return null;

  // Split by inline code first
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code 
          key={idx} 
          style={{ 
            backgroundColor: '#f1f5f9', 
            padding: '1px 6px', 
            borderRadius: '4px', 
            fontFamily: "'Plus Jakarta Sans', monospace", 
            fontSize: '0.82rem',
            color: '#b91c1c',
            border: '1px solid #e2e8f0'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Handle Bold (**text**)
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return <strong key={`${idx}-${bIdx}`} style={{ color: 'var(--color-text-main)', fontWeight: 700 }}>{bPart.slice(2, -2)}</strong>;
      }

      // Handle Italic (*text*)
      const italicParts = bPart.split(/(\*[^*]+\*)/g);
      return italicParts.map((iPart, iIdx) => {
        if (iPart.startsWith('*') && iPart.endsWith('*')) {
          return <em key={`${idx}-${bIdx}-${iIdx}`}>{iPart.slice(1, -1)}</em>;
        }

        // Highlight checkmark
        if (iPart.includes('✓')) {
          const sub = iPart.split('✓');
          return (
            <span key={`${idx}-${bIdx}-${iIdx}`}>
              {sub[0]}
              <span style={{ color: 'var(--color-primary)', fontWeight: 800, marginRight: '4px' }}>✓</span>
              {sub.slice(1).join('✓')}
            </span>
          );
        }

        return iPart;
      });
    });
  });
}

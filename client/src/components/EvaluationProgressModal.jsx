import { IconSparkles, IconGithub } from './Icons';

export default function EvaluationProgressModal({ 
  isOpen, 
  currentStage, 
  stage, 
  progressPercent, 
  overallProgress, 
  repoUrl 
}) {
  if (!isOpen) return null;

  const activeStage = currentStage || stage;
  const percent = typeof progressPercent === 'number'
    ? progressPercent
    : (typeof overallProgress === 'number'
      ? overallProgress
      : (activeStage?.progressPercent || 0));

  const stageIndex = activeStage?.stageIndex !== undefined ? activeStage.stageIndex + 1 : 1;
  const totalStages = activeStage?.totalStages || 4;
  const stageMessage = activeStage?.message || 'Analyzing repository codebase...';

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '520px', textAlign: 'center', padding: '2.5rem 2rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '2px solid var(--color-surface-subtle-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)'
            }}
          >
            <span className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></span>
          </div>
        </div>

        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>
          AI Evaluation In Progress
        </h3>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          <IconGithub size={15} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>{repoUrl}</span>
        </p>

        {/* Progress Bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="bar-track" style={{ height: '10px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
            <div 
              className="bar-fill" 
              style={{ 
                width: `${percent}%`,
                background: 'linear-gradient(90deg, var(--color-primary) 0%, #22c55e 100%)',
                height: '100%',
                transition: 'width 0.4s ease'
              }}
            ></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', fontWeight: 600 }}>
            <span>Stage {stageIndex} of {totalStages}</span>
            <span style={{ color: 'var(--color-primary-hover)', fontWeight: 800 }}>{percent}%</span>
          </div>
        </div>

        {/* Current Stage Message */}
        <div 
          style={{
            backgroundColor: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-surface-subtle-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-primary-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <IconSparkles size={16} />
          <span>{stageMessage}</span>
        </div>
      </div>
    </div>
  );
}

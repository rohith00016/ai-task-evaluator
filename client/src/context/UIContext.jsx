import { createContext, useContext, useState, useCallback } from 'react';
import { IconCheck } from '../components/Icons';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPrdProject, setEditingPrdProject] = useState(null);

  const [isProjectSubmissionsOpen, setIsProjectSubmissionsOpen] = useState(false);
  const [projectForSubmissionsModal, setProjectForSubmissionsModal] = useState(null);

  // Evaluation progress modal
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [evalStage, setEvalStage] = useState(null);
  const [evaluatingRepoUrl, setEvaluatingRepoUrl] = useState('');

  // Modal actions
  const openCreateProject = useCallback((project = null) => {
    setEditingPrdProject(project);
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateProject = useCallback(() => {
    setIsCreateModalOpen(false);
    setEditingPrdProject(null);
  }, []);

  const openProjectSubmissions = useCallback((project) => {
    setProjectForSubmissionsModal(project);
    setIsProjectSubmissionsOpen(true);
  }, []);

  const closeProjectSubmissions = useCallback(() => {
    setIsProjectSubmissionsOpen(false);
    setProjectForSubmissionsModal(null);
  }, []);

  const startEvaluation = useCallback((repoUrl) => {
    setEvaluatingRepoUrl(repoUrl);
    setIsEvaluating(true);
    setEvalProgress(15);
    setEvalStage({ stageIndex: 0, totalStages: 4, message: 'Downloading full repository archive from GitHub...', progressPercent: 20 });
  }, []);

  const stopEvaluation = useCallback(() => {
    setIsEvaluating(false);
  }, []);

  // Mobile navigation drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const openMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  const toggleMobileSidebar = useCallback(() => setIsMobileSidebarOpen((prev) => !prev), []);

  const value = {
    // Toast
    toast,
    showToast,

    // Mobile sidebar
    isMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
    toggleMobileSidebar,

    // Create / Edit Project Modal
    isCreateModalOpen,
    editingPrdProject,
    openCreateProject,
    closeCreateProject,

    // Project Submissions Modal
    isProjectSubmissionsOpen,
    projectForSubmissionsModal,
    openProjectSubmissions,
    closeProjectSubmissions,

    // Evaluation Progress Modal
    isEvaluating,
    evalProgress,
    setEvalProgress,
    evalStage,
    setEvalStage,
    evaluatingRepoUrl,
    startEvaluation,
    stopEvaluation
  };

  return (
    <UIContext.Provider value={value}>
      {children}

      {/* Global Toast Notification */}
      {toast && (
        <div 
          className="toast-container"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            animation: 'fadeInUp 200ms ease'
          }}
        >
          <div 
            className="toast"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: toast.type === 'error' ? 'var(--color-danger-bg)' : toast.type === 'info' ? 'var(--color-info-bg)' : 'var(--color-surface)',
              color: toast.type === 'error' ? 'var(--color-danger-text)' : toast.type === 'info' ? 'var(--color-info-text)' : 'var(--color-text-main)',
              padding: '0.75rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${toast.type === 'error' ? 'var(--color-danger)' : toast.type === 'info' ? 'var(--color-info)' : 'var(--color-border)'}`,
              boxShadow: 'var(--shadow-md)',
              fontSize: '0.875rem',
              fontWeight: 600
            }}
          >
            {toast.type === 'error' ? (
              <span style={{ color: 'var(--color-danger)' }}>✕</span>
            ) : (
              <IconCheck size={16} className="text-primary" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

export function useToast() {
  const { showToast } = useUI();
  return { showToast };
}

export function useModals() {
  const { 
    openCreateProject, 
    closeCreateProject, 
    openProjectSubmissions, 
    closeProjectSubmissions,
    startEvaluation,
    stopEvaluation
  } = useUI();

  return {
    openCreateProject,
    closeCreateProject,
    openProjectSubmissions,
    closeProjectSubmissions,
    startEvaluation,
    stopEvaluation
  };
}

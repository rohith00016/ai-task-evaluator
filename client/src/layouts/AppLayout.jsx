import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import CreateProjectModal from '../components/CreateProjectModal';
import ProjectSubmissionsModal from '../components/ProjectSubmissionsModal';
import EvaluationProgressModal from '../components/EvaluationProgressModal';
import { useUI, useToast } from '../context/UIContext';
import { useProjects, useSaveProjectMutation } from '../hooks/useProjectsQuery';
import { useSubmissions } from '../hooks/useSubmissionsQuery';

export default function AppLayout() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();
  const { data: submissions = [], isLoading: isSubmissionsLoading } = useSubmissions();
  const saveProjectMutation = useSaveProjectMutation();
  const { showToast } = useToast();

  const {
    isCreateModalOpen,
    editingPrdProject,
    closeCreateProject,
    isProjectSubmissionsOpen,
    projectForSubmissionsModal,
    closeProjectSubmissions,
    isEvaluating,
    evalStage,
    evalProgress,
    evaluatingRepoUrl,
    isMobileSidebarOpen,
    closeMobileSidebar
  } = useUI();

  const isLoading = isProjectsLoading || isSubmissionsLoading;

  const handleSaveProject = async (projectData) => {
    try {
      const saved = await saveProjectMutation.mutateAsync(projectData);
      showToast(`Project "${saved.title}" saved to database!`);
      closeCreateProject();
    } catch (err) {
      console.error('Failed to save project:', err);
      showToast(`Save Project Error: ${err.message}`, 'error');
    }
  };

  const handleViewEvaluation = (submission) => {
    closeProjectSubmissions();
    navigate(`/evaluations/${submission.id || submission._id}`);
  };

  return (
    <div className="app-container">
      {/* Dynamic Role-Aware Sidebar */}
      <Sidebar
        projectsCount={projects.length}
        submissionsCount={submissions.length}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {/* Main Workspace Body */}
      <main className="main-content">
        <Header />
        <div className="page-wrapper">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              <div 
                className="spinner" 
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderTopColor: 'var(--color-primary)', 
                  margin: '0 auto 1rem' 
                }}
              />
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading projects...</p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      {/* Global Admin Create / Edit Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateProject}
        onSaveProject={handleSaveProject}
        project={editingPrdProject}
      />

      {/* Global Project Submissions Drawer Modal */}
      <ProjectSubmissionsModal
        isOpen={isProjectSubmissionsOpen}
        onClose={closeProjectSubmissions}
        project={projectForSubmissionsModal}
        submissions={submissions}
        onViewEvaluation={handleViewEvaluation}
      />

      {/* Global Evaluation In-Progress Modal */}
      <EvaluationProgressModal
        isOpen={isEvaluating}
        currentStage={evalStage}
        stage={evalStage}
        progressPercent={evalProgress}
        overallProgress={evalProgress}
        repoUrl={evaluatingRepoUrl}
      />
    </div>
  );
}

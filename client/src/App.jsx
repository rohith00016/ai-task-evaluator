import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CreateProjectModal from './components/CreateProjectModal';
import EvaluationProgressModal from './components/EvaluationProgressModal';
import ProjectSubmissionsModal from './components/ProjectSubmissionsModal';

import AdminProjectsView from './views/AdminProjectsView';
import LearnerBrowseView from './views/LearnerBrowseView';
import ProjectDetailSubmissionView from './views/ProjectDetailSubmissionView';
import EvaluationResultView from './views/EvaluationResultView';
import LearnerSubmissionsView from './views/LearnerSubmissionsView';

import { 
  fetchProjects, 
  fetchProjectById,
  fetchSubmissions, 
  createProject, 
  updateProject, 
  deleteProject, 
  submitAndEvaluate, 
  reevaluateSubmission,
  getProjectPRDMarkdown 
} from './services/api';
import { IconCheck } from './components/Icons';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('All');
  
  // Selection states for modal operations
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [projectForSubmissionsModal, setProjectForSubmissionsModal] = useState(null);
  const [editingPrdProject, setEditingPrdProject] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProjectSubmissionsOpen, setIsProjectSubmissionsOpen] = useState(false);

  // Evaluation in-progress state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [evalStage, setEvalStage] = useState(null);
  const [evaluatingRepoUrl, setEvaluatingRepoUrl] = useState('');

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // Centralized data fetcher:
  // silent = false: shows initial full-page spinner
  // silent = true: revalidates in the background without UI interruption
  const loadData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [projs, subs] = await Promise.all([
        fetchProjects(),
        fetchSubmissions()
      ]);
      setProjects(projs);
      setSubmissions(subs);
    } catch (err) {
      console.error('Failed to load data from backend:', err);
      if (!silent) {
        showToast('Could not load data from backend', 'error');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const isInitialMount = useRef(true);

  // Fetch initial data on mount and silently revalidate on route transitions
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData(false);
    } else {
      loadData(true);
    }
  }, [location.pathname]);

  const handleSaveProject = async (projectData) => {
    if (projectData.id || projectData._id) {
      const projectId = projectData.id || projectData._id;
      try {
        const updated = await updateProject(projectId, projectData);
        setProjects(projects.map((p) => (p.id === projectId || p._id === projectId ? updated : p)));
        showToast(`Project "${updated.title}" updated in database!`);
        loadData(true);
      } catch (err) {
        console.error('Failed to update project:', err);
        alert(`Update Project Error: ${err.message}`);
      }
    } else {
      try {
        const saved = await createProject(projectData);
        setProjects([saved, ...projects]);
        showToast(`Project "${saved.title}" published to database!`);
        loadData(true);
      } catch (err) {
        console.error('Failed to create project:', err);
        alert(`Save Project Error: ${err.message}`);
      }
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
      setSubmissions(submissions.filter((s) => s.projectId !== projectId));
      showToast('Project and submissions deleted from database', 'info');
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert(`Delete Error: ${err.message}`);
    }
  };

  const handleSelectProject = (proj) => {
    navigate(`/learner/projects/${proj.id || proj._id}`);
  };

  const handleSelectProjectById = (projectId) => {
    navigate(`/learner/projects/${projectId}`);
  };

  const handleViewEvaluation = (submission) => {
    setSelectedSubmission(submission);
    navigate(`/evaluations/${submission.id || submission._id}`);
  };

  const handleOpenProjectSubmissions = (proj) => {
    setProjectForSubmissionsModal(proj);
    setIsProjectSubmissionsOpen(true);
  };

  // Submission & Real Codebase Evaluation workflow
  const handleSubmitRepo = async (submissionData) => {
    const currentProj = projects.find((p) => p.id === submissionData.projectId || p._id === submissionData.projectId);
    if (!currentProj) return;

    setEvaluatingRepoUrl(submissionData.repoUrl);
    setIsEvaluating(true);
    setEvalProgress(15);
    setEvalStage({ stageIndex: 0, totalStages: 4, message: 'Downloading full repository archive from GitHub...', progressPercent: 20 });

    const timer1 = setTimeout(() => {
      setEvalProgress(45);
      setEvalStage({ stageIndex: 1, totalStages: 4, message: 'Unpacking source code files & analyzing architecture...', progressPercent: 45 });
    }, 1000);

    const timer2 = setTimeout(() => {
      setEvalProgress(75);
      setEvalStage({ stageIndex: 2, totalStages: 4, message: 'Inspecting code lines with Gemini 2.5 Flash against PRD...', progressPercent: 75 });
    }, 2200);

    try {
      const newSubmission = await submitAndEvaluate({
        projectId: currentProj.id,
        repoUrl: submissionData.repoUrl,
        branch: submissionData.branch || 'main',
        notes: submissionData.notes || ''
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      setEvalProgress(100);
      setEvalStage({ stageIndex: 3, totalStages: 4, message: 'Evaluation completed! Saved to MongoDB.', progressPercent: 100 });
      await new Promise((r) => setTimeout(r, 500));

      setSubmissions([newSubmission, ...submissions]);
      setIsEvaluating(false);
      setSelectedSubmission(newSubmission);
      navigate(`/evaluations/${newSubmission.id || newSubmission._id}`);
      showToast(`Evaluation completed! Overall Score: ${newSubmission.score}/100`);
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      console.error('Submission evaluation failed:', err);
      setIsEvaluating(false);
      showToast(err.message || 'Evaluation failed. Please verify GitHub repo URL.', 'error');
      throw err;
    }
  };

  const handleReevaluate = async (submission) => {
    setEvaluatingRepoUrl(submission.repoUrl);
    setIsEvaluating(true);
    setEvalProgress(35);
    setEvalStage({ stageIndex: 1, totalStages: 3, message: 'Re-evaluating code files with Gemini 2.5 Flash...', progressPercent: 50 });

    try {
      const updatedSubmission = await reevaluateSubmission(submission.id || submission._id);
      setSubmissions(submissions.map((s) => (s.id === submission.id ? updatedSubmission : s)));
      setSelectedSubmission(updatedSubmission);
      setIsEvaluating(false);
      navigate(`/evaluations/${updatedSubmission.id || updatedSubmission._id}`);
      showToast(`Re-evaluation completed! New Score: ${updatedSubmission.score}/100`);
    } catch (err) {
      console.error('Re-evaluation failed:', err);
      setIsEvaluating(false);
      showToast(err.message || 'Re-evaluation failed. Repository may be private or invalid.', 'error');
    }
  };

  return (
    <div className="app-container">
      {/* Left Collapsible & Hover-Sensitive Sidebar */}
      <Sidebar
        projectsCount={projects.length}
        submissionsCount={submissions.length}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <Header
          onOpenCreateModal={() => {
            setEditingPrdProject(null);
            setIsCreateModalOpen(true);
          }}
        />

        <div className="page-wrapper">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              <div className="spinner" style={{ width: '28px', height: '28px', borderTopColor: 'var(--color-primary)', margin: '0 auto 1rem' }}></div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading benchmarks from MongoDB...</p>
            </div>
          ) : (
            <Routes>
              {/* Default & Admin Routes */}
              <Route path="/" element={<Navigate to="/admin/projects" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/projects" replace />} />
              <Route 
                path="/admin/projects" 
                element={
                  <AdminProjectsView
                    projects={projects}
                    submissions={submissions}
                    onOpenCreateModal={() => {
                      setEditingPrdProject(null);
                      setIsCreateModalOpen(true);
                    }}
                    onSelectProject={handleSelectProject}
                    onDeleteProject={handleDeleteProject}
                    onViewProjectSubmissions={handleOpenProjectSubmissions}
                    onEditProjectPRD={async (proj) => {
                      setEditingPrdProject(proj);
                      setIsCreateModalOpen(true);
                      try {
                        const fullProj = await fetchProjectById(proj.id || proj._id);
                        if (fullProj) {
                          setEditingPrdProject(fullProj);
                        }
                      } catch (err) {
                        console.error('Failed to fetch full project details:', err);
                      }
                    }}
                    selectedCourse={selectedCourse}
                    onSelectCourse={setSelectedCourse}
                  />
                } 
              />

              {/* Learner Routes */}
              <Route 
                path="/learner/browse" 
                element={
                  <LearnerBrowseView
                    projects={projects}
                    submissions={submissions}
                    onSelectProject={handleSelectProject}
                  />
                } 
              />
              <Route 
                path="/learner/projects/:id" 
                element={
                  <ProjectDetailSubmissionView
                    projects={projects}
                    submissions={submissions}
                    onSubmitRepo={handleSubmitRepo}
                    onViewEvaluation={handleViewEvaluation}
                    onBack={() => navigate('/learner/browse')}
                  />
                } 
              />
              <Route 
                path="/learner/submissions" 
                element={
                  <LearnerSubmissionsView
                    submissions={submissions}
                    onViewEvaluation={handleViewEvaluation}
                    onSelectProjectById={handleSelectProjectById}
                  />
                } 
              />

              {/* Evaluation Route */}
              <Route 
                path="/evaluations/:submissionId" 
                element={
                  <EvaluationResultView
                    submission={selectedSubmission}
                    onReevaluate={handleReevaluate}
                    onBack={() => navigate('/learner/submissions')}
                  />
                } 
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/admin/projects" replace />} />
            </Routes>
          )}
        </div>
      </main>

      {/* Modals & Overlays */}
      {/* Create & Edit Project Modal with 3-Step PRD, Deliverables & Criteria Layout */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPrdProject(null);
        }}
        onSaveProject={handleSaveProject}
        project={editingPrdProject}
      />

      <EvaluationProgressModal
        isOpen={isEvaluating}
        currentStage={evalStage}
        progressPercent={evalProgress}
        repoUrl={evaluatingRepoUrl}
      />

      <ProjectSubmissionsModal
        isOpen={isProjectSubmissionsOpen}
        onClose={() => setIsProjectSubmissionsOpen(false)}
        project={projectForSubmissionsModal}
        submissions={submissions}
        onViewEvaluation={(sub) => {
          setIsProjectSubmissionsOpen(false);
          handleViewEvaluation(sub);
        }}
      />

      {/* Toast Feedback */}
      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <IconCheck size={16} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

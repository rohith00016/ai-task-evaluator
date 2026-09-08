import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import { UIProvider } from './context/UIContext';
import { useAuth } from './context/AuthContext';

import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import AdminProjectsView from './views/AdminProjectsView';
import AdminSubmissionsView from './views/AdminSubmissionsView';
import LearnerBrowseView from './views/LearnerBrowseView';
import ProjectDetailSubmissionView from './views/ProjectDetailSubmissionView';
import EvaluationResultView from './views/EvaluationResultView';
import LearnerSubmissionsView from './views/LearnerSubmissionsView';

export default function App() {
  const { isAdmin } = useAuth();

  return (
    <UIProvider>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<LoginView />} />
        <Route path="/register" element={<RegisterView />} />

        {/* Protected Application Area */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Default Route: Redirects based on role */}
          <Route path="/" element={<Navigate to={isAdmin ? "/admin/projects" : "/learner/browse"} replace />} />

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<Navigate to="/admin/projects" replace />} />
            <Route path="/admin/projects" element={<AdminProjectsView />} />
            <Route path="/admin/submissions" element={<AdminSubmissionsView />} />
          </Route>

          {/* Learner Protected Routes (Admins are automatically redirected to admin portal) */}
          <Route 
            path="/learner/browse" 
            element={isAdmin ? <Navigate to="/admin/projects" replace /> : <LearnerBrowseView />} 
          />
          <Route path="/learner/projects/:id" element={<ProjectDetailSubmissionView />} />
          <Route 
            path="/learner/submissions" 
            element={isAdmin ? <Navigate to="/admin/submissions" replace /> : <LearnerSubmissionsView />} 
          />

          {/* Evaluation Result Route */}
          <Route path="/evaluations/:submissionId" element={<EvaluationResultView />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </UIProvider>
  );
}

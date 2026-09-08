import { Router } from 'express';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from '../controllers/projectController.js';
import {
  getAllSubmissions,
  getSubmissionById,
  evaluateSubmission,
  reevaluateSubmission
} from '../controllers/submissionController.js';
import {
  formatPRD,
  generateDeliverables,
  generateCriteria
} from '../controllers/aiController.js';
import {
  authenticateToken,
  authorizeRoles
} from '../middleware/authMiddleware.js';

const router = Router();

// Project routes
router.get('/projects', authenticateToken, getAllProjects);
router.get('/projects/:id', authenticateToken, getProjectById);
router.post('/projects', authenticateToken, authorizeRoles('admin'), createProject);
router.put('/projects/:id', authenticateToken, authorizeRoles('admin'), updateProject);
router.delete('/projects/:id', authenticateToken, authorizeRoles('admin'), deleteProject);

// Submission routes
router.get('/submissions', authenticateToken, getAllSubmissions);
router.post('/submissions/evaluate', authenticateToken, evaluateSubmission);
router.get('/submissions/:id', authenticateToken, getSubmissionById);
router.post('/submissions/:id/reevaluate', authenticateToken, reevaluateSubmission);

// AI utilities (Admin only)
router.post('/ai/format-prd', authenticateToken, authorizeRoles('admin'), formatPRD);
router.post('/ai/generate-deliverables', authenticateToken, authorizeRoles('admin'), generateDeliverables);
router.post('/ai/generate-criteria', authenticateToken, authorizeRoles('admin'), generateCriteria);

export default router;

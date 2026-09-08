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

const router = Router();

// Project routes
router.get('/projects', getAllProjects);
router.post('/projects', createProject);
router.get('/projects/:id', getProjectById);
router.put('/projects/:id', updateProject);
router.delete('/projects/:id', deleteProject);

// Submission routes
router.get('/submissions', getAllSubmissions);
router.post('/submissions/evaluate', evaluateSubmission);
router.get('/submissions/:id', getSubmissionById);
router.post('/submissions/:id/reevaluate', reevaluateSubmission);

// AI utilities
router.post('/ai/format-prd', formatPRD);
router.post('/ai/generate-deliverables', generateDeliverables);
router.post('/ai/generate-criteria', generateCriteria);

export default router;

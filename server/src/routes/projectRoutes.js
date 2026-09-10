import { Router } from 'express';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from '../controllers/projectController.js';
import {
  authenticateToken,
  authorizeRoles
} from '../middleware/authMiddleware.js';

const router = Router();

// All project endpoints require authentication
router.use(authenticateToken);

// Read routes
router.get('/', getAllProjects);
router.get('/:id', getProjectById);

// Admin-only mutation routes
router.post('/', authorizeRoles('admin'), createProject);
router.put('/:id', authorizeRoles('admin'), updateProject);
router.delete('/:id', authorizeRoles('admin'), deleteProject);

export default router;

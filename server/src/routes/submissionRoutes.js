import { Router } from 'express';
import {
  getAllSubmissions,
  getSubmissionById,
  evaluateSubmission,
  reevaluateSubmission
} from '../controllers/submissionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// All submission routes require authentication
router.use(authenticateToken);

// Read routes
router.get('/', getAllSubmissions);
router.get('/:id', getSubmissionById);

// Evaluation routes
router.post('/evaluate', evaluateSubmission);
router.post('/:id/reevaluate', reevaluateSubmission);

export default router;

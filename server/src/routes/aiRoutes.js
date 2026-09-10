import { Router } from 'express';
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

// All AI utility routes require admin authentication
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/format-prd', formatPRD);
router.post('/generate-deliverables', generateDeliverables);
router.post('/generate-criteria', generateCriteria);

export default router;

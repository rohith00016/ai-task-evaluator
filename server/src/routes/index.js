import { Router } from 'express';
import authRoutes from './authRoutes.js';
import projectRoutes from './projectRoutes.js';
import submissionRoutes from './submissionRoutes.js';
import aiRoutes from './aiRoutes.js';

const router = Router();

// Sub-domain routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/submissions', submissionRoutes);
router.use('/ai', aiRoutes);

export default router;

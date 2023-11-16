import { Router } from 'express';
import sessionRoutes from './session';
import messageRoutes from './message';

const router = Router();
router.use('/sessions', sessionRoutes);
router.use('/:sessionId/messages', messageRoutes);

export default router;
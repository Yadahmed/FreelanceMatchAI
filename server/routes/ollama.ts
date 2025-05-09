import { Router } from 'express';
import { 
  processOllamaMessage, 
  processOllamaJobRequest, 
  checkOllamaStatus 
} from '../controllers/ollamaController';
import { authenticateUser, requireAuth } from '../middleware/auth';

const router = Router();

// Public endpoint to check AI status
router.get('/status', checkOllamaStatus);

// Protected endpoints requiring authentication
router.use(authenticateUser);
router.post('/message', requireAuth, processOllamaMessage);
router.post('/job-analysis', requireAuth, processOllamaJobRequest);

export default router;
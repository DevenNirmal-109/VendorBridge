import { Router } from 'express';
import { getActivityLogs } from '../controllers/logsController';
import { verifyToken, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, roleGuard('admin', 'procurement'), getActivityLogs);

export default router;


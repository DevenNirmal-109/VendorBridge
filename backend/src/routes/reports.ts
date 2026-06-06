import { Router } from 'express';
import { getSpendReport } from '../controllers/reportsController';
import { verifyToken, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/spend', verifyToken, roleGuard('admin', 'procurement'), getSpendReport);

export default router;


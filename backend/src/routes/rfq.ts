import { Router } from 'express';
import {
  getRfqs,
  getRfqById,
  createRfq,
  updateRfqStatus,
} from '../controllers/rfqController';
import { verifyToken, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, getRfqs);
router.get('/:id', verifyToken, getRfqById);
router.post('/', verifyToken, roleGuard('procurement'), createRfq);
router.patch('/:id/status', verifyToken, roleGuard('procurement'), updateRfqStatus);

export default router;


import { Router } from 'express';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotationStatus,
} from '../controllers/quotationsController';
import { verifyToken, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, getQuotations);
router.get('/:id', verifyToken, getQuotationById);
router.post('/', verifyToken, roleGuard('vendor'), createQuotation);
router.patch('/:id/status', verifyToken, roleGuard('procurement'), updateQuotationStatus);

export default router;


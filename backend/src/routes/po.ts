import { Router } from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  issuePurchaseOrder,
  acknowledgePurchaseOrder,
  generatePoPdf,
} from '../controllers/poController';
import { verifyToken, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, getPurchaseOrders);
router.get('/:id', verifyToken, getPurchaseOrderById);
router.post('/:id/issue', verifyToken, roleGuard('procurement'), issuePurchaseOrder);
router.patch('/:id/acknowledge', verifyToken, roleGuard('vendor'), acknowledgePurchaseOrder);
router.get('/:id/pdf', verifyToken, generatePoPdf);

export default router;


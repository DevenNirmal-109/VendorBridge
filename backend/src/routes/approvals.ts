import { Router } from 'express';
import {
  getApprovals,
  getApprovalById,
  createApprovalRequest,
  actionApproval,
} from '../controllers/approvalController';
import { verifyToken, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, getApprovals);
router.get('/:id', verifyToken, getApprovalById);
router.post('/', verifyToken, roleGuard('procurement'), createApprovalRequest);
router.patch('/:id', verifyToken, roleGuard('approver'), actionApproval);

export default router;


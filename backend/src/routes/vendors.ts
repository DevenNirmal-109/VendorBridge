import { Router } from 'express';
import {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorStatus,
} from '../controllers/vendorsController';
import { verifyToken, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, getVendors);
router.get('/:id', verifyToken, getVendorById);
router.post('/', verifyToken, roleGuard('admin', 'procurement'), createVendor);
router.put('/:id', verifyToken, roleGuard('admin', 'procurement'), updateVendor);
router.patch('/:id/status', verifyToken, roleGuard('admin'), updateVendorStatus);

export default router;


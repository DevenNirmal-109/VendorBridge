import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
  sendInvoiceEmail,
} from '../controllers/invoiceController';
import { verifyToken, roleGuard } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, getInvoices);
router.get('/:id', verifyToken, getInvoiceById);
router.post('/', verifyToken, roleGuard('vendor'), createInvoice);
router.patch('/:id/status', verifyToken, roleGuard('procurement'), updateInvoiceStatus);
router.post('/:id/send-email', verifyToken, sendInvoiceEmail);

export default router;


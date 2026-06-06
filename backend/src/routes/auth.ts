import { Router } from 'express';
import { signup, login, forgotPassword, getMe, getApprovers } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.get('/me', verifyToken, getMe);
router.get('/approvers', verifyToken, getApprovers);

export default router;

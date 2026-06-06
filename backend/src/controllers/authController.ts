import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { signupSchema, loginSchema, forgotPasswordSchema } from '../utils/validators';
import { logActivity } from '../utils/activityLogger';

const SALT_ROUNDS = 12;

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
export const signup = async (req: Request, res: Response): Promise<void> => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { name, email, password, role } = parsed.data;

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: role as any },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // Issue JWT
    const token = issueToken(user.id, user.email, user.role, null);

    await logActivity({
      userId: user.id,
      eventType: 'user_registered',
      entityType: 'user',
      entityId: user.id,
      description: `New user registered: ${user.name} (${user.role})`,
    });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = issueToken(user.id, user.email, user.role, user.orgId);

    await logActivity({
      userId: user.id,
      eventType: 'user_login',
      entityType: 'user',
      entityId: user.id,
      description: `User logged in: ${user.name}`,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { email } = parsed.data;

  try {
    // Always return 200 to prevent email enumeration attacks
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // In a production app, send a real reset email here
      // For MVP: log the action and return success
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      await logActivity({
        userId: user.id,
        eventType: 'password_reset_requested',
        entityType: 'user',
        entityId: user.id,
        description: `Password reset requested for ${user.email}`,
      });

      console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, orgId: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/auth/approvers ──────────────────────────────────────────────────
export const getApprovers = async (req: Request, res: Response): Promise<void> => {
  try {
    const approvers = await prisma.user.findMany({
      where: { role: 'approver', isActive: true },
      select: { id: true, name: true, email: true },
    });
    res.json({ approvers });
  } catch (err) {
    console.error('Get approvers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Helper ────────────────────────────────────────────────────────────────────
function issueToken(userId: string, email: string, role: string, orgId: string | null): string {
  return jwt.sign(
    { userId, email, role, orgId },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as any }
  );
}

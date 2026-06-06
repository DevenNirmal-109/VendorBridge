import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// ── GET /api/logs ────────────────────────────────────────────────────────────
export const getActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Return the 100 most recent logs
    });

    res.json({ logs });
  } catch (err) {
    console.error('getActivityLogs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

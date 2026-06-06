import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// ── GET /api/reports/spend ───────────────────────────────────────────────────
export const getSpendReport = async (req: Request, res: Response): Promise<void> => {
  const { startDate, endDate, category } = req.query;

  try {
    let whereClause: any = {
      status: { not: 'draft' },
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate as string);
      }
    }

    if (category) {
      whereClause.approval = {
        rfq: {
          category: category as string,
        },
      };
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: { name: true, category: true, gstNumber: true },
        },
        approval: {
          include: {
            rfq: {
              select: { rfqNumber: true, title: true, category: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data for table/CSV export
    const reportData = pos.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      date: po.createdAt.toISOString().split('T')[0],
      rfqNumber: po.approval.rfq.rfqNumber,
      rfqTitle: po.approval.rfq.title,
      category: po.approval.rfq.category || 'Uncategorized',
      vendorName: po.vendor.name,
      vendorGst: po.vendor.gstNumber,
      subtotal: Number(po.subtotal),
      gstAmount: Number(po.gstAmount),
      total: Number(po.total),
      status: po.status,
    }));

    res.json({ data: reportData });
  } catch (err) {
    console.error('getSpendReport error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

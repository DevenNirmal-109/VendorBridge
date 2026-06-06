import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// ── GET /api/dashboard/stats ──────────────────────────────────────────────────
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    if (userRole === 'vendor') {
      // Find vendor profile
      const vendor = await prisma.vendor.findFirst({
        where: { email: userEmail },
      });

      if (!vendor) {
        res.json({
          role: 'vendor',
          stats: {
            assignedRfqsCount: 0,
            submittedQuotesCount: 0,
            pendingPOsCount: 0,
            totalEarnings: 0,
            monthlySpend: [],
          },
        });
        return;
      }

      // Vendor stats
      const assignedRfqsCount = await prisma.rfq.count({
        where: {
          vendorAssignments: {
            some: { vendorId: vendor.id },
          },
          status: { not: 'draft' },
        },
      });

      const submittedQuotesCount = await prisma.quotation.count({
        where: { vendorId: vendor.id },
      });

      const pendingPOsCount = await prisma.purchaseOrder.count({
        where: {
          vendorId: vendor.id,
          status: 'issued', // Vendor needs to acknowledge these
        },
      });

      const invoices = await prisma.invoice.findMany({
        where: {
          po: { vendorId: vendor.id },
          status: 'paid',
        },
        include: { po: true },
      });
      const totalEarnings = invoices.reduce((sum, inv) => sum + Number(inv.po.total), 0);

      // Monthly earnings (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const paidPOs = await prisma.purchaseOrder.findMany({
        where: {
          vendorId: vendor.id,
          status: 'completed',
          createdAt: { gte: sixMonthsAgo },
        },
        select: { total: true, createdAt: true },
      });

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlySpendMap = new Map<string, number>();

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
        monthlySpendMap.set(key, 0);
      }

      for (const po of paidPOs) {
        const poDate = po.createdAt;
        const key = `${months[poDate.getMonth()]} ${poDate.getFullYear().toString().slice(2)}`;
        if (monthlySpendMap.has(key)) {
          monthlySpendMap.set(key, monthlySpendMap.get(key)! + Number(po.total));
        }
      }

      const monthlySpend = Array.from(monthlySpendMap.entries()).map(([month, amount]) => ({
        month,
        amount,
      }));

      res.json({
        role: 'vendor',
        stats: {
          assignedRfqsCount,
          submittedQuotesCount,
          pendingPOsCount,
          totalEarnings,
          monthlySpend,
        },
      });
    } else {
      // Admin, Procurement, and Approvers see central dashboard
      const rfqsCount = await prisma.rfq.count();
      const openRfqsCount = await prisma.rfq.count({ where: { status: 'open' } });
      const vendorsCount = await prisma.vendor.count({ where: { status: 'active' } });
      
      let pendingApprovalsCount = 0;
      if (userRole === 'approver') {
        pendingApprovalsCount = await prisma.approval.count({
          where: { approverId: userId, status: 'pending' },
        });
      } else {
        pendingApprovalsCount = await prisma.approval.count({
          where: { status: 'pending' },
        });
      }

      // Total PO spend
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: { status: { not: 'draft' } },
        select: { total: true },
      });
      const totalSpend = purchaseOrders.reduce((sum, po) => sum + Number(po.total), 0);

      // Spend by RFQ Category
      const posWithRfq = await prisma.purchaseOrder.findMany({
        where: { status: { not: 'draft' } },
        include: {
          approval: {
            include: {
              rfq: {
                select: { category: true },
              },
            },
          },
        },
      });

      const categorySpendMap = new Map<string, number>();
      for (const po of posWithRfq) {
        const cat = po.approval.rfq.category || 'Uncategorized';
        categorySpendMap.set(cat, (categorySpendMap.get(cat) || 0) + Number(po.total));
      }
      const categorySpend = Array.from(categorySpendMap.entries()).map(([category, amount]) => ({
        category,
        amount,
      }));

      // Monthly Spend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const allPOs = await prisma.purchaseOrder.findMany({
        where: {
          status: { not: 'draft' },
          createdAt: { gte: sixMonthsAgo },
        },
        select: { total: true, createdAt: true },
      });

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlySpendMap = new Map<string, number>();

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
        monthlySpendMap.set(key, 0);
      }

      for (const po of allPOs) {
        const poDate = po.createdAt;
        const key = `${months[poDate.getMonth()]} ${poDate.getFullYear().toString().slice(2)}`;
        if (monthlySpendMap.has(key)) {
          monthlySpendMap.set(key, monthlySpendMap.get(key)! + Number(po.total));
        }
      }

      const monthlySpend = Array.from(monthlySpendMap.entries()).map(([month, amount]) => ({
        month,
        amount,
      }));

      // Recent 5 activities
      const recentActivities = await prisma.activityLog.findMany({
        include: {
          user: {
            select: { name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      res.json({
        role: userRole,
        stats: {
          rfqsCount,
          openRfqsCount,
          vendorsCount,
          pendingApprovalsCount,
          totalSpend,
          categorySpend,
          monthlySpend,
          recentActivities,
        },
      });
    }
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

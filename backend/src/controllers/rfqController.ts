import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { rfqSchema } from '../utils/validators';
import { logActivity } from '../utils/activityLogger';

// Helper to generate a unique RFQ number
const generateRfqNumber = async (): Promise<string> => {
  const count = await prisma.rfq.count();
  const index = String(count + 1).padStart(4, '0');
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `VB-RFQ-${dateStr}-${index}`;
};

// ── GET /api/rfq ─────────────────────────────────────────────────────────────
export const getRfqs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    let rfqs;

    if (userRole === 'vendor') {
      // Find the vendor profile matching the user's email
      const vendor = await prisma.vendor.findFirst({
        where: { email: userEmail },
      });

      if (!vendor) {
        res.json({ rfqs: [] });
        return;
      }

      // Find RFQs assigned to this vendor
      rfqs = await prisma.rfq.findMany({
        where: {
          vendorAssignments: {
            some: { vendorId: vendor.id },
          },
          status: { not: 'draft' }, // Vendors should not see draft RFQs
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Admin, Procurement, and Approver see all RFQs
      rfqs = await prisma.rfq.findMany({
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          vendorAssignments: {
            include: {
              vendor: {
                select: { id: true, name: true, category: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({ rfqs });
  } catch (err) {
    console.error('getRfqs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/rfq/:id ─────────────────────────────────────────────────────────
export const getRfqById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userRole = req.user?.role;
  const userEmail = req.user?.email;

  try {
    const rfq = (await prisma.rfq.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        items: true,
        vendorAssignments: {
          include: {
            vendor: {
              select: { id: true, name: true, category: true, email: true },
            },
          },
        },
        quotations: {
          include: {
            vendor: {
              select: { id: true, name: true, category: true },
            },
          },
        },
      },
    })) as any;

    if (!rfq) {
      res.status(404).json({ error: 'RFQ not found' });
      return;
    }

    // Access control for vendors: check if they are assigned to this RFQ
    if (userRole === 'vendor') {
      const isAssigned = rfq.vendorAssignments.some((v) => v.vendor.email === userEmail);
      if (!isAssigned) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not assigned to this RFQ' });
        return;
      }

      // Hide other vendors' quotes and other vendor details
      rfq.quotations = rfq.quotations.filter((q) => q.vendor.email === userEmail);
      rfq.vendorAssignments = rfq.vendorAssignments.filter((v) => v.vendor.email === userEmail);
    }

    res.json({ rfq });
  } catch (err) {
    console.error('getRfqById error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/rfq ────────────────────────────────────────────────────────────
export const createRfq = async (req: Request, res: Response): Promise<void> => {
  const parsed = rfqSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { title, description, category, deadline, items, assignedVendorIds } = parsed.data;
  const createdBy = req.user!.userId;

  try {
    const rfqNumber = await generateRfqNumber();

    const rfq = await prisma.$transaction(async (tx) => {
      // 1. Create RFQ
      const newRfq = await tx.rfq.create({
        data: {
          rfqNumber,
          title,
          description,
          category,
          deadline: new Date(deadline),
          createdBy,
          status: 'open', // Automatically publish as open
        },
      });

      // 2. Create Items
      await tx.rfqItem.createMany({
        data: items.map((item) => ({
          rfqId: newRfq.id,
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          estPrice: item.estPrice,
        })),
      });

      // 3. Assign Vendors
      await tx.rfqVendorAssignment.createMany({
        data: assignedVendorIds.map((vendorId) => ({
          rfqId: newRfq.id,
          vendorId,
        })),
      });

      return newRfq;
    });

    await logActivity({
      userId: createdBy,
      eventType: 'rfq_created',
      entityType: 'rfq',
      entityId: rfq.id,
      description: `Created RFQ ${rfq.rfqNumber}: ${rfq.title}`,
    });

    res.status(201).json({ rfq });
  } catch (err) {
    console.error('createRfq error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PATCH /api/rfq/:id/status ────────────────────────────────────────────────
export const updateRfqStatus = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!['draft', 'open', 'closed', 'awarded', 'cancelled'].includes(status)) {
    res.status(400).json({ error: 'Invalid status value' });
    return;
  }

  try {
    const existing = await prisma.rfq.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'RFQ not found' });
      return;
    }

    const rfq = await prisma.rfq.update({
      where: { id },
      data: { status: status as any },
    });

    await logActivity({
      userId: req.user!.userId,
      eventType: 'rfq_status_updated',
      entityType: 'rfq',
      entityId: rfq.id,
      description: `RFQ ${rfq.rfqNumber} status changed to ${status}`,
    });

    res.json({ rfq });
  } catch (err) {
    console.error('updateRfqStatus error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { quotationSchema } from '../utils/validators';
import { logActivity } from '../utils/activityLogger';

// ── GET /api/quotations ──────────────────────────────────────────────────────
export const getQuotations = async (req: Request, res: Response): Promise<void> => {
  const { rfqId } = req.query;

  try {
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    let whereClause: any = {};

    if (rfqId) {
      whereClause.rfqId = rfqId as string;
    }

    if (userRole === 'vendor') {
      const vendor = await prisma.vendor.findFirst({
        where: { email: userEmail },
      });

      if (!vendor) {
        res.json({ quotations: [] });
        return;
      }
      whereClause.vendorId = vendor.id;
    }

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: { id: true, name: true, category: true },
        },
        rfq: {
          select: { id: true, rfqNumber: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ quotations });
  } catch (err) {
    console.error('getQuotations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/quotations/:id ──────────────────────────────────────────────────
export const getQuotationById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userRole = req.user?.role;
  const userEmail = req.user?.email;

  try {
    const quotation = (await prisma.quotation.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, name: true, category: true, email: true, phone: true, address: true },
        },
        rfq: {
          select: { id: true, rfqNumber: true, title: true, deadline: true },
        },
        items: {
          include: {
            rfqItem: {
              select: { itemName: true, quantity: true, unit: true },
            },
          },
        },
      },
    })) as any;

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    // Access control for vendors: check if it belongs to them
    if (userRole === 'vendor' && quotation.vendor.email !== userEmail) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this quotation' });
      return;
    }

    res.json({ quotation });
  } catch (err) {
    console.error('getQuotationById error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/quotations ─────────────────────────────────────────────────────
export const createQuotation = async (req: Request, res: Response): Promise<void> => {
  const parsed = quotationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { rfqId, vendorId, deliveryDays, notes, items } = parsed.data;

  try {
    // 1. Verify RFQ exists and is open
    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
      include: { items: true },
    });

    if (!rfq) {
      res.status(404).json({ error: 'RFQ not found' });
      return;
    }

    if (rfq.status !== 'open') {
      res.status(400).json({ error: 'RFQ is not open for bidding' });
      return;
    }

    // Check if vendor has already submitted a quote for this RFQ
    const existing = await prisma.quotation.findFirst({
      where: { rfqId, vendorId },
    });

    if (existing) {
      res.status(409).json({ error: 'You have already submitted a quotation for this RFQ' });
      return;
    }

    // 2. Load RFQ items into a map for fast quantity checking
    const rfqItemsMap = new Map<string, number>();
    for (const item of rfq.items) {
      rfqItemsMap.set(item.id, Number(item.quantity));
    }

    // Calculate item totals and grand total
    let grandTotal = 0;
    const itemsToCreate = [];

    for (const item of items) {
      const quantity = rfqItemsMap.get(item.rfqItemId);
      if (quantity === undefined) {
        res.status(400).json({ error: `Item ${item.rfqItemId} does not belong to this RFQ` });
        return;
      }

      const totalPrice = quantity * item.unitPrice;
      grandTotal += totalPrice;

      itemsToCreate.push({
        rfqItemId: item.rfqItemId,
        unitPrice: item.unitPrice,
        totalPrice,
        notes: item.notes,
      });
    }

    // 3. Create quotation in transaction
    const quotation = await prisma.$transaction(async (tx) => {
      const newQuotation = await tx.quotation.create({
        data: {
          rfqId,
          vendorId,
          deliveryDays,
          notes,
          totalAmount: grandTotal,
          status: 'submitted',
          submittedAt: new Date(),
        },
      });

      await tx.quotationItem.createMany({
        data: itemsToCreate.map((it) => ({
          quotationId: newQuotation.id,
          ...it,
        })),
      });

      return newQuotation;
    });

    await logActivity({
      userId: req.user?.userId,
      eventType: 'quotation_submitted',
      entityType: 'quotation',
      entityId: quotation.id,
      description: `Quotation of ${grandTotal.toFixed(2)} submitted for RFQ ${rfq.rfqNumber}`,
    });

    res.status(201).json({ quotation });
  } catch (err) {
    console.error('createQuotation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PATCH /api/quotations/:id/status ─────────────────────────────────────────
export const updateQuotationStatus = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!['draft', 'submitted', 'selected', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Invalid status value' });
    return;
  }

  try {
    const existing = (await prisma.quotation.findUnique({
      where: { id },
      include: { rfq: true },
    })) as any;

    if (!existing) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const quotation = (await prisma.quotation.update({
      where: { id },
      data: { status: status as any },
    })) as any;

    await logActivity({
      userId: req.user!.userId,
      eventType: 'quotation_status_updated',
      entityType: 'quotation',
      entityId: quotation.id,
      description: `Quotation status updated to ${status} for RFQ ${existing.rfq.rfqNumber}`,
    });

    res.json({ quotation });
  } catch (err) {
    console.error('updateQuotationStatus error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

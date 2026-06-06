import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { approvalRequestSchema, approvalActionSchema } from '../utils/validators';
import { logActivity } from '../utils/activityLogger';

// Helper to generate a unique PO number
const generatePoNumber = async (): Promise<string> => {
  const count = await prisma.purchaseOrder.count();
  const index = String(count + 1).padStart(4, '0');
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `VB-PO-${dateStr}-${index}`;
};

// ── GET /api/approvals ────────────────────────────────────────────────────────
export const getApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    let whereClause: any = {};

    if (userRole === 'approver') {
      whereClause.approverId = userId;
    } else if (userRole === 'procurement') {
      whereClause.requestedBy = userId;
    }

    const approvals = await prisma.approval.findMany({
      where: whereClause,
      include: {
        rfq: {
          select: { id: true, rfqNumber: true, title: true, category: true },
        },
        quotation: {
          include: {
            vendor: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ approvals });
  } catch (err) {
    console.error('getApprovals error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/approvals/:id ────────────────────────────────────────────────────
export const getApprovalById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userRole = req.user?.role;
  const userId = req.user?.userId;

  try {
    const approval = (await prisma.approval.findUnique({
      where: { id },
      include: {
        rfq: {
          include: {
            items: true,
          },
        },
        quotation: {
          include: {
            vendor: true,
            items: {
              include: {
                rfqItem: true,
              },
            },
          },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    })) as any;

    if (!approval) {
      res.status(404).json({ error: 'Approval request not found' });
      return;
    }

    // Role checks
    if (userRole === 'approver' && approval.approverId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You are not assigned to review this approval request' });
      return;
    }

    if (userRole === 'procurement' && approval.requestedBy !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You are not the requester of this approval request' });
      return;
    }

    res.json({ approval });
  } catch (err) {
    console.error('getApprovalById error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/approvals (Request Approval) ───────────────────────────────────
export const createApprovalRequest = async (req: Request, res: Response): Promise<void> => {
  const parsed = approvalRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { rfqId, quotationId, approverId } = parsed.data;
  const requestedBy = req.user!.userId;

  try {
    // Verify RFQ and Quotation exist
    const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      res.status(404).json({ error: 'RFQ not found' });
      return;
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { vendor: true },
    });
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    if (quotation.rfqId !== rfqId) {
      res.status(400).json({ error: 'Quotation does not belong to the specified RFQ' });
      return;
    }

    // Check if there's already an approval for this quotation
    const existing = await prisma.approval.findUnique({ where: { quotationId } });
    if (existing) {
      res.status(409).json({ error: 'Approval request already exists for this quotation' });
      return;
    }

    // Create approval
    const approval = await prisma.approval.create({
      data: {
        rfqId,
        quotationId,
        requestedBy,
        approverId,
        status: 'pending',
      },
    });

    await logActivity({
      userId: requestedBy,
      eventType: 'approval_requested',
      entityType: 'approval',
      entityId: approval.id,
      description: `Submitted approval request for RFQ ${rfq.rfqNumber} and vendor ${quotation.vendor.name}`,
    });

    res.status(201).json({ approval });
  } catch (err) {
    console.error('createApprovalRequest error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PATCH /api/approvals/:id (Approve/Reject) ───────────────────────────────
export const actionApproval = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = approvalActionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { status, remarks } = parsed.data;
  const approverId = req.user!.userId;

  try {
    const approval = (await prisma.approval.findUnique({
      where: { id },
      include: {
        rfq: true,
        quotation: {
          include: {
            vendor: true,
          },
        },
      },
    })) as any;

    if (!approval) {
      res.status(404).json({ error: 'Approval request not found' });
      return;
    }

    if (approval.approverId !== approverId) {
      res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to action this approval request' });
      return;
    }

    if (approval.status !== 'pending') {
      res.status(400).json({ error: 'This approval request has already been processed' });
      return;
    }

    // Execute approval/rejection logic in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Approval record
      const updatedApproval = await tx.approval.update({
        where: { id: id as string },
        data: {
          status: status as any,
          remarks,
          actionedAt: new Date(),
        },
      });

      if (status === 'approved') {
        // 2. Update Quotation Status to Selected
        await tx.quotation.update({
          where: { id: approval.quotationId },
          data: { status: 'selected' },
        });

        // 3. Mark all other quotations for this RFQ as rejected
        await tx.quotation.updateMany({
          where: {
            rfqId: approval.rfqId,
            id: { not: approval.quotationId },
          },
          data: { status: 'rejected' },
        });

        // 4. Update RFQ Status to Awarded
        await tx.rfq.update({
          where: { id: approval.rfqId },
          data: { status: 'awarded' },
        });

        // 5. Generate Purchase Order
        const poNumber = await generatePoNumber();
        const subtotal = Number(approval.quotation.totalAmount);
        const gstRate = 18.00;
        const gstAmount = subtotal * (gstRate / 100);
        const total = subtotal + gstAmount;

        const purchaseOrder = await tx.purchaseOrder.create({
          data: {
            poNumber,
            rfqId: approval.rfqId,
            vendorId: approval.quotation.vendorId,
            quotationId: approval.quotationId,
            approvalId: approval.id,
            subtotal,
            gstRate,
            gstAmount,
            total,
            status: 'draft',
            createdBy: approval.requestedBy, // The procurement officer who requested the approval
          },
        });

        return { approval: updatedApproval, purchaseOrder };
      } else {
        // Rejection logic: update quotation status to rejected
        await tx.quotation.update({
          where: { id: approval.quotationId },
          data: { status: 'rejected' },
        });

        return { approval: updatedApproval, purchaseOrder: null };
      }
    });

    await logActivity({
      userId: approverId,
      eventType: status === 'approved' ? 'approval_approved' : 'approval_rejected',
      entityType: 'approval',
      entityId: approval.id,
      description: `Approval request for RFQ ${approval.rfq.rfqNumber} was ${status} by approver. ${remarks || ''}`,
    });

    if (result.purchaseOrder) {
      await logActivity({
        userId: approval.requestedBy,
        eventType: 'po_created',
        entityType: 'purchase_order',
        entityId: result.purchaseOrder.id,
        description: `Draft PO ${result.purchaseOrder.poNumber} automatically generated for vendor ${approval.quotation.vendor.name}`,
      });
    }

    res.json(result);
  } catch (err) {
    console.error('actionApproval error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

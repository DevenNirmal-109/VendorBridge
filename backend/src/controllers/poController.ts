import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import PDFDocument from 'pdfkit';
import { logActivity } from '../utils/activityLogger';

// ── GET /api/po ──────────────────────────────────────────────────────────────
export const getPurchaseOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    let whereClause: any = {};

    if (userRole === 'vendor') {
      const vendor = await prisma.vendor.findFirst({
        where: { email: userEmail },
      });

      if (!vendor) {
        res.json({ purchaseOrders: [] });
        return;
      }
      whereClause.vendorId = vendor.id;
      // Vendors should not see draft POs
      whereClause.status = { not: 'draft' };
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: { id: true, name: true, category: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ purchaseOrders });
  } catch (err) {
    console.error('getPurchaseOrders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/po/:id ──────────────────────────────────────────────────────────
export const getPurchaseOrderById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userRole = req.user?.role;
  const userEmail = req.user?.email;

  try {
    const po = (await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        approval: {
          include: {
            rfq: {
              select: { id: true, rfqNumber: true, title: true },
            },
            quotation: {
              include: {
                items: {
                  include: {
                    rfqItem: true,
                  },
                },
              },
            },
          },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, status: true },
        },
      },
    })) as any;

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    // Access control for vendors
    if (userRole === 'vendor' && po.vendor.email !== userEmail) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    res.json({ po });
  } catch (err) {
    console.error('getPurchaseOrderById error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/po/:id/issue ────────────────────────────────────────────────────
export const issuePurchaseOrder = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const po = (await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true },
    })) as any;

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    if (po.status !== 'draft') {
      res.status(400).json({ error: `Cannot issue PO. Current status: ${po.status}` });
      return;
    }

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'issued' },
    });

    await logActivity({
      userId: req.user!.userId,
      eventType: 'po_issued',
      entityType: 'purchase_order',
      entityId: po.id,
      description: `Issued PO ${po.poNumber} to vendor ${po.vendor.name}`,
    });

    res.json({ purchaseOrder: updatedPo });
  } catch (err) {
    console.error('issuePurchaseOrder error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PATCH /api/po/:id/acknowledge ─────────────────────────────────────────────
export const acknowledgePurchaseOrder = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userEmail = req.user!.email;

  try {
    const po = (await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true },
    })) as any;

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    if (po.vendor.email !== userEmail) {
      res.status(403).json({ error: 'Forbidden', message: 'You are not the vendor assigned to this PO' });
      return;
    }

    if (po.status !== 'issued') {
      res.status(400).json({ error: `Cannot acknowledge PO. Current status: ${po.status}` });
      return;
    }

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'acknowledged' },
    });

    await logActivity({
      userId: req.user!.userId,
      eventType: 'po_acknowledged',
      entityType: 'purchase_order',
      entityId: po.id,
      description: `Vendor acknowledged PO ${po.poNumber}`,
    });

    res.json({ purchaseOrder: updatedPo });
  } catch (err) {
    console.error('acknowledgePurchaseOrder error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/po/:id/pdf ───────────────────────────────────────────────────────
export const generatePoPdf = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userRole = req.user?.role;
  const userEmail = req.user?.email;

  try {
    const po = (await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        creator: true,
        approval: {
          include: {
            rfq: true,
            quotation: {
              include: {
                items: {
                  include: {
                    rfqItem: true,
                  },
                },
              },
            },
          },
        },
      },
    })) as any;

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    // Access control
    if (userRole === 'vendor' && po.vendor.email !== userEmail) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    // Initialize PDF Document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PO-${po.poNumber}.pdf`);

    doc.pipe(res);

    // Header styling
    doc.fillColor('#1B3A6B').fontSize(24).text('PURCHASE ORDER', { align: 'right' });
    doc.fillColor('#334155').fontSize(10).text('VendorBridge ERP Procurement System', { align: 'right' });
    doc.moveDown(2);

    // Info sections
    const startY = doc.y;
    doc.fontSize(11).fillColor('#1B3A6B').text('ORDER TO (VENDOR):', 50, startY);
    doc.fillColor('#334155')
      .text(po.vendor.name)
      .text(`GSTIN: ${po.vendor.gstNumber}`)
      .text(po.vendor.email)
      .text(po.vendor.address || '');

    doc.fontSize(11).fillColor('#1B3A6B').text('ORDER DETAILS:', 320, startY);
    doc.fillColor('#334155')
      .text(`PO Number: ${po.poNumber}`, 320)
      .text(`Date: ${po.createdAt.toLocaleDateString()}`)
      .text(`Status: ${po.status.toUpperCase()}`)
      .text(`RFQ Ref: ${po.approval.rfq.rfqNumber}`)
      .text(`Prepared By: ${po.creator.name}`);

    doc.moveDown(3);

    // Draw horizontal line
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // Items table header
    const tableTop = doc.y;
    doc.fontSize(10).fillColor('#1B3A6B')
      .text('Item / Description', 50, tableTop, { width: 220 })
      .text('Qty', 270, tableTop, { width: 50, align: 'right' })
      .text('Unit Price (INR)', 330, tableTop, { width: 90, align: 'right' })
      .text('Total (INR)', 430, tableTop, { width: 115, align: 'right' });

    doc.moveDown(0.5);
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Items list
    const items = po.approval.quotation.items;
    let currentY = doc.y;
    
    for (const item of items) {
      // Check if page overflow
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(10).fillColor('#334155')
        .text(item.rfqItem.itemName, 50, currentY, { width: 220 })
        .text(item.rfqItem.quantity.toString(), 270, currentY, { width: 50, align: 'right' })
        .text(Number(item.unitPrice).toFixed(2), 330, currentY, { width: 90, align: 'right' })
        .text(Number(item.totalPrice).toFixed(2), 430, currentY, { width: 115, align: 'right' });

      if (item.notes) {
        currentY += 15;
        doc.fontSize(8).fillColor('#64748B').text(`Notes: ${item.notes}`, 50, currentY, { width: 220 });
      }

      currentY += 25;
    }

    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();
    currentY += 15;

    // Totals section
    doc.fontSize(10).fillColor('#334155');
    doc.text('Subtotal:', 320, currentY, { width: 100, align: 'right' });
    doc.text(`INR ${Number(po.subtotal).toFixed(2)}`, 430, currentY, { width: 115, align: 'right' });

    currentY += 20;
    doc.text(`GST (${po.gstRate}%):`, 320, currentY, { width: 100, align: 'right' });
    doc.text(`INR ${Number(po.gstAmount).toFixed(2)}`, 430, currentY, { width: 115, align: 'right' });

    currentY += 20;
    doc.fontSize(12).fillColor('#1B3A6B').font('Helvetica-Bold');
    doc.text('Grand Total:', 320, currentY, { width: 100, align: 'right' });
    doc.text(`INR ${Number(po.total).toFixed(2)}`, 430, currentY, { width: 115, align: 'right' });

    // Footer signature
    doc.moveDown(3);
    const footerY = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor('#64748B')
      .text('This is a computer-generated document. No signature required.', 50, footerY + 40, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('generatePoPdf error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

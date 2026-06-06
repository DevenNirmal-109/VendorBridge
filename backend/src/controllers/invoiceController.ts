import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { invoiceSchema } from '../utils/validators';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { logActivity } from '../utils/activityLogger';

// Helper to generate a unique Invoice number
const generateInvoiceNumber = async (): Promise<string> => {
  const count = await prisma.invoice.count();
  const index = String(count + 1).padStart(4, '0');
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `VB-INV-${dateStr}-${index}`;
};

// Helper to compile Invoice PDF to Buffer
const buildInvoicePdfBuffer = (invoice: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Title & Header
      doc.fillColor('#1B3A6B').fontSize(24).text('INVOICE', { align: 'right' });
      doc.fillColor('#334155').fontSize(10).text('VendorBridge ERP Procurement System', { align: 'right' });
      doc.moveDown(2);

      const startY = doc.y;
      
      // Billing Details
      doc.fontSize(11).fillColor('#1B3A6B').text('BILLED TO (BUYER):', 50, startY);
      doc.fillColor('#334155')
        .text('VendorBridge Demo Org')
        .text('Email: info@vendorbridge.com')
        .text('Address: 100 Corporate Office, Tech Hub, Mumbai');

      // Invoice metadata
      doc.fontSize(11).fillColor('#1B3A6B').text('INVOICE DETAILS:', 320, startY);
      doc.fillColor('#334155')
        .text(`Invoice Number: ${invoice.invoiceNumber}`, 320)
        .text(`Date: ${invoice.createdAt.toLocaleDateString()}`)
        .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`)
        .text(`Payment Terms: ${invoice.paymentTerms || 'Net 30'}`)
        .text(`PO Reference: ${invoice.po.poNumber}`)
        .text(`Status: ${invoice.status.toUpperCase()}`);

      doc.moveDown(2.5);

      // Line spacer
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1.5);

      // Items table header
      const tableTop = doc.y;
      doc.fontSize(10).fillColor('#1B3A6B')
        .text('Item Description', 50, tableTop, { width: 220 })
        .text('Qty', 270, tableTop, { width: 50, align: 'right' })
        .text('Unit Price (INR)', 330, tableTop, { width: 90, align: 'right' })
        .text('Total (INR)', 430, tableTop, { width: 115, align: 'right' });

      doc.moveDown(0.5);
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Render items from original quotation
      const items = invoice.po.approval.quotation.items;
      let currentY = doc.y;

      for (const item of items) {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        doc.fontSize(10).fillColor('#334155')
          .text(item.rfqItem.itemName, 50, currentY, { width: 220 })
          .text(item.rfqItem.quantity.toString(), 270, currentY, { width: 50, align: 'right' })
          .text(Number(item.unitPrice).toFixed(2), 330, currentY, { width: 90, align: 'right' })
          .text(Number(item.totalPrice).toFixed(2), 430, currentY, { width: 115, align: 'right' });

        currentY += 25;
      }

      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();
      currentY += 15;

      // Totals
      doc.fontSize(10).fillColor('#334155');
      doc.text('Subtotal:', 320, currentY, { width: 100, align: 'right' });
      doc.text(`INR ${Number(invoice.po.subtotal).toFixed(2)}`, 430, currentY, { width: 115, align: 'right' });

      currentY += 20;
      doc.text(`GST (${invoice.po.gstRate}%):`, 320, currentY, { width: 100, align: 'right' });
      doc.text(`INR ${Number(invoice.po.gstAmount).toFixed(2)}`, 430, currentY, { width: 115, align: 'right' });

      currentY += 20;
      doc.fontSize(12).fillColor('#1B3A6B').font('Helvetica-Bold');
      doc.text('Grand Total:', 320, currentY, { width: 100, align: 'right' });
      doc.text(`INR ${Number(invoice.po.total).toFixed(2)}`, 430, currentY, { width: 115, align: 'right' });

      doc.moveDown(3);
      const footerY = doc.y;
      doc.font('Helvetica').fontSize(9).fillColor('#94A3B8')
        .text('Please process the payment to the vendor details listed in their profile.', 50, footerY + 30, { align: 'center' })
        .text('This is an automated system invoice generated for procurement record purposes.', 50, footerY + 45, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ── GET /api/invoices ────────────────────────────────────────────────────────
export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    let whereClause: any = {};

    if (userRole === 'vendor') {
      const vendor = await prisma.vendor.findFirst({
        where: { email: userEmail },
      });

      if (!vendor) {
        res.json({ invoices: [] });
        return;
      }
      whereClause.po = { vendorId: vendor.id };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        po: {
          include: {
            vendor: {
              select: { id: true, name: true, category: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ invoices });
  } catch (err) {
    console.error('getInvoices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/invoices/:id ────────────────────────────────────────────────────
export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userRole = req.user?.role;
  const userEmail = req.user?.email;

  try {
    const invoice = (await prisma.invoice.findUnique({
      where: { id },
      include: {
        po: {
          include: {
            vendor: true,
            creator: {
              select: { id: true, name: true, email: true },
            },
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
        },
      },
    })) as any;

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Access control
    if (userRole === 'vendor' && invoice.po.vendor.email !== userEmail) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    res.json({ invoice });
  } catch (err) {
    console.error('getInvoiceById error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/invoices ────────────────────────────────────────────────────────
export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { poId, dueDate, paymentTerms } = parsed.data;
  const userEmail = req.user!.email;

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { vendor: true },
    });

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    // Check if user has vendor credentials for this PO
    if (po.vendor.email !== userEmail) {
      res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to invoice for this PO' });
      return;
    }

    if (po.status !== 'acknowledged' && po.status !== 'completed') {
      res.status(400).json({ error: `Cannot invoice for PO that is in ${po.status} status` });
      return;
    }

    // Check if invoice already exists
    const existing = await prisma.invoice.findUnique({ where: { poId } });
    if (existing) {
      res.status(409).json({ error: 'Invoice already exists for this purchase order' });
      return;
    }

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        poId,
        dueDate: new Date(dueDate),
        paymentTerms,
        status: 'sent', // Set status to 'sent' upon creation by vendor
      },
    });

    await logActivity({
      userId: req.user!.userId,
      eventType: 'invoice_submitted',
      entityType: 'invoice',
      entityId: invoice.id,
      description: `Submitted Invoice ${invoice.invoiceNumber} for PO ${po.poNumber}`,
    });

    res.status(201).json({ invoice });
  } catch (err) {
    console.error('createInvoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PATCH /api/invoices/:id/status ───────────────────────────────────────────
export const updateInvoiceStatus = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!['draft', 'sent', 'acknowledged', 'paid'].includes(status)) {
    res.status(400).json({ error: 'Invalid status value' });
    return;
  }

  try {
    const existing = (await prisma.invoice.findUnique({
      where: { id },
      include: {
        po: {
          include: {
            vendor: true,
          },
        },
      },
    })) as any;

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Wrap in transaction: update invoice status and PO status (if paid, mark PO completed)
    const result = await prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: { status: status as any },
      });

      if (status === 'paid') {
        await tx.purchaseOrder.update({
          where: { id: existing.poId },
          data: { status: 'completed' },
        });
      }

      return updatedInvoice;
    });

    await logActivity({
      userId: req.user!.userId,
      eventType: 'invoice_status_updated',
      entityType: 'invoice',
      entityId: result.id,
      description: `Invoice ${existing.invoiceNumber} status marked as ${status}`,
    });

    if (status === 'paid') {
      await logActivity({
        userId: req.user!.userId,
        eventType: 'po_completed',
        entityType: 'purchase_order',
        entityId: existing.poId,
        description: `PO ${existing.po.poNumber} completed (paid)`,
      });
    }

    res.json({ invoice: result });
  } catch (err) {
    console.error('updateInvoiceStatus error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/invoices/:id/send-email ─────────────────────────────────────────
export const sendInvoiceEmail = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const invoice = (await prisma.invoice.findUnique({
      where: { id },
      include: {
        po: {
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
        },
      },
    })) as any;

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Generate PDF buffer
    const pdfBuffer = await buildInvoicePdfBuffer(invoice);

    // Setup Nodemailer transporter from ENV
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || `"VendorBridge" <${process.env.SMTP_USER}>`,
      to: `${invoice.po.creator.email}, ${invoice.po.vendor.email}`,
      subject: `[VendorBridge] Invoice Dispatched: ${invoice.invoiceNumber}`,
      text: `Hello,\n\nPlease find attached Invoice ${invoice.invoiceNumber} generated for Purchase Order ${invoice.po.poNumber}.\n\nInvoice Details:\n- Number: ${invoice.invoiceNumber}\n- Total Amount: INR ${Number(invoice.po.total).toFixed(2)}\n- Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nRegards,\nVendorBridge Procurement System`,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Update sent date in DB
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { emailSentAt: new Date() },
    });

    await logActivity({
      userId: req.user!.userId,
      eventType: 'invoice_email_sent',
      entityType: 'invoice',
      entityId: invoice.id,
      description: `Invoice ${invoice.invoiceNumber} email dispatched to ${invoice.po.creator.email} and ${invoice.po.vendor.email}`,
    });

    res.json({ success: true, invoice: updatedInvoice });
  } catch (err) {
    console.error('sendInvoiceEmail error:', err);
    res.status(500).json({ error: 'Internal server error', message: err instanceof Error ? err.message : 'Unknown error' });
  }
};

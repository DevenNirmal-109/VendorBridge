import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { vendorSchema, vendorStatusSchema } from '../utils/validators';
import { logActivity } from '../utils/activityLogger';

// ── GET /api/vendors ─────────────────────────────────────────────────────────
export const getVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ vendors });
  } catch (err) {
    console.error('getVendors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/vendors/:id ─────────────────────────────────────────────────────
export const getVendorById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        registrar: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    res.json({ vendor });
  } catch (err) {
    console.error('getVendorById error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/vendors ────────────────────────────────────────────────────────
export const createVendor = async (req: Request, res: Response): Promise<void> => {
  const parsed = vendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { name, category, gstNumber, email, phone, address } = parsed.data;

  try {
    const existing = await prisma.vendor.findUnique({ where: { gstNumber } });
    if (existing) {
      res.status(409).json({ error: 'Vendor with this GST number already exists' });
      return;
    }

    const userId = req.user?.userId || null;

    const vendor = await prisma.vendor.create({
      data: {
        name,
        category,
        gstNumber,
        email,
        phone,
        address,
        registeredBy: userId,
      },
    });

    await logActivity({
      userId: userId || undefined,
      eventType: 'vendor_created',
      entityType: 'vendor',
      entityId: vendor.id,
      description: `Vendor registered: ${vendor.name} (${vendor.category})`,
    });

    res.status(201).json({ vendor });
  } catch (err) {
    console.error('createVendor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PUT /api/vendors/:id ─────────────────────────────────────────────────────
export const updateVendor = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = vendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { name, category, gstNumber, email, phone, address } = parsed.data;

  try {
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    // Check GST conflict if changed
    if (existing.gstNumber !== gstNumber) {
      const gstConflict = await prisma.vendor.findUnique({ where: { gstNumber } });
      if (gstConflict) {
        res.status(409).json({ error: 'Another vendor is registered with this GST number' });
        return;
      }
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        name,
        category,
        gstNumber,
        email,
        phone,
        address,
      },
    });

    await logActivity({
      userId: req.user?.userId,
      eventType: 'vendor_updated',
      entityType: 'vendor',
      entityId: vendor.id,
      description: `Vendor details updated: ${vendor.name}`,
    });

    res.json({ vendor });
  } catch (err) {
    console.error('updateVendor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PATCH /api/vendors/:id/status ───────────────────────────────────────────
export const updateVendorStatus = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = vendorStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { status } = parsed.data;

  try {
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      userId: req.user?.userId,
      eventType: 'vendor_status_updated',
      entityType: 'vendor',
      entityId: vendor.id,
      description: `Vendor ${vendor.name} status changed to ${status}`,
    });

    res.json({ vendor });
  } catch (err) {
    console.error('updateVendorStatus error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

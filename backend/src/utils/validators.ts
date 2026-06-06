import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'procurement', 'approver', 'vendor'], {
    message: 'Role must be admin, procurement, approver, or vendor',
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ── Vendor Validation ────────────────────────────────────────────────────────
export const vendorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  category: z.string().min(2, 'Category is required').max(100),
  gstNumber: z.string().min(15, 'GST must be 15 characters').max(15, 'GST must be 15 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().optional().nullable(),
});

export const vendorStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'blacklisted']),
});

// ── RFQ Validation ───────────────────────────────────────────────────────────
export const rfqItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').max(255),
  description: z.string().optional().nullable(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().max(50).optional().nullable(),
  estPrice: z.number().positive().optional().nullable(),
});

export const rfqSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().optional().nullable(),
  category: z.string().min(2, 'Category is required').max(100),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid deadline date format',
  }),
  items: z.array(rfqItemSchema).min(1, 'At least one item is required'),
  assignedVendorIds: z.array(z.string().uuid()).min(1, 'At least one vendor assignment is required'),
});

// ── Quotation Validation ─────────────────────────────────────────────────────
export const quotationItemSchema = z.object({
  rfqItemId: z.string().uuid(),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  notes: z.string().optional().nullable(),
});

export const quotationSchema = z.object({
  rfqId: z.string().uuid(),
  vendorId: z.string().uuid(),
  deliveryDays: z.number().int().positive('Delivery days must be a positive number'),
  notes: z.string().optional().nullable(),
  items: z.array(quotationItemSchema).min(1, 'At least one quotation item is required'),
});

// ── Approval Validation ──────────────────────────────────────────────────────
export const approvalRequestSchema = z.object({
  rfqId: z.string().uuid(),
  quotationId: z.string().uuid(),
  approverId: z.string().uuid(),
});

export const approvalActionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  remarks: z.string().optional().nullable(),
});

// ── Invoice Validation ───────────────────────────────────────────────────────
export const invoiceSchema = z.object({
  poId: z.string().uuid(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid due date format',
  }),
  paymentTerms: z.string().max(100).optional().nullable(),
});


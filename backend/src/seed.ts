/**
 * VendorBridge Seed Script
 * Creates demo data for the Indian region.
 * Fully populates RFQs, Quotations, Approvals, POs, and Invoices.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Starting VendorBridge seed with Indian demo data...\n');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { id: 'org-vendorbridge-demo' },
    update: {},
    create: {
      id: 'org-vendorbridge-demo',
      name: 'VendorBridge India',
    },
  });
  console.log(`✅ Organization: ${org.name}`);

  // 2. Users
  const usersData = [
    { id: 'user-admin-001', name: 'Amit Desai (Admin)', email: 'admin@vendorbridge.com', password: 'Admin@1234', role: 'admin' as const },
    { id: 'user-procurement-001', name: 'Priya Sharma (Procurement)', email: 'procurement@vendorbridge.com', password: 'Procure@1234', role: 'procurement' as const },
    { id: 'user-approver-001', name: 'Rajesh Kumar (Manager)', email: 'approver@vendorbridge.com', password: 'Approve@1234', role: 'approver' as const },
    { id: 'user-vendor-001', name: 'Techno Supplies Pvt Ltd', email: 'vendor1@vendorbridge.com', password: 'Vendor@1234', role: 'vendor' as const },
    { id: 'user-vendor-002', name: 'Global Traders Ltd', email: 'vendor2@vendorbridge.com', password: 'Vendor@1234', role: 'vendor' as const },
    { id: 'user-vendor-003', name: 'Prime Solutions Inc', email: 'vendor3@vendorbridge.com', password: 'Vendor@1234', role: 'vendor' as const },
  ];

  for (const u of usersData) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        orgId: org.id,
      },
    });
    console.log(`✅ User [${u.role.padEnd(12)}]: ${u.name}`);
  }

  // 3. Vendors
  const vendorsData = [
    { id: 'vendor-001', name: 'Techno Supplies Pvt Ltd', category: 'IT Hardware', gstNumber: '27AAPCT1234A1ZR', email: 'vendor1@vendorbridge.com', phone: '+91-9876543210', address: '12, Tech Park, Pune, Maharashtra - 411001', rating: 4.5 },
    { id: 'vendor-002', name: 'Global Traders Ltd', category: 'Office Supplies', gstNumber: '27AABCG5678B2ZP', email: 'vendor2@vendorbridge.com', phone: '+91-9876543211', address: '45, Trade Centre, Mumbai, Maharashtra - 400001', rating: 4.2 },
    { id: 'vendor-003', name: 'Prime Solutions Inc', category: 'IT Software', gstNumber: '27AACCP9012C3ZQ', email: 'vendor3@vendorbridge.com', phone: '+91-9876543212', address: '78, Innovation Hub, Bangalore, Karnataka - 560001', rating: 4.8 },
    { id: 'vendor-004', name: 'Swift Logistics Co', category: 'Logistics', gstNumber: '33AAACS3456D4ZM', email: 'swift@logistics.com', phone: '+91-9876543213', address: '23, Cargo Lane, Chennai, Tamil Nadu - 600001', rating: 3.9 },
    { id: 'vendor-005', name: 'BuildRight Materials', category: 'Construction', gstNumber: '24AAABR7890E5ZN', email: 'buildright@materials.com', phone: '+91-9876543214', address: '56, Industrial Area, Ahmedabad, Gujarat - 380001', rating: 4.1 },
  ];

  for (const v of vendorsData) {
    await prisma.vendor.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        name: v.name,
        category: v.category,
        gstNumber: v.gstNumber,
        email: v.email,
        phone: v.phone,
        address: v.address,
        rating: v.rating,
        registeredBy: 'user-admin-001',
      },
    });
    console.log(`✅ Vendor: ${v.name}`);
  }

  // Clear existing transactions to avoid unique constraint issues during re-seeding
  await prisma.activityLog.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.rfqVendorAssignment.deleteMany({});
  await prisma.rfqItem.deleteMany({});
  await prisma.rfq.deleteMany({});

  // 4. Create RFQ 1 (Awarded)
  const rfq1 = await prisma.rfq.create({
    data: {
      rfqNumber: 'VB-RFQ-20260606-001',
      title: 'Procurement of IT Hardware for Bangalore Office',
      description: 'Need laptops and accessories for the new engineering batch.',
      category: 'IT Hardware',
      deadline: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // +7 days
      status: 'awarded',
      createdBy: 'user-procurement-001',
    }
  });

  const rfq1Item1 = await prisma.rfqItem.create({
    data: { rfqId: rfq1.id, itemName: 'Dell Latitude 7420 Laptops', quantity: 50, unit: 'pcs', estPrice: 65000 }
  });
  const rfq1Item2 = await prisma.rfqItem.create({
    data: { rfqId: rfq1.id, itemName: 'Logitech MX Master 3 Wireless Mouse', quantity: 50, unit: 'pcs', estPrice: 8000 }
  });

  await prisma.rfqVendorAssignment.createMany({
    data: [
      { rfqId: rfq1.id, vendorId: 'vendor-001' },
      { rfqId: rfq1.id, vendorId: 'vendor-002' }
    ]
  });

  // 5. Quotations for RFQ 1
  // Vendor 1 Quotation (Winner)
  const q1 = await prisma.quotation.create({
    data: {
      rfqId: rfq1.id, vendorId: 'vendor-001', totalAmount: 3600000, deliveryDays: 10, status: 'selected', submittedAt: new Date()
    }
  });
  await prisma.quotationItem.createMany({
    data: [
      { quotationId: q1.id, rfqItemId: rfq1Item1.id, unitPrice: 64000, totalPrice: 3200000 },
      { quotationId: q1.id, rfqItemId: rfq1Item2.id, unitPrice: 8000, totalPrice: 400000 }
    ]
  });

  // Vendor 2 Quotation (Loser)
  const q2 = await prisma.quotation.create({
    data: {
      rfqId: rfq1.id, vendorId: 'vendor-002', totalAmount: 3750000, deliveryDays: 14, status: 'rejected', submittedAt: new Date()
    }
  });
  await prisma.quotationItem.createMany({
    data: [
      { quotationId: q2.id, rfqItemId: rfq1Item1.id, unitPrice: 67000, totalPrice: 3350000 },
      { quotationId: q2.id, rfqItemId: rfq1Item2.id, unitPrice: 8000, totalPrice: 400000 }
    ]
  });

  // 6. Approval for RFQ 1
  const approval = await prisma.approval.create({
    data: {
      rfqId: rfq1.id,
      quotationId: q1.id,
      requestedBy: 'user-procurement-001',
      approverId: 'user-approver-001',
      status: 'approved',
      remarks: 'Approved. Techno Supplies offered the best price and fastest delivery for the Bangalore office.',
      actionedAt: new Date()
    }
  });

  // 7. PO & Invoice for RFQ 1
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'VB-PO-20260606-001',
      rfqId: rfq1.id, vendorId: 'vendor-001', quotationId: q1.id, approvalId: approval.id,
      subtotal: 3600000, gstRate: 18.00, gstAmount: 648000, total: 4248000,
      status: 'issued', createdBy: 'user-procurement-001'
    }
  });

  const invoiceDate = new Date();
  invoiceDate.setDate(invoiceDate.getDate() + 30);
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'VB-INV-20260606-001',
      poId: po.id, dueDate: invoiceDate, paymentTerms: 'Net 30', status: 'sent', emailSentAt: new Date()
    }
  });

  // 8. Create RFQ 2 (Open)
  const rfq2 = await prisma.rfq.create({
    data: {
      rfqNumber: 'VB-RFQ-20260606-002',
      title: 'Office Furniture for Mumbai Branch',
      description: 'Ergonomic chairs and modular desks.',
      category: 'Office Supplies',
      deadline: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000), // +14 days
      status: 'open',
      createdBy: 'user-procurement-001',
    }
  });

  await prisma.rfqItem.createMany({
    data: [
      { rfqId: rfq2.id, itemName: 'Ergonomic Mesh Chairs', quantity: 20, unit: 'pcs', estPrice: 12000 },
      { rfqId: rfq2.id, itemName: 'Modular Office Desks', quantity: 20, unit: 'pcs', estPrice: 18000 }
    ]
  });

  await prisma.rfqVendorAssignment.createMany({
    data: [
      { rfqId: rfq2.id, vendorId: 'vendor-002' },
      { rfqId: rfq2.id, vendorId: 'vendor-005' }
    ]
  });

  // Activity Logs
  await prisma.activityLog.createMany({
    data: [
      { userId: 'user-procurement-001', eventType: 'rfq_created', entityType: 'rfq', entityId: rfq1.id, description: 'Created RFQ: Procurement of IT Hardware for Bangalore Office' },
      { userId: 'user-vendor-001', eventType: 'quotation_submitted', entityType: 'quotation', entityId: q1.id, description: 'Techno Supplies submitted a quotation for ₹36,00,000' },
      { userId: 'user-approver-001', eventType: 'rfq_approved', entityType: 'approval', entityId: approval.id, description: 'Rajesh Kumar approved the quotation from Techno Supplies' },
      { userId: 'user-procurement-001', eventType: 'po_created', entityType: 'purchase_order', entityId: po.id, description: 'Generated Purchase Order VB-PO-20260606-001' }
    ]
  });

  console.log('✅ Demo Transactions created (RFQs, Quotations, Approvals, POs, Invoices).');
  console.log('\n─────────────────────────────────────────────────');
  console.log('🎉 Seed complete!\n');
  console.log('Demo Login Credentials:');
  console.log('  Admin        → admin@vendorbridge.com      / Admin@1234');
  console.log('  Procurement  → procurement@vendorbridge.com / Procure@1234');
  console.log('  Approver     → approver@vendorbridge.com   / Approve@1234');
  console.log('  Vendor 1     → vendor1@vendorbridge.com    / Vendor@1234');
  console.log('─────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

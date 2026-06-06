# VendorBridge

**VendorBridge** is a comprehensive Procurement & Vendor Management ERP built to digitize and centralize the full procurement lifecycle—from vendor onboarding to invoice dispatch.

## Features & Workflow

VendorBridge automates procurement processes through a strict, role-based workflow:
1. **RFQ Creation** (Procurement Officer)
2. **Quotation Submission** (Vendor)
3. **Quotation Comparison & Selection** (Procurement Officer)
4. **Manager Approval** (Approver)
5. **Purchase Order Generation** (Procurement Officer)
6. **Invoice Generation & Email Dispatch** (Procurement Officer)

The system maintains a rigid audit trail ensuring no purchase order can be created without manager approval, and provides an analytics dashboard for Admin users.

## Architecture & Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v4, Zustand, React Router v7, Recharts.
- **Backend**: Node.js, Express.js, TypeScript.
- **Database Layer**: PostgreSQL managed by Prisma ORM via Supabase.
- **Authentication**: JWT & bcrypt (Role-based access).
- **Utility Libraries**: `pdfkit` for server-side PDF generation, `nodemailer` for email dispatch, `zod` for input validation.

### Directory Structure
```
vendorbridge/
├── frontend/             # React SPA (Vite + Tailwind)
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # The 10 core screens (Dashboard, Rfqs, Approvals, etc.)
│   │   ├── store/        # Zustand global state (authStore)
│   │   └── utils/        # Axios API client setup
├── backend/              # Express API
│   ├── prisma/           # Schema and seed scripts
│   ├── src/
│   │   ├── controllers/  # Business logic (auth, rfq, invoice, logs, etc.)
│   │   ├── middleware/   # RoleGuard and verifyToken
│   │   ├── routes/       # Express router definitions
│   │   └── utils/        # Zod validators & PDF/Email helpers
```

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database URL (e.g., Supabase)

### Quick Start (Run Both Servers)
Since the project is set up with NPM Workspaces, you can run both the frontend and backend simultaneously from the root directory:
```bash
npm install
npm run dev
```

### Alternative: Manual Setup

**1. Backend Setup**
```bash
cd backend
npm install
# Setup your .env file with DATABASE_URL, JWT_SECRET, and SMTP credentials
npm run prisma:generate
npm run prisma:push
# Seed the database with demo Indian region data
npm run prisma:seed
npm run dev
```

**2. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

## Demo Flow

The database is pre-seeded with realistic Indian dummy data to demonstrate the complete workflow. You can test the platform using the following accounts (Password for all: `1234@` depending on seed, check your terminal for exact output, usually `Admin@1234`, `Procure@1234`, `Approve@1234`, `Vendor@1234`):

1. **Procurement Officer** (`procurement@vendorbridge.com`): View the active RFQs, compare submitted quotations from vendors, and initiate the approval sequence for the lowest price.
2. **Vendor** (`vendor1@vendorbridge.com`): Access the Vendor Portal to view assigned RFQs and submit pricing/delivery timelines.
3. **Manager / Approver** (`approver@vendorbridge.com`): View the approval queue, add remarks, and approve or reject procurement requests.
4. **Admin** (`admin@vendorbridge.com`): Manage registered vendors, users, and view top-level analytics and spending reports.

Once an RFQ is approved, switch back to the **Procurement Officer** to auto-generate a Purchase Order, followed by generating the Invoice, downloading the PDF, and sending it via email.

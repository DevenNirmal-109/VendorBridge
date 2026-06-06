import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Components & Layout
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import Rfqs from './pages/Rfqs';
import VendorPortal from './pages/VendorPortal';
import QuoteCompare from './pages/QuoteCompare';
import Approvals from './pages/Approvals';
import PurchaseOrders from './pages/PurchaseOrders';
import Invoices from './pages/Invoices';
import ActivityLogs from './pages/ActivityLogs';
import Reports from './pages/Reports';

// Protected Route Wrapper Component
const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { user, token, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-500">Loading VendorBridge...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

// RFQ Page Dispatcher based on Role
const RfqPageDispatcher = () => {
  const { user } = useAuthStore();
  return user?.role === 'vendor' ? <VendorPortal /> : <Rfqs />;
};

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/po" element={<PurchaseOrders />} />
          <Route path="/invoices" element={<Invoices />} />
        </Route>

        {/* Procurement & Vendor Shared RFQ Route */}
        <Route element={<ProtectedRoute allowedRoles={['procurement', 'vendor']} />}>
          <Route path="/rfq" element={<RfqPageDispatcher />} />
        </Route>

        {/* Procurement Only Routes */}
        <Route element={<ProtectedRoute allowedRoles={['procurement']} />}>
          <Route path="/compare" element={<QuoteCompare />} />
        </Route>

        {/* Procurement & Approver Routes */}
        <Route element={<ProtectedRoute allowedRoles={['procurement', 'approver']} />}>
          <Route path="/approvals" element={<Approvals />} />
        </Route>

        {/* Admin & Procurement Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'procurement']} />}>
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/logs" element={<ActivityLogs />} />
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


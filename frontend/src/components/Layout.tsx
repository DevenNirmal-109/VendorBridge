import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  Users,
  FileText,
  GitPullRequest,
  CheckSquare,
  FileCheck,
  CreditCard,
  History,
  LogOut,
  User,
  Shield,
  Activity,
  FileSpreadsheet
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/vendors')) return 'Vendor Management';
    if (path.startsWith('/rfq')) return 'RFQ Management';
    if (path.startsWith('/compare')) return 'Quotation Comparison';
    if (path.startsWith('/approvals')) return 'Approval Center';
    if (path.startsWith('/po')) return 'Purchase Orders';
    if (path.startsWith('/invoices')) return 'Billing & Invoices';
    if (path.startsWith('/reports')) return 'Reports & Spend Analytics';
    if (path.startsWith('/logs')) return 'System Audit Logs';
    return 'Command Dashboard';
  };

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'procurement', 'approver', 'vendor'],
    },
    {
      to: '/vendors',
      label: 'Vendors',
      icon: Users,
      roles: ['admin', 'procurement'],
    },
    {
      to: '/rfq',
      label: user?.role === 'vendor' ? 'Assigned RFQs' : 'RFQs',
      icon: FileText,
      roles: ['procurement', 'vendor'],
    },
    {
      to: '/compare',
      label: 'Quote Compare',
      icon: GitPullRequest,
      roles: ['procurement'],
    },
    {
      to: '/approvals',
      label: 'Approval Center',
      icon: CheckSquare,
      roles: ['procurement', 'approver'],
    },
    {
      to: '/po',
      label: 'Purchase Orders',
      icon: FileCheck,
      roles: ['procurement', 'approver', 'vendor'],
    },
    {
      to: '/invoices',
      label: 'Invoices',
      icon: CreditCard,
      roles: ['admin', 'procurement', 'vendor'],
    },
    {
      to: '/reports',
      label: 'Analytics & Reports',
      icon: FileSpreadsheet,
      roles: ['admin', 'procurement'],
    },
    {
      to: '/logs',
      label: 'Audit Logs',
      icon: Activity,
      roles: ['admin', 'procurement'],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="app-shell">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-lg font-bold tracking-tight">
              VendorBridge
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">Main Menu</div>
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User profile footer */}
        <div className="sidebar-user text-white">
          <div className="avatar">
            {user?.name.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold truncate leading-tight">
              {user?.name}
            </span>
            <span className="text-xs text-blue-200 capitalize font-medium">
              {user?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 hover:bg-white/10 rounded-md text-blue-200 hover:text-white transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main workspace */}
      <div className="main-area">
        {/* Top Header Bar */}
        <header className="topbar">
          <h2 className="text-lg font-bold text-slate-800">{getPageTitle()}</h2>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 capitalize">
                {user?.role} Portal
              </span>
            </div>
          </div>
        </header>

        {/* Content canvas */}
        <main className="page-content overflow-y-auto bg-slate-50">
          <div className="animate-fade-in max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
export default Layout;

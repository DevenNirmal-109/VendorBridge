import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import {
  FileText,
  Users,
  CheckCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { toast } from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data.stats);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton h-10 w-10 rounded-md" />
              <div className="skeleton h-8 w-24 mt-2" />
              <div className="skeleton h-4 w-32 mt-1" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card md:col-span-2 h-80 p-6">
            <div className="skeleton h-full w-full" />
          </div>
          <div className="card h-80 p-6">
            <div className="skeleton h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Render Vendor specific Dashboard
  if (user?.role === 'vendor') {
    return (
      <div className="flex flex-col gap-6">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="text-2xl font-bold text-slate-800">Welcome, {user.name}</h1>
            <p className="text-sm text-slate-500">Track your active bids, purchase orders, and billing invoices.</p>
          </div>
        </div>

        {/* Vendor Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-card-icon bg-blue-50 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div className="stat-card-value">{stats?.assignedRfqsCount || 0}</div>
            <div className="stat-card-label font-semibold">Assigned RFQs</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="stat-card-value">{stats?.submittedQuotesCount || 0}</div>
            <div className="stat-card-label font-semibold">Bids Submitted</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div className="stat-card-value">{stats?.pendingPOsCount || 0}</div>
            <div className="stat-card-label font-semibold">POs Awaiting Ack</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="stat-card-value">
              ₹{(stats?.totalEarnings || 0).toLocaleString('en-IN')}
            </div>
            <div className="stat-card-label font-semibold">Total Revenue (Paid)</div>
          </div>
        </div>

        {/* Vendor Chart */}
        <div className="card p-6">
          <div className="card-header pb-4 mb-4">
            <h3 className="text-base font-bold text-slate-800">Monthly Earnings (INR)</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.monthlySpend || []}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(37, 99, 235, 0.04)' }} formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // Render Central Dashboard (Admin, Procurement, Approver)
  const COLORS = ['#1B3A6B', '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Monitor procurement progress, approvals, and spend analytics in real time.</p>
        </div>
      </div>

      {/* Central Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-blue-50 text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div className="stat-card-value">{stats?.rfqsCount || 0}</div>
          <div className="stat-card-label font-semibold">Total RFQs Created</div>
          <div className="text-[11px] text-slate-400 font-medium">({stats?.openRfqsCount || 0} open for bid)</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon bg-indigo-50 text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <div className="stat-card-value">{stats?.vendorsCount || 0}</div>
          <div className="stat-card-label font-semibold">Active Vendors</div>
          <div className="text-[11px] text-slate-400 font-medium">Approved partners</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div className="stat-card-value">{stats?.pendingApprovalsCount || 0}</div>
          <div className="stat-card-label font-semibold">Pending Approvals</div>
          <div className="text-[11px] text-slate-400 font-medium">Awaiting decision</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="stat-card-value">
            ₹{(stats?.totalSpend || 0).toLocaleString('en-IN')}
          </div>
          <div className="stat-card-label font-semibold">Total PO Spend</div>
          <div className="text-[11px] text-slate-400 font-medium">Excludes drafts</div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Spend Chart */}
        <div className="card md:col-span-2 p-6 flex flex-col gap-4">
          <h3 className="text-base font-bold text-slate-800">Monthly Purchase Order Spend (INR)</h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.monthlySpend || []}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(27, 58, 107, 0.03)' }} formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" fill="#1B3A6B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spend Category Pie Chart */}
        <div className="card p-6 flex flex-col gap-4">
          <h3 className="text-base font-bold text-slate-800">Spend by Category</h3>
          <div className="h-[260px] flex items-center justify-center">
            {stats?.categorySpend && stats.categorySpend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categorySpend}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {stats.categorySpend.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} style={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 text-sm">
                <AlertCircle className="w-8 h-8 text-slate-300" />
                <span>No category data available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Logs */}
      <div className="card p-6">
        <div className="card-header pb-4 mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Recent Procurement Activities</h3>
          <a
            href="/logs"
            className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
          >
            Full Audit Feed
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="timeline">
          {stats?.recentActivities && stats.recentActivities.length > 0 ? (
            stats.recentActivities.map((log: any) => (
              <div key={log.id} className="timeline-item">
                <div className="timeline-dot">
                  <Activity className="w-4 h-4 text-slate-500" />
                </div>
                <div className="timeline-content">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      {log.description}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge badge-primary text-[10px] py-0">
                      {log.eventType}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      By {log.user?.name || 'System'} ({log.user?.role || 'Service'})
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-sm text-slate-400">
              No recent activity recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;

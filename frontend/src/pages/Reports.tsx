import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  Download,
  Calendar,
  Filter,
  TrendingUp,
  Layers,
  DollarSign,
  RefreshCw,
  FileText,
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

export const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');

  // Fetch Report Data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (category) params.category = category;

      const res = await api.get('/reports/spend', { params });
      setReportData(res.data.data || []);
    } catch (err) {
      console.error('Failed to load spend report:', err);
      toast.error('Failed to load spend report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setCategory('');
    // We fetch immediately after resetting state. Since setState is async, we call fetch with empty values.
    setLoading(true);
    api.get('/reports/spend')
      .then((res) => {
        setReportData(res.data.data || []);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load spend report data');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const headers = [
      'PO Number',
      'Date',
      'RFQ Number',
      'RFQ Title',
      'Category',
      'Vendor Name',
      'Vendor GST',
      'Subtotal (INR)',
      'GST Amount (INR)',
      'Total (INR)',
      'Status'
    ];

    const rows = reportData.map((item) => [
      item.poNumber,
      item.date,
      item.rfqNumber,
      item.rfqTitle,
      item.category,
      item.vendorName,
      item.vendorGst || 'N/A',
      item.subtotal,
      item.gstAmount,
      item.total,
      item.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Spend_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV successfully!');
  };

  // Calculations for KPI Cards
  const totalSpend = reportData.reduce((acc, curr) => acc + curr.total, 0);
  const totalCount = reportData.length;
  const avgPoValue = totalCount > 0 ? totalSpend / totalCount : 0;

  // Aggregate Category Spend
  const categoryAggregate = reportData.reduce((acc: { [key: string]: number }, curr) => {
    const cat = curr.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + curr.total;
    return acc;
  }, {});

  const categoryChartData = Object.keys(categoryAggregate).map((key) => ({
    name: key,
    value: categoryAggregate[key]
  }));

  // Aggregate Monthly Spend
  // Group by YYYY-MM
  const monthlyAggregate = reportData.reduce((acc: { [key: string]: number }, curr) => {
    const month = curr.date.substring(0, 7); // Format: "2026-06"
    acc[month] = (acc[month] || 0) + curr.total;
    return acc;
  }, {});

  const monthlyChartData = Object.keys(monthlyAggregate)
    .sort()
    .map((key) => ({
      month: key,
      amount: monthlyAggregate[key]
    }));

  const COLORS = ['#1B3A6B', '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-2xl font-bold text-slate-800">Spend Analytics & Reports</h1>
          <p className="text-sm text-slate-500">
            Generate procurement reports, analyze monthly spends, and export audit sheets.
          </p>
        </div>
        <div className="page-header-right">
          <button onClick={handleExportCSV} className="btn btn-primary">
            <Download className="w-4 h-4" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <form onSubmit={handleApplyFilter} className="card p-5">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-700">Filter Reports</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="form-group">
            <label className="form-label flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Category
            </label>
            <input
              type="text"
              placeholder="e.g. IT Hardware"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1 justify-center">
              <RefreshCw className="w-4 h-4" />
              Apply
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className="btn btn-secondary flex-1 justify-center"
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-emerald-50 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="stat-card-value">
            ₹{totalSpend.toLocaleString('en-IN')}
          </div>
          <div className="stat-card-label font-semibold">Total Filtered Spend</div>
          <div className="text-[11px] text-slate-400 font-medium">Sum of all approved POs</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon bg-blue-50 text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div className="stat-card-value">{totalCount}</div>
          <div className="stat-card-label font-semibold">PO Volume</div>
          <div className="text-[11px] text-slate-400 font-medium">Number of generated POs</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon bg-amber-50 text-amber-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="stat-card-value">
            ₹{Math.round(avgPoValue).toLocaleString('en-IN')}
          </div>
          <div className="stat-card-label font-semibold">Average PO Size</div>
          <div className="text-[11px] text-slate-400 font-medium">Total spend / PO volume</div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="card p-6 flex flex-col gap-4">
          <h3 className="text-base font-bold text-slate-800">Monthly Purchase Order Trend</h3>
          <div className="h-[280px] w-full">
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(27, 58, 107, 0.03)' }}
                    formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
                  />
                  <Bar dataKey="amount" fill="#1B3A6B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
                <AlertCircle className="w-8 h-8 text-slate-300" />
                <span>No monthly trends data found</span>
              </div>
            )}
          </div>
        </div>

        {/* Spend by Category */}
        <div className="card p-6 flex flex-col gap-4">
          <h3 className="text-base font-bold text-slate-800">Spend Distribution by Category</h3>
          <div className="h-[280px] flex items-center justify-center">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} style={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
                <AlertCircle className="w-8 h-8 text-slate-300" />
                <span>No category data found</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Spend Table */}
      <div className="table-container card">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-800">Detailed Spend Ledger</h3>
          <span className="text-xs text-slate-500 font-medium">Showing {reportData.length} records</span>
        </div>

        {loading ? (
          <div className="p-8 flex flex-col gap-4">
            <div className="skeleton h-10 w-full animate-pulse" />
            <div className="skeleton h-10 w-full animate-pulse" />
            <div className="skeleton h-10 w-full animate-pulse" />
          </div>
        ) : reportData.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Issue Date</th>
                <th>RFQ Ref</th>
                <th>RFQ Category</th>
                <th>Vendor</th>
                <th>Subtotal</th>
                <th>GST Amt</th>
                <th>Total Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="text-mono font-bold text-blue-900">{item.poNumber}</span>
                  </td>
                  <td className="text-xs text-slate-500 font-semibold">{item.date}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 text-xs">{item.rfqTitle}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.rfqNumber}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary text-[10px] uppercase font-semibold">
                      {item.category}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 text-xs">{item.vendorName}</span>
                      {item.vendorGst && (
                        <span className="text-[10px] text-slate-400 font-mono">GST: {item.vendorGst}</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right font-mono text-xs text-slate-600">
                    ₹{item.subtotal.toLocaleString('en-IN')}
                  </td>
                  <td className="text-right font-mono text-xs text-slate-600">
                    ₹{item.gstAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="text-right font-mono text-xs font-bold text-slate-800">
                    ₹{item.total.toLocaleString('en-IN')}
                  </td>
                  <td>
                    {item.status === 'draft' && (
                      <span className="badge badge-secondary text-[10px]">Draft</span>
                    )}
                    {item.status === 'issued' && (
                      <span className="badge badge-primary text-[10px]">Issued</span>
                    )}
                    {item.status === 'acknowledged' && (
                      <span className="badge badge-warning text-[10px]">Acked</span>
                    )}
                    {item.status === 'completed' && (
                      <span className="badge badge-success text-[10px]">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state p-8 text-center flex flex-col items-center gap-2">
            <div className="empty-state-icon bg-slate-100 p-3 rounded-full">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-700">No report records</h3>
            <p className="text-sm text-slate-400">
              There are no purchase orders matching your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

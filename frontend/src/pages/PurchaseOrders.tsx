import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { FileCheck, X, Eye, Download, Send, CheckCircle2, CreditCard, Clock, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const PurchaseOrders: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchPOs = async () => {
    try {
      const res = await api.get('/po');
      setPos(res.data.purchaseOrders);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load purchase orders list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await api.get(`/po/${id}`);
      setSelectedPo(res.data.po);
      setIsDrawerOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load PO details');
    }
  };

  const handleIssuePo = async (id: string) => {
    try {
      const res = await api.post(`/po/${id}/issue`);
      toast.success('PO issued successfully to vendor partner!');
      setSelectedPo(res.data.purchaseOrder);
      setIsDrawerOpen(false);
      fetchPOs();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to issue PO');
    }
  };

  const handleAcknowledgePo = async (id: string) => {
    try {
      const res = await api.patch(`/po/${id}/acknowledge`);
      toast.success('PO acknowledged successfully!');
      setSelectedPo(res.data.purchaseOrder);
      setIsDrawerOpen(false);
      fetchPOs();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to acknowledge PO');
    }
  };

  const handleDownloadPdf = async (id: string, poNumber: string) => {
    setPdfLoading(true);
    try {
      const response = await api.get(`/po/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `PO-${poNumber}.pdf`;
      link.click();
      toast.success('Purchase Order PDF downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF document');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-2xl font-bold text-slate-800">Purchase Orders (PO)</h1>
          <p className="text-sm text-slate-500">Track purchase authorizations, vendor acknowledgments, and invoicing readiness.</p>
        </div>
      </div>

      {loading ? (
        <div className="card p-6 flex flex-col gap-4">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      ) : pos.length > 0 ? (
        <div className="table-container card">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Vendor Name</th>
                <th>Subtotal</th>
                <th>Total (with GST)</th>
                <th>Status</th>
                <th>Issued Date</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => (
                <tr key={po.id}>
                  <td>
                    <span className="text-mono font-bold text-blue-900">{po.poNumber}</span>
                  </td>
                  <td className="font-semibold text-slate-800">{po.vendor.name}</td>
                  <td className="font-mono text-xs text-slate-600">₹{Number(po.subtotal).toFixed(2)}</td>
                  <td className="font-mono font-bold text-slate-700">₹{Number(po.total).toLocaleString('en-IN')}</td>
                  <td>
                    {po.status === 'draft' && (
                      <span className="badge badge-muted text-[10px] capitalize">draft</span>
                    )}
                    {po.status === 'issued' && (
                      <span className="badge badge-warning text-[10px] capitalize">issued</span>
                    )}
                    {po.status === 'acknowledged' && (
                      <span className="badge badge-accent text-[10px] capitalize">acknowledged</span>
                    )}
                    {po.status === 'completed' && (
                      <span className="badge badge-success text-[10px] capitalize">completed</span>
                    )}
                  </td>
                  <td className="text-xs text-slate-400">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleOpenDetail(po.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View PO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <FileCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">No POs recorded</h3>
          <p className="text-sm text-slate-400">Purchase orders will automatically generate once quotations are approved.</p>
        </div>
      )}

      {/* PO Detail Slide Drawer */}
      {isDrawerOpen && selectedPo && (
        <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer animate-slide-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-mono font-bold">{selectedPo.poNumber}</span>
                <h3 className="text-base font-bold text-slate-800">Purchase Order Details</h3>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="drawer-body flex flex-col gap-5 overflow-y-auto">
              
              {/* Status Header */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Current Status</span>
                  <span className="font-bold text-slate-800 capitalize">{selectedPo.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Issued Date</span>
                  <span className="font-bold text-slate-800">{new Date(selectedPo.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Vendor Section */}
              <div className="flex flex-col gap-1 text-xs">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vendor Details</h4>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold flex flex-col gap-1">
                  <span className="text-slate-800 text-sm font-extrabold">{selectedPo.vendor.name}</span>
                  <span>GSTIN: {selectedPo.vendor.gstNumber}</span>
                  <span>Email: {selectedPo.vendor.email}</span>
                  {selectedPo.vendor.phone && <span>Phone: {selectedPo.vendor.phone}</span>}
                  {selectedPo.vendor.address && <p className="text-slate-400 font-normal mt-1 leading-normal">📍 {selectedPo.vendor.address}</p>}
                </div>
              </div>

              {/* Quotation items list */}
              <div className="flex flex-col gap-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Items Sheet</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="p-2 font-bold">Item Description</th>
                        <th className="p-2 font-bold text-right">Qty</th>
                        <th className="p-2 font-bold text-right">Price</th>
                        <th className="p-2 font-bold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPo.approval.quotation.items.map((item: any) => (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="p-2 font-semibold text-slate-800">
                            {item.rfqItem.itemName}
                          </td>
                          <td className="p-2 text-right font-medium text-slate-600">
                            {Number(item.rfqItem.quantity)} {item.rfqItem.unit || 'pcs'}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-600">₹{Number(item.unitPrice).toFixed(2)}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-700">₹{Number(item.totalPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdowns */}
              <div className="flex flex-col gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal:</span>
                  <span className="font-mono">₹{Number(selectedPo.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">GST Rate:</span>
                  <span>{Number(selectedPo.gstRate).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">GST Amount:</span>
                  <span className="font-mono">₹{Number(selectedPo.gstAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                  <span className="text-slate-800 font-extrabold">Grand Total:</span>
                  <span className="font-mono font-bold text-blue-900">₹{Number(selectedPo.total).toLocaleString('en-IN')}</span>
                </div>
              </div>

            </div>

            {/* Actions panel */}
            <div className="drawer-footer bg-slate-50">
              <button
                onClick={() => handleDownloadPdf(selectedPo.id, selectedPo.poNumber)}
                disabled={pdfLoading}
                className="btn btn-secondary flex-1 justify-center"
              >
                <Download className="w-4 h-4" />
                {pdfLoading ? 'Downloading...' : 'Export PO PDF'}
              </button>

              {user?.role === 'procurement' && selectedPo.status === 'draft' && (
                <button
                  onClick={() => handleIssuePo(selectedPo.id)}
                  className="btn btn-primary flex-1 justify-center"
                >
                  <Send className="w-4 h-4" />
                  Issue PO
                </button>
              )}

              {user?.role === 'vendor' && selectedPo.status === 'issued' && (
                <button
                  onClick={() => handleAcknowledgePo(selectedPo.id)}
                  className="btn btn-primary flex-1 justify-center"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Acknowledge PO
                </button>
              )}

              {user?.role === 'vendor' && selectedPo.status === 'acknowledged' && !selectedPo.invoice && (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate(`/invoices?action=create&poId=${selectedPo.id}`);
                  }}
                  className="btn btn-primary flex-1 justify-center"
                >
                  <CreditCard className="w-4 h-4" />
                  Generate Invoice
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
export default PurchaseOrders;

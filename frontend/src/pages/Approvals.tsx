import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { CheckSquare, X, ShieldCheck, ThumbsUp, ThumbsDown, Calendar, Eye, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Approvals: React.FC = () => {
  const { user } = useAuthStore();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [remarks, setRemarks] = useState('');

  const fetchApprovals = async () => {
    try {
      const res = await api.get('/approvals');
      setApprovals(res.data.approvals);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load approvals list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleOpenDetail = async (approvalId: string) => {
    try {
      const res = await api.get(`/approvals/${approvalId}`);
      setSelectedApproval(res.data.approval);
      setRemarks(res.data.approval.remarks || '');
      setIsDetailOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load approval details');
    }
  };

  const handleAction = async (status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/approvals/${selectedApproval.id}`, { status, remarks });
      toast.success(`Quotation request successfully ${status}!`);
      setIsDetailOpen(false);
      fetchApprovals();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update approval request');
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-2xl font-bold text-slate-800">Approval Center</h1>
          <p className="text-sm text-slate-500">Review requested quotations, inspect vendor terms, and sign off or reject orders.</p>
        </div>
      </div>

      {loading ? (
        <div className="card p-6 flex flex-col gap-4">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      ) : approvals.length > 0 ? (
        <div className="table-container card">
          <table className="data-table">
            <thead>
              <tr>
                <th>RFQ Ref</th>
                <th>RFQ Project</th>
                <th>Vendor Bidding</th>
                <th>Quoted Amount</th>
                <th>Requester</th>
                <th>Approver</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((app) => (
                <tr key={app.id}>
                  <td>
                    <span className="text-mono font-bold text-blue-900">{app.rfq.rfqNumber}</span>
                  </td>
                  <td className="font-semibold text-slate-800">{app.rfq.title}</td>
                  <td className="font-semibold text-slate-700">{app.quotation.vendor.name}</td>
                  <td className="font-mono font-bold text-slate-700">₹{Number(app.quotation.totalAmount).toLocaleString('en-IN')}</td>
                  <td className="text-xs text-slate-500 font-semibold">{app.requester.name}</td>
                  <td className="text-xs text-slate-500 font-semibold">{app.approver.name}</td>
                  <td>
                    {app.status === 'pending' && (
                      <span className="badge badge-warning text-[10px] capitalize">Pending</span>
                    )}
                    {app.status === 'approved' && (
                      <span className="badge badge-success text-[10px] capitalize">Approved</span>
                    )}
                    {app.status === 'rejected' && (
                      <span className="badge badge-danger text-[10px] capitalize">Rejected</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleOpenDetail(app.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review
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
            <CheckSquare className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">No approvals listed</h3>
          <p className="text-sm text-slate-400">There are no pending or history approval logs associated with your profile.</p>
        </div>
      )}

      {/* Review Modal */}
      {isDetailOpen && selectedApproval && createPortal(
        <div className="modal-overlay">
          <div className="modal modal-xl animate-scale-in">
            <div className="modal-header">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Review Quotation Approval
              </h3>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="modal-body flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
              
              {/* Core summary */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-slate-400 block font-normal text-[10px] uppercase">RFQ reference</span>
                  <span className="text-slate-800 font-mono">{selectedApproval.rfq.rfqNumber} — {selectedApproval.rfq.title}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-normal text-[10px] uppercase">Vendor Partner</span>
                  <span className="text-slate-800">{selectedApproval.quotation.vendor.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-normal text-[10px] uppercase">Total Quote Amount</span>
                  <span className="text-base text-slate-800 font-bold font-mono">₹{Number(selectedApproval.quotation.totalAmount).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-normal text-[10px] uppercase">Requested by</span>
                  <span className="text-slate-800">{selectedApproval.requester.name} ({selectedApproval.requester.email})</span>
                </div>
              </div>

              {/* Items list */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400">Bid Line Items</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="p-2 font-bold">Item Description</th>
                        <th className="p-2 font-bold text-right">Qty</th>
                        <th className="p-2 font-bold text-right">Quoted Price</th>
                        <th className="p-2 font-bold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedApproval.quotation.items.map((item: any) => (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="p-2 font-semibold text-slate-800">
                            {item.rfqItem.itemName}
                          </td>
                          <td className="p-2 text-right text-slate-600">{Number(item.rfqItem.quantity)} {item.rfqItem.unit || 'pcs'}</td>
                          <td className="p-2 text-right font-mono text-slate-600">₹{Number(item.unitPrice).toFixed(2)}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-700">₹{Number(item.totalPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks Textarea */}
              <div className="form-group">
                <label className="form-label flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  Review Remarks / Comments
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={selectedApproval.status !== 'pending' || user?.role !== 'approver'}
                  placeholder="Enter approval details, price negotiation comments, or rejection reasons here..."
                  className="form-textarea"
                />
              </div>

            </div>

            <div className="modal-footer bg-slate-50">
              {selectedApproval.status === 'pending' && user?.role === 'approver' ? (
                <div className="flex gap-2 w-full justify-end">
                  <button
                    type="button"
                    onClick={() => handleAction('rejected')}
                    className="btn btn-danger"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Reject Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('approved')}
                    className="btn btn-primary"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Approve & Issue PO
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-semibold text-slate-500">
                    Decision: <strong className="capitalize text-slate-800">{selectedApproval.status}</strong>
                  </span>
                  <button type="button" onClick={() => setIsDetailOpen(false)} className="btn btn-secondary">
                    Close Review
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default Approvals;

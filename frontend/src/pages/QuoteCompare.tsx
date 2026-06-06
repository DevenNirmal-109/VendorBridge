import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { GitPullRequest, ArrowRight, ShieldCheck, ChevronRight, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const QuoteCompare: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rfqIdFromUrl = searchParams.get('rfqId');

  const [rfqList, setRfqList] = useState<any[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<string>(rfqIdFromUrl || '');
  const [rfqDetails, setRfqDetails] = useState<any>(null);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Approval modal states
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [selectedApproverId, setSelectedApproverId] = useState<string>('');

  useEffect(() => {
    // Fetch all RFQs to populate dropdown
    const fetchRfqs = async () => {
      try {
        const res = await api.get('/rfq');
        // Only show RFQs with quotations that are open or awarded
        setRfqList(res.data.rfqs.filter((r: any) => r.status === 'open' || r.status === 'awarded'));
      } catch (err) {
        console.error(err);
      }
    };
    fetchRfqs();
  }, []);

  useEffect(() => {
    const fetchRfqDetails = async () => {
      if (!selectedRfqId) return;
      setLoading(true);
      try {
        const res = await api.get(`/rfq/${selectedRfqId}`);
        setRfqDetails(res.data.rfq);

        // Fetch active approvers
        const appRes = await api.get('/auth/approvers');
        setApprovers(appRes.data.approvers);
        if (appRes.data.approvers.length > 0) {
          setSelectedApproverId(appRes.data.approvers[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load RFQ quotations comparison');
      } finally {
        setLoading(false);
      }
    };
    fetchRfqDetails();
  }, [selectedRfqId]);

  const handleOpenApprovalModal = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setIsApprovalModalOpen(true);
  };

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApproverId) {
      toast.error('Please choose a valid approver');
      return;
    }

    try {
      await api.post('/approvals', {
        rfqId: selectedRfqId,
        quotationId: selectedQuoteId,
        approverId: selectedApproverId,
      });
      toast.success('Quotation submitted for review! Redirecting to Approval Center.');
      setIsApprovalModalOpen(false);
      navigate('/approvals');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to submit approval request');
    }
  };

  // Logic: Find lowest unit price for an item across all quotes
  const getLowestUnitPrice = (itemId: string): number => {
    if (!rfqDetails || !rfqDetails.quotations) return Infinity;
    const prices = rfqDetails.quotations.map((q: any) => {
      const qItem = q.items?.find((it: any) => it.rfqItemId === itemId);
      return qItem ? Number(qItem.unitPrice) : Infinity;
    });
    return Math.min(...prices);
  };

  // Logic: Find lowest overall quote total
  const getLowestQuoteTotal = (): number => {
    if (!rfqDetails || !rfqDetails.quotations || rfqDetails.quotations.length === 0) return Infinity;
    const totals = rfqDetails.quotations.map((q: any) => Number(q.totalAmount));
    return Math.min(...totals);
  };

  const lowestGrandTotal = getLowestQuoteTotal();

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-2xl font-bold text-slate-800">Quotation Comparison Matrix</h1>
          <p className="text-sm text-slate-500">Compare vendor bid pricing side-by-side, highlight lowest bids, and request approvals.</p>
        </div>
      </div>

      {/* Dropdown RFQ Selector */}
      <div className="card p-4 flex items-center gap-4">
        <label className="text-sm font-semibold text-slate-700">Select Active RFQ:</label>
        <select
          value={selectedRfqId}
          onChange={(e) => setSelectedRfqId(e.target.value)}
          className="form-select flex-1 max-w-md"
        >
          <option value="">-- Choose RFQ to Compare --</option>
          {rfqList.map((r) => (
            <option key={r.id} value={r.id}>
              {r.rfqNumber} — {r.title} ({r.category})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="card p-6 flex flex-col gap-4">
          <div className="skeleton h-10 w-full animate-pulse" />
          <div className="skeleton h-48 w-full animate-pulse" />
        </div>
      )}

      {/* Comparison Grid */}
      {!loading && rfqDetails && (
        <div className="flex flex-col gap-4">
          {rfqDetails.quotations && rfqDetails.quotations.length > 0 ? (
            <div className="table-container card overflow-x-auto">
              <table className="data-table border-collapse w-full">
                <thead>
                  <tr>
                    <th className="min-w-[200px] bg-slate-800 text-white font-bold p-3">Required Item Detail</th>
                    {rfqDetails.quotations.map((q: any) => (
                      <th key={q.id} className="min-w-[180px] bg-slate-800 text-white text-center font-bold p-3">
                        {q.vendor.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* RFQ Items loop */}
                  {rfqDetails.items.map((item: any) => {
                    const lowestPrice = getLowestUnitPrice(item.id);
                    return (
                      <tr key={item.id}>
                        <td className="p-3 border-r border-slate-200 bg-slate-50 font-semibold text-slate-700">
                          <div>{item.itemName}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                            Quantity: {Number(item.quantity)} {item.unit || 'pcs'}
                          </div>
                        </td>

                        {/* Vendors loop */}
                        {rfqDetails.quotations.map((q: any) => {
                          const quoteItem = q.items?.find((it: any) => it.rfqItemId === item.id);
                          const isLowest = quoteItem && Number(quoteItem.unitPrice) === lowestPrice;

                          return (
                            <td
                              key={q.id}
                              className={`p-3 text-center border-r border-slate-200 font-mono ${
                                isLowest ? 'lowest-price' : ''
                              }`}
                            >
                              {quoteItem ? (
                                <div className="flex flex-col">
                                  <span className="font-bold">₹{Number(quoteItem.unitPrice).toFixed(2)}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    Total: ₹{Number(quoteItem.totalPrice).toFixed(2)}
                                  </span>
                                  {quoteItem.notes && (
                                    <span className="text-[9px] text-slate-500 font-normal italic mt-1">
                                      * {quoteItem.notes}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-red-500 font-medium">No Bid</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Summary Rows */}
                  <tr className="border-t-2 border-slate-300 bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">Grand Total Quoted</td>
                    {rfqDetails.quotations.map((q: any) => {
                      const isLowestTotal = Number(q.totalAmount) === lowestGrandTotal;
                      return (
                        <td
                          key={q.id}
                          className={`p-3 text-center font-mono font-bold text-base ${
                            isLowestTotal ? 'lowest-price text-emerald-800' : 'text-slate-800'
                          }`}
                        >
                          ₹{Number(q.totalAmount).toLocaleString('en-IN')}
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">Lead Time (Delivery)</td>
                    {rfqDetails.quotations.map((q: any) => (
                      <td key={q.id} className="p-3 text-center font-semibold text-slate-600">
                        {q.deliveryDays} days
                      </td>
                    ))}
                  </tr>

                  <tr className="bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">Vendor Terms</td>
                    {rfqDetails.quotations.map((q: any) => (
                      <td key={q.id} className="p-3 text-center text-xs text-slate-500 font-medium italic max-w-[180px] truncate">
                        {q.notes || 'N/A'}
                      </td>
                    ))}
                  </tr>

                  {/* Actions Row */}
                  <tr className="bg-slate-100">
                    <td className="p-3 font-bold text-slate-700">Approval Chain</td>
                    {rfqDetails.quotations.map((q: any) => {
                      const isAwarded = rfqDetails.status === 'awarded';
                      const isSelected = q.status === 'selected';
                      return (
                        <td key={q.id} className="p-4 text-center">
                          {isAwarded ? (
                            isSelected ? (
                              <span className="badge badge-success py-1 text-xs font-bold gap-1 inline-flex">
                                <Check className="w-3.5 h-3.5" /> Selected Quote
                              </span>
                            ) : (
                              <span className="badge badge-muted py-1 text-xs font-semibold">
                                Closed
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => handleOpenApprovalModal(q.id)}
                              className="btn btn-accent btn-sm mx-auto shadow-sm"
                            >
                              Submit for Approval
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card p-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <h3 className="font-bold text-base">No Quotations Received</h3>
              <p className="text-sm text-slate-400">Assigned vendors have not submitted any bids for this RFQ yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Select Approver Modal */}
      {isApprovalModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal animate-scale-in">
            <div className="modal-header">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Select Approver
              </h3>
              <button onClick={() => setIsApprovalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApprovalSubmit}>
              <div className="modal-body flex flex-col gap-4">
                <p className="text-xs text-slate-500 font-medium">
                  Please select an authorized Manager / Approver who will sign off on this quotation to trigger the Purchase Order generation.
                </p>

                <div className="form-group">
                  <label className="form-label">Authorized Approver *</label>
                  <select
                    value={selectedApproverId}
                    onChange={(e) => setSelectedApproverId(e.target.value)}
                    required
                    className="form-select"
                  >
                    {approvers.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name} ({app.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsApprovalModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit to Approver
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default QuoteCompare;

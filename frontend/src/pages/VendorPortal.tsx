import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { FileText, Send, Calendar, Award, CheckCircle, Clock, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const VendorPortal: React.FC = () => {
  const { user } = useAuthStore();
  const [assignedRfqs, setAssignedRfqs] = useState<any[]>([]);
  const [submittedQuotes, setSubmittedQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bid Modal State
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<any>(null);
  const [deliveryDays, setDeliveryDays] = useState<number>(7);
  const [notes, setNotes] = useState('');
  const [itemPrices, setItemPrices] = useState<Record<string, { unitPrice: number; notes: string }>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch assigned RFQs
      const rfqRes = await api.get('/rfq');
      setAssignedRfqs(rfqRes.data.rfqs);

      // Fetch quotations submitted by this vendor
      const quoteRes = await api.get('/quotations');
      setSubmittedQuotes(quoteRes.data.quotations);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load portal bids details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenBidModal = async (rfqId: string) => {
    try {
      const res = await api.get(`/rfq/${rfqId}`);
      const rfq = res.data.rfq;
      setSelectedRfq(rfq);
      
      // Initialize price inputs
      const initialPrices: Record<string, { unitPrice: number; notes: string }> = {};
      rfq.items.forEach((item: any) => {
        initialPrices[item.id] = { unitPrice: 0, notes: '' };
      });
      setItemPrices(initialPrices);
      setDeliveryDays(7);
      setNotes('');
      setIsBidModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load RFQ specifications');
    }
  };

  const handlePriceChange = (itemId: string, price: number) => {
    setItemPrices({
      ...itemPrices,
      [itemId]: { ...itemPrices[itemId], unitPrice: price },
    });
  };

  const handleItemNoteChange = (itemId: string, noteStr: string) => {
    setItemPrices({
      ...itemPrices,
      [itemId]: { ...itemPrices[itemId], notes: noteStr },
    });
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate prices
    const itemsPayload = Object.entries(itemPrices).map(([rfqItemId, detail]) => {
      if (Number(detail.unitPrice) < 0) {
        throw new Error('Item unit price cannot be negative');
      }
      return {
        rfqItemId,
        unitPrice: Number(detail.unitPrice),
        notes: detail.notes || null,
      };
    });

    try {
      // Find matching vendor ID from user context or backend
      const vendorsRes = await api.get('/vendors');
      const vendorRecord = vendorsRes.data.vendors.find((v: any) => v.email === user?.email);

      if (!vendorRecord) {
        toast.error('Could not resolve your Vendor credentials. Please contact support.');
        return;
      }

      const payload = {
        rfqId: selectedRfq.id,
        vendorId: vendorRecord.id,
        deliveryDays,
        notes: notes || null,
        items: itemsPayload,
      };

      await api.post('/quotations', payload);
      toast.success('Your quotation has been successfully submitted!');
      setIsBidModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || err.response?.data?.error || 'Failed to submit bid');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  }

  // Active open RFQs that are not yet bid on
  const openBids = assignedRfqs.filter(
    (rfq) =>
      rfq.status === 'open' &&
      !submittedQuotes.some((q) => q.rfqId === rfq.id)
  );

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-2xl font-bold text-slate-800">Vendor Portal</h1>
          <p className="text-sm text-slate-500">Respond to assigned requests, monitor submitted quotations, and view results.</p>
        </div>
      </div>

      {/* Grid: Open RFQs for Bidding */}
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <Clock className="w-5 h-5 text-amber-500" />
          Open RFQs Inviting Bids
        </h3>

        {openBids.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openBids.map((rfq) => (
              <div key={rfq.id} className="card p-5 hover:shadow-md transition">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-mono font-bold text-blue-900 text-xs">{rfq.rfqNumber}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-full">
                      <Calendar className="w-3 h-3" />
                      Due {new Date(rfq.deadline).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800">{rfq.title}</h3>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Category: {rfq.category}</p>

                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => handleOpenBidModal(rfq.id)}
                      className="btn btn-primary btn-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit Quotation
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <span>You have submitted quotations for all assigned RFQs! Excellent job.</span>
          </div>
        )}
      </div>

      {/* Grid: Submitted Quotations History */}
      <div className="flex flex-col gap-4 mt-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <Award className="w-5 h-5 text-blue-600" />
          Your Submitted Quotations
        </h3>

        {submittedQuotes.length > 0 ? (
          <div className="table-container card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>RFQ Number</th>
                  <th>RFQ Project</th>
                  <th>Delivery Days</th>
                  <th>Quoted Amount</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {submittedQuotes.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span className="text-mono font-bold text-blue-900">{q.rfq.rfqNumber}</span>
                    </td>
                    <td className="font-semibold text-slate-800">{q.rfq.title}</td>
                    <td className="font-medium text-slate-600">{q.deliveryDays} days</td>
                    <td className="font-mono font-bold text-slate-700">₹{Number(q.totalAmount).toLocaleString('en-IN')}</td>
                    <td>
                      {q.status === 'submitted' && (
                        <span className="badge badge-warning text-[10px] capitalize">submitted</span>
                      )}
                      {q.status === 'selected' && (
                        <span className="badge badge-success text-[10px] capitalize">awarded (selected)</span>
                      )}
                      {q.status === 'rejected' && (
                        <span className="badge badge-danger text-[10px] capitalize">rejected</span>
                      )}
                    </td>
                    <td className="text-xs text-slate-400">
                      {q.submittedAt ? new Date(q.submittedAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-slate-400">
            No bids submitted yet
          </div>
        )}
      </div>

      {/* Submit Bid Modal */}
      {isBidModalOpen && selectedRfq && (
        <div className="modal-overlay">
          <div className="modal modal-lg animate-scale-in">
            <div className="modal-header">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-mono font-bold">Quoting for {selectedRfq.rfqNumber}</span>
                <h3 className="text-base font-bold text-slate-800">{selectedRfq.title}</h3>
              </div>
              <button onClick={() => setIsBidModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBidSubmit}>
              <div className="modal-body flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
                
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Est. Delivery Time (Days) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(Number(e.target.value))}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      disabled
                      value={selectedRfq.category}
                      className="form-input bg-slate-50 cursor-not-allowed text-slate-400 font-semibold"
                    />
                  </div>
                </div>

                {/* Items Quote Sheet */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Quote Item Prices (INR)</h4>
                  <div className="flex flex-col gap-3">
                    {selectedRfq.items.map((item: any) => (
                      <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex-1">
                          <span className="text-xs font-bold text-slate-800">{item.itemName}</span>
                          <p className="text-[10px] text-slate-400">{item.description || 'No item description'}</p>
                          <span className="badge badge-accent text-[9px] py-0.2 px-2 mt-1">
                            Qty Required: {Number(item.quantity)} {item.unit || 'pcs'}
                          </span>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                          <div className="form-group flex-1 md:w-36">
                            <label className="text-[10px] font-bold text-slate-500">Unit Price *</label>
                            <input
                              type="number"
                              required
                              min={0.01}
                              step="0.01"
                              value={itemPrices[item.id]?.unitPrice || ''}
                              onChange={(e) => handlePriceChange(item.id, Number(e.target.value))}
                              placeholder="0.00"
                              className="form-input"
                            />
                          </div>

                          <div className="form-group flex-[1.5] md:w-48">
                            <label className="text-[10px] font-bold text-slate-500">Item Notes</label>
                            <input
                              type="text"
                              value={itemPrices[item.id]?.notes || ''}
                              onChange={(e) => handleItemNoteChange(item.id, e.target.value)}
                              placeholder="e.g. 1 year replacement warranty"
                              className="form-input font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* General Notes */}
                <div className="form-group">
                  <label className="form-label">General Terms / Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter payment terms request, delivery location terms, or other bid notes..."
                    className="form-textarea"
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsBidModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Bid
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default VendorPortal;

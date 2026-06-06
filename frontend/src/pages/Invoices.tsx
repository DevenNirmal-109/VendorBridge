import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { CreditCard, X, Eye, Plus, Send, CheckCircle2, DollarSign, Calendar, Mail, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Invoices: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const poIdFromUrl = searchParams.get('poId');
  const actionFromUrl = searchParams.get('action');

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Create Invoice Form States
  const [formPoId, setFormPoId] = useState(poIdFromUrl || '');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30');
  const [targetPo, setTargetPo] = useState<any>(null);
  const [poList, setPoList] = useState<any[]>([]);
  const [emailLoading, setEmailLoading] = useState<Record<string, boolean>>({});

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data.invoices);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoices list');
    } finally {
      setLoading(false);
    }
  };

  const fetchPOs = async () => {
    try {
      const res = await api.get('/po');
      // Only POs with status acknowledged can be invoiced
      const filterPOs = res.data.purchaseOrders.filter(
        (po: any) => po.status === 'acknowledged'
      );
      setPoList(filterPOs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    if (user?.role === 'vendor') {
      fetchPOs();
    }
  }, [user]);

  // Handle auto-open of create modal from PO redirect
  useEffect(() => {
    if (actionFromUrl === 'create' && poIdFromUrl && user?.role === 'vendor') {
      const loadTargetPo = async () => {
        try {
          const res = await api.get(`/po/${poIdFromUrl}`);
          setTargetPo(res.data.po);
          setFormPoId(poIdFromUrl);
          setIsCreateModalOpen(true);
        } catch (err) {
          console.error(err);
        }
      };
      loadTargetPo();
    }
  }, [actionFromUrl, poIdFromUrl, user]);

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setSelectedInvoice(res.data.invoice);
      setIsDetailOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoice details');
    }
  };

  const handleOpenCreateModal = () => {
    setFormPoId('');
    setFormDueDate('');
    setFormPaymentTerms('Net 30');
    setTargetPo(null);
    setIsCreateModalOpen(true);
  };

  const handlePoChange = async (poId: string) => {
    setFormPoId(poId);
    if (!poId) {
      setTargetPo(null);
      return;
    }
    try {
      const res = await api.get(`/po/${poId}`);
      setTargetPo(res.data.po);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPoId || !formDueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await api.post('/invoices', {
        poId: formPoId,
        dueDate: new Date(formDueDate).toISOString(),
        paymentTerms: formPaymentTerms,
      });
      toast.success('Invoice submitted successfully!');
      setIsCreateModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to submit invoice');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await api.patch(`/invoices/${id}/status`, { status: 'paid' });
      toast.success('Invoice marked as PAID. Purchase Order completed.');
      if (selectedInvoice && selectedInvoice.id === id) {
        // Refresh details if open
        const res = await api.get(`/invoices/${id}`);
        setSelectedInvoice(res.data.invoice);
      }
      fetchInvoices();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update payment status');
    }
  };

  const handleSendEmail = async (id: string) => {
    setEmailLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.post(`/invoices/${id}/send-email`);
      toast.success('Invoice PDF dispatched via SMTP email successfully!');
      if (selectedInvoice && selectedInvoice.id === id) {
        // Refresh detail
        const res = await api.get(`/invoices/${id}`);
        setSelectedInvoice(res.data.invoice);
      }
      fetchInvoices();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to dispatch email');
    } finally {
      setEmailLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-2xl font-bold text-slate-800">Billing & Invoices</h1>
          <p className="text-sm text-slate-500">Record billing transactions, update paid statuses, and dispatch PDF invoices.</p>
        </div>
        {user?.role === 'vendor' && (
          <div className="page-header-right">
            <button onClick={handleOpenCreateModal} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Generate Invoice
            </button>
          </div>
        )}
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="card p-6 flex flex-col gap-4">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      ) : invoices.length > 0 ? (
        <div className="table-container card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>PO Reference</th>
                <th>Vendor Name</th>
                <th>Total Billed</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Email Despatch</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <span className="text-mono font-bold text-blue-900">{inv.invoiceNumber}</span>
                  </td>
                  <td>
                    <span className="text-mono text-xs text-slate-600 font-semibold">{inv.po.poNumber}</span>
                  </td>
                  <td className="font-semibold text-slate-800">{inv.po.vendor.name}</td>
                  <td className="font-mono font-bold text-slate-700">₹{Number(inv.po.total).toLocaleString('en-IN')}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    {inv.status === 'sent' && (
                      <span className="badge badge-warning text-[10px] capitalize">Sent</span>
                    )}
                    {inv.status === 'paid' && (
                      <span className="badge badge-success text-[10px] capitalize">Paid</span>
                    )}
                  </td>
                  <td>
                    {inv.emailSentAt ? (
                      <span className="badge badge-blue text-[9px] font-semibold gap-1 inline-flex items-center">
                        <Mail className="w-3 h-3" /> Dispatched
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendEmail(inv.id)}
                        disabled={emailLoading[inv.id]}
                        className="btn btn-secondary btn-sm p-1 text-xs text-blue-600"
                        title="Send PDF Invoice via Email"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {emailLoading[inv.id] ? 'Sending...' : 'Dispatch'}
                      </button>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleOpenDetail(inv.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
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
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">No invoices submitted</h3>
          <p className="text-sm text-slate-400">Vendors can submit invoices once their Purchase Orders are Acknowledged.</p>
        </div>
      )}

      {/* Invoice Detail modal */}
      {isDetailOpen && selectedInvoice && createPortal(
        <div className="modal-overlay">
          <div className="modal modal-xl animate-scale-in">
            <div className="modal-header">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-mono font-bold">{selectedInvoice.invoiceNumber}</span>
                <h3 className="text-base font-bold text-slate-800">Invoice Specs</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="modal-body flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
              
              {/* Financial Breakdowns */}
              <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">GSTIN Billed From</span>
                  <span className="text-slate-800 font-mono">{selectedInvoice.po.vendor.gstNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Vendor Partner</span>
                  <span className="text-slate-800 truncate block">{selectedInvoice.po.vendor.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">PO Reference</span>
                  <span className="text-slate-800 font-mono">{selectedInvoice.po.poNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Due Date</span>
                  <span className="text-slate-800">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Payment Terms</span>
                  <span className="text-slate-800">{selectedInvoice.paymentTerms || 'Net 30'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Grand Total Amount</span>
                  <span className="text-sm font-mono font-bold text-blue-900">₹{Number(selectedInvoice.po.total).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Items Sheet */}
              <div className="flex flex-col gap-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Line Items</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="p-2 font-bold text-slate-700">Item Name</th>
                        <th className="p-2 font-bold text-slate-700 text-right">Qty</th>
                        <th className="p-2 font-bold text-slate-700 text-right">Price</th>
                        <th className="p-2 font-bold text-slate-700 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.po.approval.quotation.items.map((item: any) => (
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

            </div>

            <div className="modal-footer bg-slate-50 justify-between items-center">
              <div className="text-xs font-semibold text-slate-500">
                Email Despatch: {selectedInvoice.emailSentAt ? `Sent on ${new Date(selectedInvoice.emailSentAt).toLocaleDateString()}` : 'Not dispatched'}
              </div>
              <div className="flex gap-2">
                {user?.role === 'procurement' && selectedInvoice.status === 'sent' && (
                  <button
                    onClick={() => handleMarkPaid(selectedInvoice.id)}
                    className="btn btn-primary"
                  >
                    <DollarSign className="w-4 h-4" />
                    Mark as Paid
                  </button>
                )}
                {!selectedInvoice.emailSentAt && (
                  <button
                    onClick={() => handleSendEmail(selectedInvoice.id)}
                    disabled={emailLoading[selectedInvoice.id]}
                    className="btn btn-secondary inline-flex items-center gap-1.5"
                  >
                    <Mail className="w-4 h-4" />
                    {emailLoading[selectedInvoice.id] ? 'Sending...' : 'Email Invoice PDF'}
                  </button>
                )}
                <button onClick={() => setIsDetailOpen(false)} className="btn btn-secondary">
                  Close details
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Generate Invoice Modal (Vendor Only) */}
      {isCreateModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal animate-scale-in">
            <div className="modal-header">
              <h3 className="text-base font-bold text-slate-800">Generate Invoicing Draft</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body flex flex-col gap-4">
                
                {/* select PO */}
                <div className="form-group">
                  <label className="form-label">Purchase Order Reference *</label>
                  <select
                    value={formPoId}
                    onChange={(e) => handlePoChange(e.target.value)}
                    required
                    disabled={!!poIdFromUrl}
                    className="form-select"
                  >
                    <option value="">-- Choose Acknowledged PO --</option>
                    {poList.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} — Total: ₹{Number(po.total).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>

                {targetPo && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span>Vendor Partner:</span>
                      <span className="text-slate-800">{targetPo.vendor.name}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Total Amount:</span>
                      <span className="text-blue-900 font-bold">₹{Number(targetPo.total).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Terms *</label>
                  <input
                    type="text"
                    required
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    placeholder="e.g. Net 30, COD"
                    className="form-input font-medium"
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Invoice
                  <Send className="w-3.5 h-3.5" />
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
export default Invoices;

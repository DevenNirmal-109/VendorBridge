import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { Plus, Search, Calendar, ChevronRight, X, Trash2, Shield, Eye, Award, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Rfqs: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<any>(null);

  // Form States
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formItems, setFormItems] = useState<any[]>([
    { itemName: '', description: '', quantity: 1, unit: 'units', estPrice: '' },
  ]);
  const [formAssignedVendors, setFormAssignedVendors] = useState<string[]>([]);

  const fetchRfqs = async () => {
    try {
      const res = await api.get('/rfq');
      setRfqs(res.data.rfqs);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load RFQs');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors');
      // Only assignable vendors must be active
      setVendors(res.data.vendors.filter((v: any) => v.status === 'active'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRfqs();
    if (user?.role === 'procurement') {
      fetchVendors();
    }
  }, [user]);

  const handleOpenDetail = async (rfqId: string) => {
    try {
      const res = await api.get(`/rfq/${rfqId}`);
      setSelectedRfq(res.data.rfq);
      setIsDetailOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load RFQ details');
    }
  };

  // Dynamic Item manipulation
  const handleAddItemRow = () => {
    setFormItems([
      ...formItems,
      { itemName: '', description: '', quantity: 1, unit: 'units', estPrice: '' },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  };

  const handleVendorCheckboxChange = (vendorId: string) => {
    if (formAssignedVendors.includes(vendorId)) {
      setFormAssignedVendors(formAssignedVendors.filter((id) => id !== vendorId));
    } else {
      setFormAssignedVendors([...formAssignedVendors, vendorId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formAssignedVendors.length === 0) {
      toast.error('Please assign at least one vendor to this RFQ');
      return;
    }

    // Prepare payload
    const payload = {
      title: formTitle,
      description: formDesc || null,
      category: formCategory,
      deadline: new Date(formDeadline).toISOString(),
      items: formItems.map((it) => ({
        itemName: it.itemName,
        description: it.description || null,
        quantity: Number(it.quantity),
        unit: it.unit || null,
        estPrice: it.estPrice ? Number(it.estPrice) : null,
      })),
      assignedVendorIds: formAssignedVendors,
    };

    try {
      await api.post('/rfq', payload);
      toast.success('RFQ successfully generated and published!');
      setIsCreateModalOpen(false);
      fetchRfqs();
      // Reset form
      setFormTitle('');
      setFormDesc('');
      setFormCategory('');
      setFormDeadline('');
      setFormItems([{ itemName: '', description: '', quantity: 1, unit: 'units', estPrice: '' }]);
      setFormAssignedVendors([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to create RFQ');
    }
  };

  // Filter RFQs
  const filteredRfqs = rfqs.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.rfqNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter ? r.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-2xl font-bold text-slate-800">Request For Quotations (RFQ)</h1>
          <p className="text-sm text-slate-500">Draft, assign, and track bidding response rates for open RFQs.</p>
        </div>
        {user?.role === 'procurement' && (
          <div className="page-header-right">
            <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Create RFQ Draft
            </button>
          </div>
        )}
      </div>

      {/* Filter panel */}
      <div className="card p-4 flex gap-4 items-center flex-wrap">
        <div className="search-input-wrap flex-1 min-w-[240px]">
          <Search className="search-icon w-4 h-4" />
          <input
            type="text"
            placeholder="Search RFQ Title or Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select max-w-[150px]"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="awarded">Awarded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* RFQ List Table */}
      {loading ? (
        <div className="card p-6 flex flex-col gap-4">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      ) : filteredRfqs.length > 0 ? (
        <div className="table-container card">
          <table className="data-table">
            <thead>
              <tr>
                <th>RFQ Number</th>
                <th>RFQ Title</th>
                <th>Category</th>
                <th>Deadline Date</th>
                <th>Status</th>
                <th>Created By</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRfqs.map((rfq) => (
                <tr key={rfq.id}>
                  <td>
                    <span className="text-mono font-bold text-blue-900">{rfq.rfqNumber}</span>
                  </td>
                  <td className="font-semibold text-slate-800">{rfq.title}</td>
                  <td>
                    <span className="badge badge-primary text-[10px] uppercase font-semibold">
                      {rfq.category || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(rfq.deadline).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    {rfq.status === 'open' && (
                      <span className="badge badge-success text-[10px]">Open</span>
                    )}
                    {rfq.status === 'closed' && (
                      <span className="badge badge-warning text-[10px]">Closed</span>
                    )}
                    {rfq.status === 'awarded' && (
                      <span className="badge badge-blue text-[10px]">Awarded</span>
                    )}
                    {rfq.status === 'cancelled' && (
                      <span className="badge badge-danger text-[10px]">Cancelled</span>
                    )}
                  </td>
                  <td className="text-xs text-slate-500 font-semibold">{rfq.creator.name}</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleOpenDetail(rfq.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                      <ChevronRight className="w-3.5 h-3.5" />
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
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">No RFQs found</h3>
          <p className="text-sm text-slate-400">There are no open or closed RFQs registered on the platform.</p>
        </div>
      )}

      {/* RFQ Detail Slide Drawer */}
      {isDetailOpen && selectedRfq && (
        <div className="drawer-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="drawer animate-slide-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-mono font-bold">{selectedRfq.rfqNumber}</span>
                <h3 className="text-base font-bold text-slate-800">{selectedRfq.title}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="drawer-body flex flex-col gap-6">
              {/* Info block */}
              <div className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Category:</span>
                  <span className="font-bold text-slate-700">{selectedRfq.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Bidding Deadline:</span>
                  <span className="font-bold text-slate-700">{new Date(selectedRfq.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span className="font-bold text-slate-700 capitalize">{selectedRfq.status}</span>
                </div>
                {selectedRfq.description && (
                  <p className="text-slate-500 mt-2 border-t border-slate-200/60 pt-2 font-medium">
                    {selectedRfq.description}
                  </p>
                )}
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-800">Items Sheet</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="p-2 font-bold text-slate-700">Item Name</th>
                        <th className="p-2 font-bold text-slate-700 text-right">Qty</th>
                        <th className="p-2 font-bold text-slate-700 text-right">Est. Unit Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRfq.items.map((item: any) => (
                        <tr key={item.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50">
                          <td className="p-2 font-semibold text-slate-800">
                            {item.itemName}
                            {item.description && <p className="text-[10px] text-slate-400 font-normal">{item.description}</p>}
                          </td>
                          <td className="p-2 text-right font-medium text-slate-600">
                            {Number(item.quantity)} {item.unit || 'pcs'}
                          </td>
                          <td className="p-2 text-right font-mono font-medium text-slate-600">
                            {item.estPrice ? `₹${Number(item.estPrice).toLocaleString('en-IN')}` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Assigned Vendors / Quotes */}
              {user?.role !== 'vendor' && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold text-slate-800">Vendor Bids Response</h4>
                  <div className="flex flex-col gap-2">
                    {selectedRfq.vendorAssignments.map((assignment: any) => {
                      const quote = selectedRfq.quotations.find((q: any) => q.vendorId === assignment.vendorId);
                      return (
                        <div key={assignment.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{assignment.vendor.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{assignment.vendor.category}</span>
                          </div>
                          <div>
                            {quote ? (
                              <span className="badge badge-success py-0.5 text-[9px] font-bold">
                                Submitted (₹{Number(quote.totalAmount).toLocaleString('en-IN')})
                              </span>
                            ) : (
                              <span className="badge badge-warning py-0.5 text-[9px] font-bold">Pending Bid</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="drawer-footer bg-slate-50">
              {user?.role === 'procurement' && selectedRfq.status === 'open' && selectedRfq.quotations.length > 0 && (
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    navigate(`/compare?rfqId=${selectedRfq.id}`);
                  }}
                  className="btn btn-primary w-full justify-center"
                >
                  <Award className="w-4 h-4" />
                  Compare Vendor Quotations
                </button>
              )}
              {user?.role === 'vendor' && selectedRfq.status === 'open' && selectedRfq.quotations.length === 0 && (
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    navigate(`/rfq`); // Redirects to vendor bid view
                    toast('Go to Vendor Portal to submit bid!', { icon: 'ℹ️' });
                  }}
                  className="btn btn-primary w-full justify-center"
                >
                  Submit Quote
                </button>
              )}
              <button onClick={() => setIsDetailOpen(false)} className="btn btn-secondary flex-1 justify-center">
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create RFQ Modal (Procurement Only) */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-lg animate-scale-in">
            <div className="modal-header">
              <h3 className="text-base font-bold text-slate-800">Draft Request For Quotation</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
                {/* Meta details */}
                <div className="form-group">
                  <label className="form-label">RFQ Project Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Procurement of Office Workstations"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Project Description</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Specify project parameters, shipping instructions, and delivery expectations..."
                    className="form-textarea"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <input
                      type="text"
                      required
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="e.g. IT Hardware"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bidding Deadline *</label>
                    <input
                      type="date"
                      required
                      value={formDeadline}
                      onChange={(e) => setFormDeadline(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-sm font-bold text-slate-800">Required Items Sheet</h4>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="btn btn-secondary btn-sm"
                    >
                      <Plus className="w-3 h-3" />
                      Add Item Row
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {formItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-end p-3 bg-slate-50 border border-slate-200 rounded-lg relative">
                        <div className="form-group flex-[2]">
                          <label className="text-[10px] font-bold text-slate-500">Item Name *</label>
                          <input
                            type="text"
                            required
                            value={item.itemName}
                            onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                            placeholder="MacBook Pro 16 Inch"
                            className="form-input"
                          />
                        </div>

                        <div className="form-group flex-1">
                          <label className="text-[10px] font-bold text-slate-500">Qty *</label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="form-input"
                          />
                        </div>

                        <div className="form-group flex-1">
                          <label className="text-[10px] font-bold text-slate-500">Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            placeholder="pcs"
                            className="form-input"
                          />
                        </div>

                        <div className="form-group flex-[1.5]">
                          <label className="text-[10px] font-bold text-slate-500">Est. Price (INR)</label>
                          <input
                            type="number"
                            value={item.estPrice}
                            onChange={(e) => handleItemChange(idx, 'estPrice', e.target.value)}
                            placeholder="85000"
                            className="form-input"
                          />
                        </div>

                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="btn btn-danger btn-sm p-1.5 h-10 align-middle"
                            title="Delete Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vendor Assignment */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Assign Vendor Partners</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-1">
                    {vendors.length > 0 ? (
                      vendors.map((vendor) => (
                        <label
                          key={vendor.id}
                          className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition text-xs font-semibold text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={formAssignedVendors.includes(vendor.id)}
                            onChange={() => handleVendorCheckboxChange(vendor.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <div className="flex flex-col">
                            <span>{vendor.name}</span>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{vendor.category}</span>
                          </div>
                        </label>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 col-span-2">No active vendors registered to assign.</span>
                    )}
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish RFQ Bids
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Rfqs;

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { Plus, Search, Star, Edit, ShieldAlert, X, CheckCircle, Ban, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Vendors: React.FC = () => {
  const { user } = useAuthStore();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formGstNumber, setFormGstNumber] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors');
      setVendors(res.data.vendors);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load vendors list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setFormName('');
    setFormCategory('');
    setFormGstNumber('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vendor: any) => {
    setEditingVendor(vendor);
    setFormName(vendor.name);
    setFormCategory(vendor.category);
    setFormGstNumber(vendor.gstNumber);
    setFormEmail(vendor.email);
    setFormPhone(vendor.phone || '');
    setFormAddress(vendor.address || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formGstNumber.length !== 15) {
      toast.error('GST Identification Number must be exactly 15 characters');
      return;
    }

    const payload = {
      name: formName,
      category: formCategory,
      gstNumber: formGstNumber.toUpperCase(),
      email: formEmail,
      phone: formPhone || null,
      address: formAddress || null,
    };

    try {
      if (editingVendor) {
        await api.put(`/vendors/${editingVendor.id}`, payload);
        toast.success('Vendor profile updated successfully');
      } else {
        await api.post('/vendors', payload);
        toast.success('Vendor registered successfully');
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/vendors/${id}/status`, { status });
      toast.success(`Vendor marked as ${status}`);
      fetchVendors();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  // Filter vendors
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.gstNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter ? v.category === categoryFilter : true;
    const matchesStatus = statusFilter ? v.status === statusFilter : true;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Unique categories
  const categories = Array.from(new Set(vendors.map((v) => v.category)));

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-2xl font-bold text-slate-800">Vendors Directory</h1>
          <p className="text-sm text-slate-500">Manage procurement partner profiles, tax credentials, and status logs.</p>
        </div>
        <div className="page-header-right">
          <button onClick={handleOpenAddModal} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Add Vendor Partner
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <div className="search-input-wrap flex-1 min-w-[240px]">
          <Search className="search-icon w-4 h-4" />
          <input
            type="text"
            placeholder="Search vendor name, email or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="form-select max-w-[200px]"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select max-w-[150px]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
      </div>

      {/* Grid of Vendors */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 flex flex-col gap-3">
              <div className="skeleton h-6 w-2/3" />
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-10 w-full mt-2" />
            </div>
          ))}
        </div>
      ) : filteredVendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="card flex flex-col justify-between hover:shadow-md transition">
              <div className="card-body flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <span className="badge badge-primary text-[10px] uppercase font-bold tracking-wider">
                    {vendor.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-600">{Number(vendor.rating || 0).toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <h3 className="text-base font-extrabold text-slate-800 leading-tight">
                    {vendor.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium font-mono mt-0.5">
                    {vendor.gstNumber}
                  </span>
                </div>

                <div className="text-xs text-slate-600 flex flex-col gap-1 mt-1">
                  <span className="truncate">📧 {vendor.email}</span>
                  <span>📞 {vendor.phone || 'No phone'}</span>
                  <p className="text-slate-400 truncate mt-1">📍 {vendor.address || 'No address'}</p>
                </div>
              </div>

              <div className="card-footer flex items-center justify-between">
                <div>
                  {vendor.status === 'active' && (
                    <span className="badge badge-success text-[10px] capitalize font-semibold">Active</span>
                  )}
                  {vendor.status === 'inactive' && (
                    <span className="badge badge-warning text-[10px] capitalize font-semibold">Inactive</span>
                  )}
                  {vendor.status === 'blacklisted' && (
                    <span className="badge badge-danger text-[10px] capitalize font-semibold">Blacklisted</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(vendor)}
                    className="btn btn-secondary btn-sm p-1"
                    title="Edit Partner"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  {user?.role === 'admin' && (
                    <>
                      {vendor.status !== 'active' && (
                        <button
                          onClick={() => handleStatusChange(vendor.id, 'active')}
                          className="btn btn-secondary btn-sm p-1 text-emerald-600 hover:bg-emerald-50"
                          title="Activate Partner"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {vendor.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(vendor.id, 'inactive')}
                          className="btn btn-secondary btn-sm p-1 text-amber-600 hover:bg-amber-50"
                          title="Deactivate Partner"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {vendor.status !== 'blacklisted' && (
                        <button
                          onClick={() => handleStatusChange(vendor.id, 'blacklisted')}
                          className="btn btn-secondary btn-sm p-1 text-red-600 hover:bg-red-50"
                          title="Blacklist Partner"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">No vendors found</h3>
          <p className="text-sm text-slate-400">Try adjusting your search criteria or register a new vendor partner.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal animate-scale-in">
            <div className="modal-header">
              <h3 className="text-base font-bold text-slate-800">
                {editingVendor ? 'Edit Vendor Profile' : 'Register New Vendor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body flex flex-col gap-4">
                
                <div className="form-group">
                  <label className="form-label">Vendor Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Apex Supplies Pvt Ltd"
                    className="form-input"
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
                    <label className="form-label">GSTIN (15 Alphanumeric) *</label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={formGstNumber}
                      onChange={(e) => setFormGstNumber(e.target.value)}
                      placeholder="e.g. 27AAPCT1234A1ZR"
                      className="form-input font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="sales@apex.com"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91-9876543210"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Corporate Address</label>
                  <textarea
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Enter corporate office address..."
                    className="form-textarea"
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingVendor ? 'Save Changes' : 'Register Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Vendors;

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, MoreVertical, Mail, Phone, Building, TrendingUp, Edit, Trash2, X, FileText } from 'lucide-react';
import { clientAPI } from '../../../services/api';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const DEMO_CLIENTS = [
  { id: '1', name: 'Tata Consultancy Services', email: 'billing@tcs.com', phone: '+91 22 6778 9000', gstin: '27AAACT2727Q1ZW', city: 'Mumbai', totalBilled: 4500000, totalPaid: 4500000, outstanding: 0, invoiceCount: 12 },
  { id: '2', name: 'Infosys Limited', email: 'accounts@infosys.com', phone: '+91 80 2852 0261', gstin: '29AABCI1681B1ZK', city: 'Bengaluru', totalBilled: 2800000, totalPaid: 1200000, outstanding: 1600000, invoiceCount: 8 },
  { id: '3', name: 'Wipro Technologies', email: 'ap@wipro.com', phone: '+91 80 2844 0011', gstin: '29AAACW0306D2ZH', city: 'Bengaluru', totalBilled: 1850000, totalPaid: 1065000, outstanding: 785000, invoiceCount: 6 },
  { id: '4', name: 'HCL Services Ltd', email: 'finance@hcl.com', phone: '+91 120 432 1234', gstin: '09AAACH0392F1ZY', city: 'Noida', totalBilled: 920000, totalPaid: 690000, outstanding: 230000, invoiceCount: 5 },
  { id: '5', name: 'Mahindra & Mahindra', email: 'vendor@mahindra.com', phone: '+91 22 2490 1441', gstin: '27AAACM3025E1ZN', city: 'Mumbai', totalBilled: 480000, totalPaid: 385000, outstanding: 95000, invoiceCount: 4 },
];

function ClientModal({ client, onClose, onSave }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: client || {} });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (client?.id) {
        await clientAPI.update(client.id, data);
        toast.success('Client updated');
      } else {
        await clientAPI.create(data);
        toast.success('Client added');
      }
      onSave();
    } catch { onSave(); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg mx-2 animate-slide-up">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Company / Client Name *</label>
              <input {...register('name', { required: 'Required' })} className="input-field" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Email *</label>
              <input {...register('email', { required: 'Required' })} className="input-field" type="email" />
            </div>

            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input-field" />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <textarea {...register('address')} className="input-field" rows={2} />
            </div>

            <div>
              <label className="label">City</label>
              <input {...register('city')} className="input-field" />
            </div>

            <div>
              <label className="label">State</label>
              <input {...register('state')} className="input-field" />
            </div>

            <div>
              <label className="label">GSTIN</label>
              <input {...register('gstin')} className="input-field font-mono" />
            </div>

            <div>
              <label className="label">PAN</label>
              <input {...register('pan')} className="input-field font-mono" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Saving...' : client ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientAPI.list();
      setClients(res.data?.clients || res.data || []);
    } catch {
      setClients(DEMO_CLIENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    try { await clientAPI.delete(id); toast.success('Client deleted'); } catch {}
    setClients(prev => prev.filter(c => c.id !== id));
    setActiveMenu(null);
  };

  const filtered = clients.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in px-3 sm:px-0">

      {modal && (
        <ClientModal
          client={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}

      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="section-title">Clients</h1>
          <p className="section-subtitle">{filtered.length} clients total</p>
        </div>

        <button onClick={() => setModal('add')} className="btn-primary w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Total Billed', value: formatCurrency(clients.reduce((s, c) => s + (c.totalBilled || 0), 0)), color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Collected', value: formatCurrency(clients.reduce((s, c) => s + (c.totalPaid || 0), 0)), color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Outstanding', value: formatCurrency(clients.reduce((s, c) => s + (c.outstanding || 0), 0)), color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 sm:p-5">
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <p className={`text-xl sm:text-2xl font-extrabold ${color.split(' ')[0]}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input-field pl-10"
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(client => (
            <div
              key={client.id}
              className="card-hover p-4 sm:p-5 group"
              onClick={() => setSelected(selected?.id === client.id ? null : client)}
            >
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 font-bold">
                      {client.name?.[0]}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {client.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {client.city}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === client.id ? null : client.id);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>

                  {activeMenu === client.id && (
                    <div className="absolute right-0 top-8 z-20 w-40 bg-white border border-gray-100 rounded-xl shadow-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal(client);
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client.id);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* contact */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{client.email}</span>
                </div>

                {client.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{client.phone}</span>
                  </div>
                )}

                {client.gstin && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Building className="w-3.5 h-3.5" />
                    <span className="font-mono truncate">{client.gstin}</span>
                  </div>
                )}
              </div>

              {/* stats */}
              <div className="border-t border-gray-50 pt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-400">Billed</p>
                  <p className="text-xs font-bold">{formatCurrency(client.totalBilled)}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600">Paid</p>
                  <p className="text-xs font-bold text-emerald-600">
                    {formatCurrency(client.totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Due</p>
                  <p className={`text-xs font-bold ${client.outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {formatCurrency(client.outstanding)}
                  </p>
                </div>
              </div>

              {/* progress */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: client.totalBilled
                        ? `${Math.min(100, (client.totalPaid / client.totalBilled) * 100)}%`
                        : '0%'
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {client.totalBilled
                    ? Math.round((client.totalPaid / client.totalBilled) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
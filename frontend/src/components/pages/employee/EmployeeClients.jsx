import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Mail, Phone, Building, Edit, X } from 'lucide-react';
import { clientAPI } from '../../../services/api';
import { formatCurrency } from '../../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';


function ClientModal({ client, onClose, onSave }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: client || {} });
  const [loading, setLoading] = useState(false);
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (client?.id) { await clientAPI.update(client.id, data); toast.success('Client updated'); }
      else { await clientAPI.create(data); toast.success('Client added'); }
      onSave();
    } catch { onSave(); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{client ? 'Edit Client' : 'Add Client'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Client Name *</label>
            <input {...register('name', { required: 'Required' })} className="input-field" placeholder="Company Name" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email *</label>
              <input {...register('email', { required: 'Required' })} className="input-field" type="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea {...register('address')} className="input-field" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">City</label><input {...register('city')} className="input-field" /></div>
            <div><label className="label">GSTIN</label><input {...register('gstin')} className="input-field font-mono" /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : client ? 'Save' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeeClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientAPI.list();
      setClients(res.data?.clients || res.data || []);
    } catch { setClients(DEMO); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {modal && <ClientModal client={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}

      <div className="page-header">
        <div>
          <h1 className="section-title">Clients</h1>
          <p className="section-subtitle">{filtered.length} clients</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary"><Plus className="w-4 h-4" /> Add Client</button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-10" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="card h-36 animate-pulse" />)}</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div key={client.id} className="card-hover p-5 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center font-bold text-primary-700">{client.name?.[0]}</div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{client.name}</p>
                    <p className="text-xs text-gray-400">{client.city}</p>
                  </div>
                </div>
                <button onClick={() => setModal(client)} className="p-1.5 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                  <Edit className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500"><Mail className="w-3.5 h-3.5" /><span className="truncate">{client.email}</span></div>
                {client.phone && <div className="flex items-center gap-2 text-xs text-gray-500"><Phone className="w-3.5 h-3.5" />{client.phone}</div>}
                {client.gstin && <div className="flex items-center gap-2 text-xs text-gray-500"><Building className="w-3.5 h-3.5" /><span className="font-mono">{client.gstin}</span></div>}
              </div>
              <div className="border-t border-gray-50 pt-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-gray-400">Billed</p><p className="text-xs font-bold text-gray-900">{formatCurrency(client.totalBilled)}</p></div>
                <div><p className="text-xs text-gray-400">Paid</p><p className="text-xs font-bold text-emerald-600">{formatCurrency(client.totalPaid)}</p></div>
                <div><p className="text-xs text-gray-400">Due</p><p className={`text-xs font-bold ${client.outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{formatCurrency(client.outstanding)}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
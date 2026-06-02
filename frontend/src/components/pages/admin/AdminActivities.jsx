import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, RefreshCw, FileText, User, DollarSign, Edit, Send, Eye, Trash2, Plus, CheckCircle } from 'lucide-react';
import { activityAPI } from '../../../services/api';
import { formatDate, timeAgo } from '../../../utils/helpers';

const DEMO_ACTIVITIES = [
  { id: '1', action: 'invoice_paid', description: 'Invoice INV-2402-0012 marked as paid', user: { name: 'System' }, entityType: 'invoice', entityId: 'INV-2402-0012', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: '2', action: 'invoice_sent', description: 'Invoice INV-2402-0011 sent to Infosys Limited', user: { name: 'Priya Sharma' }, entityType: 'invoice', entityId: 'INV-2402-0011', createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString() },
  { id: '3', action: 'invoice_created', description: 'New invoice INV-2402-0011 created for Infosys Limited', user: { name: 'Priya Sharma' }, entityType: 'invoice', entityId: 'INV-2402-0011', createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: '4', action: 'client_created', description: 'New client Wipro Technologies added', user: { name: 'Rahul Mehta' }, entityType: 'client', entityId: null, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: '5', action: 'invoice_viewed', description: 'Client viewed invoice INV-2402-0009', user: { name: 'System' }, entityType: 'invoice', entityId: 'INV-2402-0009', createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
  { id: '6', action: 'invoice_edited', description: 'Invoice INV-2402-0010 updated by Amit Kumar', user: { name: 'Amit Kumar' }, entityType: 'invoice', entityId: 'INV-2402-0010', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: '7', action: 'employee_added', description: 'New employee Sneha Patel added to the team', user: { name: 'Admin' }, entityType: 'employee', entityId: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: '8', action: 'invoice_paid', description: 'Invoice INV-2402-0007 marked as paid', user: { name: 'System' }, entityType: 'invoice', entityId: 'INV-2402-0007', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() },
  { id: '9', action: 'invoice_created', description: 'New invoice INV-2402-0010 created for Wipro Technologies', user: { name: 'Amit Kumar' }, entityType: 'invoice', entityId: 'INV-2402-0010', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString() },
  { id: '10', action: 'client_edited', description: 'Client HCL Services contact details updated', user: { name: 'Rahul Mehta' }, entityType: 'client', entityId: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
];

const ACTION_CONFIG = {
  invoice_created:  { icon: Plus,         color: 'bg-blue-50 text-blue-600',    label: 'Created' },
  invoice_sent:     { icon: Send,         color: 'bg-purple-50 text-purple-600', label: 'Sent' },
  invoice_viewed:   { icon: Eye,          color: 'bg-indigo-50 text-indigo-600', label: 'Viewed' },
  invoice_paid:     { icon: CheckCircle,  color: 'bg-emerald-50 text-emerald-600', label: 'Paid' },
  invoice_edited:   { icon: Edit,         color: 'bg-amber-50 text-amber-600',  label: 'Edited' },
  invoice_deleted:  { icon: Trash2,       color: 'bg-red-50 text-red-600',      label: 'Deleted' },
  client_created:   { icon: Plus,         color: 'bg-blue-50 text-blue-600',    label: 'Client Added' },
  client_edited:    { icon: Edit,         color: 'bg-amber-50 text-amber-600',  label: 'Client Edited' },
  employee_added:   { icon: User,         color: 'bg-cyan-50 text-cyan-600',    label: 'Employee Added' },
  payment_received: { icon: DollarSign,   color: 'bg-emerald-50 text-emerald-600', label: 'Payment' },
};

const FILTERS = ['all', 'invoice', 'client', 'employee', 'payment'];

export default function AdminActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await activityAPI.list({ entity: entityFilter !== 'all' ? entityFilter : undefined });
      setActivities(res.data?.activities || res.data || []);
    } catch { setActivities(DEMO_ACTIVITIES); }
    finally { setLoading(false); }
  }, [entityFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = activities.filter(a =>
    !search ||
    a.description?.toLowerCase().includes(search.toLowerCase()) ||
    a.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by date
  const grouped = filtered.reduce((acc, act) => {
    const day = formatDate(act.createdAt, 'dd MMM yyyy');
    if (!acc[day]) acc[day] = [];
    acc[day].push(act);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="section-title">Activity Log</h1>
          <p className="section-subtitle">Complete audit trail of all actions</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-10" placeholder="Search activities..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setEntityFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200 ${entityFilter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, acts]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{day}</div>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">{acts.length} events</span>
              </div>
              <div className="card overflow-hidden divide-y divide-gray-50">
                {acts.map((act, i) => {
                  const cfg = ACTION_CONFIG[act.action] || { icon: FileText, color: 'bg-gray-50 text-gray-500', label: act.action };
                  const Icon = cfg.icon;
                  return (
                    <div key={act.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className={`w-9 h-9 rounded-xl ${cfg.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{act.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <User className="w-3 h-3" />
                            <span>{act.user?.name || 'System'}</span>
                          </div>
                          {act.entityId && (
                            <span className="text-xs font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">{act.entityId}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`badge text-xs ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(act.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card p-12 text-center text-gray-400">No activities found.</div>
          )}
        </div>
      )}
    </div>
  );
}
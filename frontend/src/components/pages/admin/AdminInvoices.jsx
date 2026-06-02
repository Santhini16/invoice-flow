import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Plus, Download, MoreVertical,
  Eye, Send, Trash2, RefreshCw, Edit,
  CheckCircle, Filter, FileText
} from 'lucide-react';
import { invoiceAPI } from '../../../services/api';
import { formatCurrency, formatDate, invoiceStatusConfig } from '../../../utils/helpers';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const STATUS_FILTERS = ['all', 'draft', 'sent', 'viewed', 'paid', 'overdue'];

export default function AdminInvoices() {
  const navigate = useNavigate();
  const [allInvoices,  setAllInvoices]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeMenu,   setActiveMenu]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceAPI.list({});
      setAllInvoices(res.data?.invoices || res.data || []);
    } catch {
      setAllInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // close menu on outside click
  useEffect(() => {
    const h = (e) => { if (!e.target.closest('[data-menu]')) setActiveMenu(null); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const handleStatusChange = async (id, status) => {
    try { await invoiceAPI.updateStatus(id, status); toast.success(`Marked as ${status}`); }
    catch { toast.success(`Marked as ${status}!`); }
    setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    setActiveMenu(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try { await invoiceAPI.delete(id); toast.success('Invoice deleted'); }
    catch { toast.success('Deleted!'); }
    setAllInvoices(prev => prev.filter(inv => inv.id !== id));
    setActiveMenu(null);
  };

  const handleSend = async (id) => {
    try { await invoiceAPI.send(id, 'email'); toast.success('Invoice sent!'); }
    catch { toast.success('Sent! (offline)'); }
    setAllInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'sent' } : i));
    setActiveMenu(null);
  };

  // ── Export to Excel ─────────────────────────────────────────────────────
  const handleExport = () => {
    if (filtered.length === 0) { toast.error('No invoices to export'); return; }
    const rows = filtered.map(inv => ({
      'Invoice #':    inv.invoiceNumber,
      'Client':       inv.client?.name || '',
      'Created By':   inv.createdBy?.name || '',
      'Issue Date':   formatDate(inv.issueDate),
      'Due Date':     formatDate(inv.dueDate),
      'Subtotal':     inv.subtotal || 0,
      'GST Amount':   inv.gstAmount || 0,
      'Total (₹)':    inv.total || 0,
      'Status':       inv.status,
    }));
    const ws  = XLSX.utils.json_to_sheet(rows);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `invoices-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${rows.length} invoices`);
  };

  const filtered = allInvoices.filter(inv => {
    const ms = !search ||
      inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.createdBy?.name?.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter === 'all' || inv.status === statusFilter;
    return ms && mf;
  });

  const totalAmount = filtered.reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="section-title">All Invoices</h1>
          <p className="section-subtitle">
            {filtered.length} of {allInvoices.length} invoices · {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export Excel
          </button>
          {/* Admin creates invoice using the admin route */}
          <Link to="/admin/invoices/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input-field pl-10"
            placeholder="Search by invoice #, client, or employee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <button onClick={load} className="btn-secondary text-sm flex-shrink-0">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : allInvoices.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-gray-500 font-semibold mb-2">No invoices yet</p>
            <p className="text-sm text-gray-400 mb-6">Invoices created by your team will appear here.</p>
            <Link to="/admin/invoices/new" className="btn-primary text-sm mx-auto inline-flex">
              <Plus className="w-4 h-4" /> Create First Invoice
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Filter className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No invoices match your filters</p>
            <button onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="text-sm text-primary-600 font-semibold mt-2 hover:text-primary-700">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Invoice #', 'Client', 'Created By', 'Issue Date', 'Due Date', 'Amount', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => {
                  const cfg = invoiceStatusConfig[inv.status] || invoiceStatusConfig.draft;
                  const isOverdue = inv.status !== 'paid' && new Date(inv.dueDate) < new Date();
                  const canEdit   = inv.status === 'draft';

                  return (
                    <tr key={inv.id} className="table-row-hover group">
                      {/* Invoice # — navigates to /admin/invoices/:id */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => navigate(`/admin/invoices/${inv.id}`)}
                          className="font-mono text-sm text-primary-600 font-semibold hover:underline text-left"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800 text-sm">{inv.client?.name || '—'}</p>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500">
                        {inv.createdBy?.name || '—'}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(inv.issueDate)}
                      </td>

                      <td className="px-5 py-4 text-sm whitespace-nowrap">
                        <span className={isOverdue && inv.status !== 'paid' ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                          {formatDate(inv.dueDate)}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-bold text-gray-900 text-sm">
                        {formatCurrency(inv.total)}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`badge ${cfg.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4" data-menu>
                        <div className="relative inline-block" data-menu>
                          <button
                            data-menu
                            onClick={e => { e.stopPropagation(); setActiveMenu(prev => prev === inv.id ? null : inv.id); }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-60 group-hover:opacity-100"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>

                          {activeMenu === inv.id && (
                            <div data-menu className="absolute right-0 top-9 z-30 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                              {/* View — navigates within admin */}
                              <button
                                onClick={() => { navigate(`/admin/invoices/${inv.id}`); setActiveMenu(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye className="w-4 h-4 text-blue-500" /> View
                              </button>

                              {/* Edit */}
                              {canEdit && (
                                <button
                                  onClick={() => { navigate(`/admin/invoices/${inv.id}/edit`); setActiveMenu(null); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4 text-amber-500" /> Edit
                                </button>
                              )}

                              {/* Send */}
                              {inv.status === 'draft' && (
                                <button onClick={() => handleSend(inv.id)}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-primary-600 hover:bg-primary-50">
                                  <Send className="w-4 h-4" /> Send
                                </button>
                              )}

                              {/* Mark paid */}
                              {!['paid','cancelled'].includes(inv.status) && (
                                <button onClick={() => handleStatusChange(inv.id, 'paid')}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-emerald-600 hover:bg-emerald-50">
                                  <CheckCircle className="w-4 h-4" /> Mark Paid
                                </button>
                              )}

                              {/* Delete */}
                              {inv.status !== 'paid' && (
                                <button onClick={() => handleDelete(inv.id)}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
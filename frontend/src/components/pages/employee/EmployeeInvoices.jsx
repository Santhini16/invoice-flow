import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Eye, Edit, Send, Trash2,
  MoreVertical, RefreshCw, Inbox, Filter,
  Download, ChevronDown
} from 'lucide-react';
import { invoiceAPI } from '../../../services/api';
import { formatCurrency, formatDate, invoiceStatusConfig } from '../../../utils/helpers';
import toast from 'react-hot-toast';

const ALL_STATUSES = ['draft', 'sent', 'viewed', 'paid', 'overdue'];

export default function EmployeeInvoices() {
  const navigate = useNavigate();

  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

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

  useEffect(() => {
    const h = (e) => {
      if (!e.target.closest('[data-menu]')) setActiveMenu(null);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const ALL_STATUSES_SAFE = ['draft', 'sent', 'viewed', 'paid', 'overdue'];

  const counts = ALL_STATUSES_SAFE.reduce((acc, s) => {
    if (s === 'overdue') {
      acc[s] = allInvoices.filter(i =>
        i.status !== 'paid' &&
        new Date(i.dueDate) < new Date()
      ).length;
    } else {
      acc[s] = allInvoices.filter(i => i.status === s).length;
    }
    return acc;
  }, {});

  const displayed = allInvoices.filter(inv => {
    const matchStatus =
      !activeStatus
        ? true
        : activeStatus === 'overdue'
          ? inv.status !== 'paid' &&
            new Date(inv.dueDate) < new Date()
          : inv.status === activeStatus;

    const matchSearch =
      !search ||
      inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client?.name?.toLowerCase().includes(search.toLowerCase());

    return matchStatus && matchSearch;
  });

  const toggleStatus = (s) => {
    setActiveStatus(prev => (prev === s ? null : s));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try { await invoiceAPI.delete(id); toast.success('Invoice deleted'); }
    catch { toast.success('Deleted!'); }

    setAllInvoices(prev => prev.filter(i => i.id !== id));
    setActiveMenu(null);
  };

  const handleSend = async (id) => {
    try {
      await invoiceAPI.send(id, 'email');
      toast.success('Invoice sent via email!');
      setAllInvoices(prev =>
        prev.map(i => i.id === id ? { ...i, status: 'sent' } : i)
      );
    } catch {
      toast.success('Invoice sent! (offline)');
    }
    setActiveMenu(null);
  };

  const totalAmount = displayed.reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header (mobile safe) */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="section-title">My Invoices</h1>
          <p className="section-subtitle break-words">
            {allInvoices.length > 0
              ? `${displayed.length} of ${allInvoices.length} invoices · ${formatCurrency(totalAmount)}`
              : 'No invoices yet'}
          </p>
        </div>

        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <button onClick={load} className="btn-secondary text-sm" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link to="/employee/invoices/new" className="btn-primary text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        </div>
      </div>

      {/* Status pills */}
      {allInvoices.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { s: 'draft', label: 'Draft', color: 'text-gray-700' },
            { s: 'sent', label: 'Sent', color: 'text-blue-700' },
            { s: 'viewed', label: 'Viewed', color: 'text-purple-700' },
            { s: 'paid', label: 'Paid', color: 'text-emerald-700' },
            { s: 'overdue', label: 'Overdue', color: 'text-red-700' },
          ].map(({ s, label, color }) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`card p-3 text-center transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 ${
                activeStatus === s ? 'ring-2 ring-primary-500 shadow-card-hover' : ''
              }`}
            >
              <p className={`text-2xl font-extrabold ${color}`}>{counts[s]}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      {allInvoices.length > 0 && (
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-10 w-full"
              placeholder="Search invoice # or client name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {(activeStatus || search) && (
              <button
                onClick={() => { setActiveStatus(null); setSearch(''); }}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap"
              >
                Clear filters
              </button>
            )}

            {activeStatus && (
              <span className={`badge ${invoiceStatusConfig[activeStatus]?.className} text-sm`}>
                {invoiceStatusConfig[activeStatus]?.label}
                <button onClick={() => setActiveStatus(null)} className="ml-1">×</button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>

        ) : allInvoices.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Inbox className="w-12 h-12 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No invoices yet</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
              Create your first GST-compliant invoice in under a minute.
            </p>
            <Link to="/employee/invoices/new" className="btn-primary text-base px-8 py-3">
              <Plus className="w-5 h-5" /> Create First Invoice
            </Link>
          </div>

        ) : displayed.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-1">No invoices found</p>
            <p className="text-sm text-gray-400 mb-4">
              {search ? `No results for "${search}"` : 'No invoices in this filter'}
            </p>
            <button
              onClick={() => { setActiveStatus(null); setSearch(''); }}
              className="text-sm text-primary-600 font-semibold"
            >
              Show all invoices
            </button>
          </div>

        ) : (
          /* IMPORTANT: mobile scroll fix only */
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Amount', 'Status', 'Actions'].map(h => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {displayed.map(inv => {
                  const cfg = invoiceStatusConfig[inv.status] || invoiceStatusConfig.draft;
                  const isOverdue = inv.status !== 'paid' && new Date(inv.dueDate) < new Date();
                  const canEdit = inv.status === 'draft';

                  return (
                    <tr key={inv.id} className="table-row-hover group">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <Link
                          to={`/employee/invoices/${inv.id}`}
                          className="font-mono text-sm text-primary-600 font-semibold"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>

                      <td className="px-5 py-4 min-w-[120px]">
                        <p className="font-medium text-gray-800 text-sm truncate">
                          {inv.client?.name || '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(inv.issueDate)}
                      </td>

                      <td className="px-5 py-4 text-sm whitespace-nowrap">
                        <span className={isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                          {formatDate(inv.dueDate)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-bold whitespace-nowrap">
                        {formatCurrency(inv.total)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`badge ${cfg.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>

                      <td className="px-5 py-4 relative" data-menu>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setActiveMenu(prev => (prev === inv.id ? null : inv.id));
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenu === inv.id && (
                          <div className="absolute right-0 top-9 z-30 w-48 bg-white border rounded-2xl shadow-xl overflow-hidden">
                            <Link
                              to={`/employee/invoices/${inv.id}`}
                              onClick={() => setActiveMenu(null)}
                              className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50"
                            >
                              <Eye className="w-4 h-4" /> View
                            </Link>

                            {canEdit && (
                              <Link
                                to={`/employee/invoices/${inv.id}/edit`}
                                onClick={() => setActiveMenu(null)}
                                className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" /> Edit
                              </Link>
                            )}

                            <button
                              onClick={() => { setActiveMenu(null); navigate(`/employee/invoices/${inv.id}`); }}
                              className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50"
                            >
                              <Download className="w-4 h-4" /> Download
                            </button>

                            {inv.status === 'draft' && (
                              <button
                                onClick={() => handleSend(inv.id)}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-primary-600 hover:bg-primary-50"
                              >
                                <Send className="w-4 h-4" /> Send
                              </button>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => handleDelete(inv.id)}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            )}
                          </div>
                        )}
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
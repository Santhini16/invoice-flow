import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  TrendingUp, DollarSign, Plus, FileText, Users,
  Clock, ArrowUpRight, ArrowRight, CheckCircle,
  AlertCircle, RefreshCw, Inbox
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { dashboardAPI } from '../../../services/api';
import { formatCurrency, formatDate, invoiceStatusConfig } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';

const STATUS_COLORS = {
  paid:    '#10b981',
  sent:    '#3b82f6',
  draft:   '#94a3b8',
  overdue: '#ef4444',
  viewed:  '#8b5cf6',
};

export default function AdminDashboard() {
  const { user }     = useAuth();
  const [data,       setData]    = useState(null);
  const [loading,    setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await dashboardAPI.adminStats();
      setData(res.data);
    } catch {
      // On error: show empty state, not fake data
      setData({
        totalRevenue: 0, totalOutstanding: 0, totalInvoices: 0,
        totalClients: 0, paidInvoices: 0, overdueInvoices: 0,
        recentInvoices: [], statusBreakdown: [], monthlyRevenue: [], topClients: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-28" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card h-72 lg:col-span-2" />
        <div className="card h-72" />
      </div>
    </div>
  );

  const stats = [
    { label: 'Total Revenue',  value: formatCurrency(data?.totalRevenue ?? 0),     sub: `${data?.paidInvoices ?? 0} paid invoices`,      icon: DollarSign, bg: 'bg-blue-50',   ic: 'text-blue-600'   },
    { label: 'Outstanding',    value: formatCurrency(data?.totalOutstanding ?? 0),  sub: `${data?.overdueInvoices ?? 0} overdue`,          icon: Clock,      bg: 'bg-amber-50',  ic: 'text-amber-600'  },
    { label: 'Total Invoices', value: data?.totalInvoices ?? 0,                    sub: 'All time',                                        icon: FileText,   bg: 'bg-purple-50', ic: 'text-purple-600' },
    { label: 'Active Clients', value: data?.totalClients ?? 0,                     sub: 'Total clients',                                   icon: Users,      bg: 'bg-emerald-50',ic: 'text-emerald-600'},
  ];

  const statusData = (data?.statusBreakdown ?? []).map(s => ({
    ...s,
    color: STATUS_COLORS[s.name?.toLowerCase()] || '#94a3b8',
  }));

  const hasRecentInvoices  = (data?.recentInvoices ?? []).length > 0;
  const hasMonthlyRevenue  = (data?.monthlyRevenue ?? []).length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Good day, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here's what's happening across your business.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => load(true)} disabled={refreshing}
            className="btn-secondary text-sm">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/admin/invoices" className="btn-primary text-sm">
            View Invoices <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, bg, ic }) => (
          <div key={label} className="card p-5 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${ic}`} />
            </div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Revenue Overview</h3>
              <p className="text-xs text-gray-400 mt-0.5">Invoiced vs collected — your actual data</p>
            </div>
          </div>
          {hasMonthlyRevenue ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.monthlyRevenue} margin={{ left: -20, right: 0, top: 4 }}>
                  <defs>
                    <linearGradient id="invG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue"   stroke="#2563eb" strokeWidth={2.5} fill="url(#invG)" name="Invoiced" />
                  <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2.5} fill="url(#colG)" name="Collected" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-3">
                {[['#2563eb','Invoiced'],['#10b981','Collected']].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-3 h-3 rounded-full" style={{ background: c }} />{l}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-blue-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No revenue data yet</p>
              <p className="text-xs text-gray-400 mt-1">Revenue chart will appear once invoices are created</p>
              <Link to="/admin/invoices" className="btn-primary text-sm mt-4">
                <Plus className="w-4 h-4" /> Create First Invoice
              </Link>
            </div>
          )}
        </div>

        {/* Status Donut */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-1">Invoice Status</h3>
          <p className="text-xs text-gray-400 mb-4">Current breakdown</p>
          {statusData.length > 0 ? (
            <>
              <div className="flex justify-center">
                <PieChart width={160} height={160}>
                  <Pie data={statusData} cx={75} cy={75} innerRadius={45} outerRadius={72}
                    paddingAngle={3} dataKey="value">
                    {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={v => [v, 'invoices']} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </div>
              <div className="space-y-2 mt-2">
                {statusData.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-xs text-gray-600 capitalize">{name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <FileText className="w-7 h-7 text-gray-200" />
              </div>
              <p className="text-xs text-gray-400">Status chart will appear once invoices exist</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent Invoices — real data from API */}
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900">Recent Invoices</h3>
            <Link to="/admin/invoices"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {hasRecentInvoices ? (
            <div className="divide-y divide-gray-50">
              {data.recentInvoices.map(inv => {
                const cfg = invoiceStatusConfig[inv.status] || invoiceStatusConfig.draft;
                return (
                  <Link key={inv.id} to={`/admin/invoices/${inv.id}`}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{inv.client?.name || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs font-mono text-gray-400">{inv.invoiceNumber}</p>
                        {inv.createdBy?.name && (
                          <span className="text-xs text-gray-300">· by {inv.createdBy.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                      <p className="text-xs text-gray-400">{formatDate(inv.issueDate)}</p>
                    </div>
                    <span className={`badge ${cfg.className} ml-2 flex-shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-7 h-7 text-gray-200" />
              </div>
              <p className="text-sm font-medium text-gray-500">No invoices yet</p>
              <p className="text-xs text-gray-400 mt-1">Invoices created by your team will appear here</p>
            </div>
          )}
        </div>

        {/* Sidebar: Quick Actions + Alerts */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'View All Invoices', to: '/admin/invoices',  primary: true },
                { label: 'Add Client',        to: '/admin/clients',   primary: false },
                { label: 'Reports',           to: '/admin/reports',   primary: false },
                { label: 'Add Employee',      to: '/admin/employees', primary: false },
              ].map(({ label, to, primary }) => (
                <Link key={label} to={to}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    primary
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'
                  }`}>
                  {label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3">Alerts</h3>
            <div className="space-y-2.5">
              {(data?.overdueInvoices ?? 0) > 0 ? (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-700">{data.overdueInvoices} Overdue Invoice{data.overdueInvoices !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-red-500 mt-0.5">{formatCurrency(data.totalOutstanding)} pending collection</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-700">No overdue invoices!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">All invoices are on track.</p>
                  </div>
                </div>
              )}
              {(data?.paidInvoices ?? 0) > 0 && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-blue-700">{data.paidInvoices} invoice{data.paidInvoices !== 1 ? 's' : ''} paid</p>
                    <p className="text-xs text-blue-500 mt-0.5">{formatCurrency(data.totalRevenue)} collected total</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Inbox
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { dashboardAPI } from '../../../services/api';
import { formatCurrency, formatDate, invoiceStatusConfig } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.employeeStats()
      .then(r => setData(r.data))
      .catch(() =>
        setData({
          totalInvoices: 0,
          totalBilled: 0,
          collected: 0,
          outstanding: 0,
          recentInvoices: [],
          monthly: [],
        })
      )
      .finally(() => setLoading(false));
  }, []);

  const hasInvoices = data?.totalInvoices > 0;

  const stats = [
    { label: 'My Invoices', value: data?.totalInvoices ?? 0, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Billed', value: formatCurrency(data?.totalBilled ?? 0), icon: DollarSign, color: 'bg-purple-50 text-purple-600' },
    { label: 'Collected', value: formatCurrency(data?.collected ?? 0), icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Outstanding', value: formatCurrency(data?.outstanding ?? 0), icon: Clock, color: 'bg-amber-50 text-amber-600' },
  ];

  if (loading)
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header (mobile responsive only) */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="section-title">
            Good day, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="section-subtitle">
            {hasInvoices
              ? "Here's your invoice activity summary."
              : "Welcome to InvoiceFlow! Create your first invoice to get started."
            }
          </p>
        </div>

        <Link to="/employee/invoices/new" className="btn-primary w-fit sm:w-auto">
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="stat-card hover:shadow-card-hover transition-all duration-300"
          >
            <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
              <p className="text-xl font-extrabold text-gray-900 break-words">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!hasInvoices ? (
        <div className="grid lg:grid-cols-2 gap-5">

          {/* Empty invoices */}
          <div className="card p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">No invoices yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              You haven't created any invoices yet. Create your first one to start tracking your billing.
            </p>
            <Link to="/employee/invoices/new" className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Create First Invoice
            </Link>
          </div>

          {/* Getting started */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Getting Started</h3>

            {[
              { step: '1', title: 'Add a Client', desc: 'Add your client details to start creating invoices for them.', link: '/employee/clients', label: 'Add Client' },
              { step: '2', title: 'Create an Invoice', desc: 'Create a GST-compliant invoice with auto-calculations.', link: '/employee/invoices/new', label: 'New Invoice' },
              { step: '3', title: 'Send & Get Paid', desc: 'Send via email or WhatsApp. Clients pay online via Razorpay.', link: '/employee/invoices/new', label: 'Learn More' },
            ].map(({ step, title, desc, link, label }) => (
              <div key={step} className="card p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {step}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>

                <Link
                  to={link}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 flex-shrink-0"
                >
                  {label} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>

      ) : (
        /* With invoices */
        <div className="grid lg:grid-cols-5 gap-5">

          {/* Chart */}
          <div className="card p-6 lg:col-span-3 overflow-x-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-900">Monthly Billing</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
              </div>
            </div>

            {data?.monthly?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.monthly} margin={{ left: -20, right: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
                No billing data yet
              </div>
            )}
          </div>

          {/* Recent invoices */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h3 className="font-bold text-gray-900">Recent Invoices</h3>
              <Link to="/employee/invoices" className="text-xs text-primary-600 font-semibold flex items-center gap-1 hover:text-primary-700">
                All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-gray-50">
              {(data?.recentInvoices || []).length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No invoices yet
                </div>
              ) : (
                (data?.recentInvoices || []).map(inv => {
                  const cfg = invoiceStatusConfig[inv.status] || invoiceStatusConfig.draft;

                  return (
                    <Link
                      key={inv.id}
                      to={`/employee/invoices/${inv.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {inv.client?.name}
                        </p>
                        <p className="text-xs font-mono text-gray-400">
                          {inv.invoiceNumber}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(inv.total)}
                        </p>
                        <span className={`badge ${cfg.className} mt-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: '⚡', title: 'AI Suggestions', desc: 'When creating an invoice, click "AI Suggestions" to auto-fill items based on your history.' },
          { icon: '📱', title: 'Send via WhatsApp', desc: 'Open any invoice and tap Send → WhatsApp to share the payment link instantly.' },
          { icon: '🔔', title: 'Track Payments', desc: "You'll be notified when a client views or pays your invoice in real-time." },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="card p-5">
            <div className="text-3xl mb-3">{icon}</div>
            <p className="font-bold text-sm text-gray-900 mb-1">{title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
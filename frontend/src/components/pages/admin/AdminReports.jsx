import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign, FileText, RefreshCw, Inbox } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { formatCurrency } from '../../../utils/helpers';
import { reportAPI } from '../../../services/api';

const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];
const GST_PIE_COLORS = ['#2563eb', '#7c3aed', '#06b6d4'];

function EmptyChart({ message = 'No data yet for this period' }) {
  return (
    <div className="h-52 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
        <Inbox className="w-7 h-7 text-gray-200" />
      </div>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [loading,   setLoading]   = useState(false);
  const [revData,   setRevData]   = useState(null);
  const [gstData,   setGstData]   = useState(null);
  const [plData,    setPlData]    = useState(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'revenue') {
        const r = await reportAPI.revenue({ year });
        setRevData(r.data);
      } else if (activeTab === 'gst') {
        const r = await reportAPI.gst({ year });
        setGstData(r.data);
      } else {
        const r = await reportAPI.profitLoss({ year });
        setPlData(r.data);
      }
    } catch {
      if (activeTab === 'revenue') setRevData({ monthly: [], topClients: [], summary: null, byEmployee: [] });
      if (activeTab === 'gst')     setGstData({ monthly: [], summary: null, bySlabs: [] });
      if (activeTab === 'profitloss') setPlData({ monthly: [], totals: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, [activeTab, year]);

  const Loader = () => (
    <div className="card p-12 text-center">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Your actual financial data — no placeholders</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="input-field w-auto text-sm"
          >
            {YEARS.map(y => <option key={y} value={y}>FY {y}</option>)}
          </select>
          <button onClick={loadReport} disabled={loading} className="btn-secondary text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-secondary text-sm"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
        {[['revenue','Revenue'],['gst','GST Report'],['profitloss','Profit & Loss']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : (
        <>
          {/* ── Revenue Tab ─────────────────────────────────────────────────────── */}
          {activeTab === 'revenue' && revData && (
            <div className="space-y-5">
              {/* Summary KPIs */}
              {revData.summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Invoiced',  value: formatCurrency(revData.summary.totalInvoiced),  color: 'text-blue-600',   bg: 'bg-blue-50'   },
                    { label: 'Total Collected', value: formatCurrency(revData.summary.totalCollected), color: 'text-emerald-600',bg: 'bg-emerald-50' },
                    { label: 'GST Collected',   value: formatCurrency(revData.summary.totalGST),       color: 'text-purple-600', bg: 'bg-purple-50'  },
                    { label: 'Collection Rate', value: `${revData.summary.collectionRate}%`,           color: 'text-amber-600',  bg: 'bg-amber-50'   },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className="card p-5">
                      <p className="text-xs text-gray-500 font-medium">{label}</p>
                      <p className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Monthly area chart */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900">Monthly Revenue — {year}</h3>
                  <p className="text-xs text-gray-400">Your actual invoiced vs collected</p>
                </div>
                {revData.monthly?.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={revData.monthly} margin={{ left: -10, right: 0, top: 4 }}>
                        <defs>
                          <linearGradient id="rG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="cG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                          tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                        <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        <Area type="monotone" dataKey="invoiced"   stroke="#2563eb" strokeWidth={2.5} fill="url(#rG)" name="Invoiced" />
                        <Area type="monotone" dataKey="collected"  stroke="#10b981" strokeWidth={2.5} fill="url(#cG)" name="Collected" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-5 mt-3">
                      {[['#2563eb','Invoiced'],['#10b981','Collected']].map(([c,l]) => (
                        <div key={l} className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="w-3 h-3 rounded-full" style={{ background: c }} />{l}
                        </div>
                      ))}
                    </div>
                  </>
                ) : <EmptyChart message={`No invoice data for ${year}. Create invoices to see your revenue chart.`} />}
              </div>

              {/* Top Clients + By Employee */}
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="card p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Top Clients by Revenue</h3>
                  {revData.topClients?.filter(c => c.totalBilled > 0).length > 0 ? (
                    <div className="space-y-3">
                      {revData.topClients.filter(c => c.totalBilled > 0).slice(0, 5).map((c, i) => (
                        <div key={c.name} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 w-5">{i+1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-800 truncate">{c.name}</span>
                              <span className="font-bold text-gray-900 ml-2">{formatCurrency(c.totalBilled)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full">
                              <div className="h-full bg-primary-500 rounded-full"
                                style={{ width: `${Math.round((c.totalBilled / revData.topClients[0].totalBilled)*100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyChart message="No client billing data yet" />}
                </div>

                <div className="card p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Revenue by Employee</h3>
                  {revData.byEmployee?.filter(e => e.totalBilled > 0).length > 0 ? (
                    <div className="space-y-3">
                      {revData.byEmployee.filter(e => e.totalBilled > 0).map(e => (
                        <div key={e.employee} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                            {e.employee?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{e.employee}</p>
                            <p className="text-xs text-gray-400">{e.invoiceCount} invoices</p>
                          </div>
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(e.totalBilled)}</p>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyChart message="Employees haven't created invoices yet" />}
                </div>
              </div>
            </div>
          )}

          {/* ── GST Tab ──────────────────────────────────────────────────────────── */}
          {activeTab === 'gst' && gstData && (
            <div className="space-y-5">
              {gstData.summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Taxable', value: formatCurrency(gstData.summary.totalTaxable), color: 'text-blue-600'   },
                    { label: 'IGST',          value: formatCurrency(gstData.summary.totalIGST),    color: 'text-primary-600'},
                    { label: 'CGST',          value: formatCurrency(gstData.summary.totalCGST),    color: 'text-purple-600' },
                    { label: 'SGST',          value: formatCurrency(gstData.summary.totalSGST),    color: 'text-cyan-600'   },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="card p-5">
                      <p className="text-xs text-gray-500 font-medium">{label}</p>
                      <p className={`text-xl font-extrabold mt-1 ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-5">
                <div className="card p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Monthly GST</h3>
                  {gstData.monthly?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={gstData.monthly} margin={{ left: -20, right: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                          tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                        <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="igst" fill="#2563eb" radius={[4,4,0,0]} name="IGST" stackId="a" />
                        <Bar dataKey="cgst" fill="#7c3aed" radius={[0,0,0,0]} name="CGST" stackId="a" />
                        <Bar dataKey="sgst" fill="#06b6d4" radius={[4,4,0,0]} name="SGST" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </div>

                <div className="card p-6">
                  <h3 className="font-bold text-gray-900 mb-4">GST by Type</h3>
                  {gstData.summary && (gstData.summary.totalIGST + gstData.summary.totalCGST + gstData.summary.totalSGST) > 0 ? (
                    <>
                      <div className="flex justify-center">
                        <PieChart width={180} height={180}>
                          <Pie
                            data={[
                              { name: 'IGST', value: gstData.summary.totalIGST },
                              { name: 'CGST', value: gstData.summary.totalCGST },
                              { name: 'SGST', value: gstData.summary.totalSGST },
                            ]}
                            cx={85} cy={85} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                          >
                            {GST_PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                          </Pie>
                          <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                        </PieChart>
                      </div>
                      <div className="flex justify-center gap-4 mt-2">
                        {[['IGST','#2563eb'],['CGST','#7c3aed'],['SGST','#06b6d4']].map(([l,c]) => (
                          <div key={l} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <EmptyChart />}
                </div>
              </div>

              {/* GST Table */}
              {gstData.monthly?.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h3 className="font-bold text-gray-900">GST Summary — {year}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Month','Taxable Amount','IGST','CGST','SGST','Total GST','Invoices'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {gstData.monthly.map(m => (
                          <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-sm text-gray-800">{m.month}</td>
                            <td className="px-5 py-3.5 text-sm text-gray-600">{formatCurrency(m.taxable)}</td>
                            <td className="px-5 py-3.5 text-sm text-primary-600 font-medium">{formatCurrency(m.igst)}</td>
                            <td className="px-5 py-3.5 text-sm text-purple-600 font-medium">{formatCurrency(m.cgst)}</td>
                            <td className="px-5 py-3.5 text-sm text-cyan-600 font-medium">{formatCurrency(m.sgst)}</td>
                            <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{formatCurrency(m.totalGST)}</td>
                            <td className="px-5 py-3.5 text-sm text-gray-500">{m.invoiceCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── P&L Tab ──────────────────────────────────────────────────────────── */}
          {activeTab === 'profitloss' && plData && (
            <div className="space-y-5">
              {plData.totals && plData.totals.revenue > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Revenue',  value: formatCurrency(plData.totals.revenue),     color: 'text-blue-600'   },
                    { label: 'Est. Expenses',  value: formatCurrency(plData.totals.expenses),    color: 'text-amber-600'  },
                    { label: 'Gross Profit',   value: formatCurrency(plData.totals.grossProfit), color: 'text-emerald-600'},
                  ].map(({ label, value, color }) => (
                    <div key={label} className="card p-5">
                      <p className="text-xs text-gray-500 font-medium">{label}</p>
                      <p className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="card p-6">
                <h3 className="font-bold text-gray-900 mb-5">Profit & Loss — {year}</h3>
                {plData.monthly?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={plData.monthly} margin={{ left: -10, right: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                        tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                      <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="revenue"     fill="#2563eb" radius={[4,4,0,0]} name="Revenue" />
                      <Bar dataKey="expenses"    fill="#f59e0b" radius={[4,4,0,0]} name="Expenses (est.)" />
                      <Bar dataKey="grossProfit" fill="#10b981" radius={[4,4,0,0]} name="Gross Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart message={`No P&L data for ${year}. Mark invoices as paid to see profit data.`} />}
              </div>

              {plData.monthly?.filter(m => m.revenue > 0).length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h3 className="font-bold text-gray-900">Monthly P&L Statement — {year}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Expenses estimated at 22% of revenue</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Month','Revenue','Est. Expenses','Gross Profit','Margin'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {plData.monthly.filter(m => m.revenue > 0).map(m => (
                          <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-sm text-gray-800">{m.month}</td>
                            <td className="px-5 py-3.5 text-sm text-blue-700 font-medium">{formatCurrency(m.revenue)}</td>
                            <td className="px-5 py-3.5 text-sm text-amber-600">{formatCurrency(m.expenses)}</td>
                            <td className="px-5 py-3.5 text-sm font-bold text-emerald-600">{formatCurrency(m.grossProfit)}</td>
                            <td className="px-5 py-3.5">
                              <span className={`badge ${m.margin >= 60 ? 'badge-green' : m.margin >= 40 ? 'badge-blue' : 'badge-yellow'}`}>
                                {m.margin}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
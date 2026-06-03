import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Download, Send, Edit, ArrowLeft, Mail, MessageCircle, Copy, CheckCircle, Clock, Eye, FileText, Calendar, Hash, Printer } from 'lucide-react';
import { invoiceAPI } from '../../../services/api';
import { formatCurrency, formatDate, invoiceStatusConfig, timeAgo } from '../../../utils/helpers';
import toast from 'react-hot-toast';
const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSendMenu, setShowSendMenu] = useState(false);

  useEffect(() => {
    invoiceAPI.get(id).then(r => setInvoice(r.data)).catch(() => setInvoice(DEMO_INVOICE)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!invoice) return <div className="text-center py-24 text-gray-400">Invoice not found.</div>;

  const subtotal = invoice.items?.reduce((s, i) => s + (i.quantity * i.price), 0) || 0;
  const discountAmt = subtotal * ((invoice.discount || 0) / 100);
  const taxableAmt = subtotal - discountAmt;
  const gstAmt = taxableAmt * ((invoice.gstRate || 0) / 100);
  const total = taxableAmt + gstAmt;
  const cfg = invoiceStatusConfig[invoice.status] || invoiceStatusConfig.draft;
  const publicLink = `${window.location.origin}/invoice/${invoice.publicToken}`;

 const handleSend = async (method) => {
  try {
    if (method === "whatsapp") {
      let phone = invoice.client?.phone || "";
      phone = phone.replace(/\D/g, "");

      const message = `Hello ${invoice.client?.name},

Your Invoice ${invoice.invoiceNumber}
Amount: ${formatCurrency(total)}

Pay here: ${publicLink}`;

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      return;
    }

    // ✅ EMAIL API CALL 
    await invoiceAPI.send(id, method);

    toast.success(`Invoice sent via ${method}!`);

  } catch (err) {
    console.error(err);
    toast.error("Failed to send invoice");
  }
};
  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast.success('Client link copied!');
  };
const printInvoice = () => window.print();
const handleDownload = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/invoices/${id}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to download PDF");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);

    toast.success("PDF downloaded");
  } catch (err) {
    console.error(err);
    toast.error("PDF download failed");
  }
};
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-5 px-3 sm:px-4 md:px-0 animate-fade-in">
      {/* Top bar - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 font-mono break-all">{invoice.invoiceNumber}</h1>
              <span className={`badge ${cfg.className} flex-shrink-0`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5 truncate">{invoice.client?.name} • {formatDate(invoice.issueDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
          <button onClick={handleDownload} className="btn-secondary text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Download</span>
          </button>
          <button onClick={printInvoice} className="btn-secondary text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Print</span>
          </button>
          {invoice.status === 'draft' && (
            <Link to={`/employee/invoices/${id}/edit`} className="btn-secondary text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Edit</span>
            </Link>
          )}
          <div className="relative">
            <button onClick={() => setShowSendMenu(!showSendMenu)} disabled={sending} className="btn-primary text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              {sending ? <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Send</span></>}
            </button>
            {showSendMenu && (
              <div className="absolute right-0 top-12 z-20 w-48 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden animate-slide-up">
                <button onClick={() => handleSend('email')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                  <Mail className="w-4 h-4 text-blue-500" /> Send via Email
                </button>
                <button onClick={() => handleSend('whatsapp')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                  <MessageCircle className="w-4 h-4 text-emerald-500" /> Send via WhatsApp
                </button>
                <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                  <Copy className="w-4 h-4 text-purple-500" /> Copy Link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-5">
        {/* Invoice Preview - Responsive */}
        <div className="lg:col-span-2 w-full card p-4 sm:p-6 md:p-8 print:shadow-none overflow-x-auto" id="invoice-print">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-6 sm:mb-8 md:mb-10">
            <div className="w-full sm:w-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-600 rounded-xl flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 break-words">{invoice.company?.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{invoice.company?.address}</p>
              {invoice.company?.gstin && <p className="text-xs text-gray-400 font-mono mt-1 break-all">GSTIN: {invoice.company.gstin}</p>}
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="text-2xl sm:text-3xl font-black text-primary-600 mb-2">INVOICE</div>
              <div className="space-y-1 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center gap-2 sm:justify-end"><Hash className="w-3.5 h-3.5 flex-shrink-0" /><span className="font-mono font-semibold break-all">{invoice.invoiceNumber}</span></div>
                <div className="flex items-center gap-2 sm:justify-end"><Calendar className="w-3.5 h-3.5 flex-shrink-0" /><span>Date: {formatDate(invoice.issueDate)}</span></div>
                <div className="flex items-center gap-2 sm:justify-end"><Calendar className="w-3.5 h-3.5 flex-shrink-0" /><span>Due: {formatDate(invoice.dueDate)}</span></div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="p-4 sm:p-5 bg-gray-50 rounded-xl mb-6 sm:mb-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bill To</p>
            <p className="font-bold text-gray-900 break-words">{invoice.client?.name}</p>
            <p className="text-sm text-gray-500 mt-1 break-words">{invoice.client?.address}</p>
            {invoice.client?.gstin && <p className="text-xs font-mono text-gray-400 mt-1 break-all">GSTIN: {invoice.client.gstin}</p>}
            <div className="mt-2 space-y-1">
              {invoice.client?.email && <p className="text-xs text-gray-500 flex items-center gap-1.5 break-all"><Mail className="w-3.5 h-3.5 flex-shrink-0" />{invoice.client.email}</p>}
            </div>
          </div>

          {/* Items - Responsive Table */}
          <div className="overflow-x-auto -mx-4 sm:mx-0 mb-6 sm:mb-8">
            <table className="w-full min-w-[500px] sm:min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-0 text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-0 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-right py-2 sm:py-3 px-3 sm:px-0 text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="text-right py-2 sm:py-3 px-3 sm:px-0 text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="text-right py-2 sm:py-3 px-3 sm:px-0 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3 sm:py-4 px-3 sm:px-0 text-xs sm:text-sm text-gray-400">{i + 1}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-0">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 break-words">{item.description}</p>
                      {item.hsn && <p className="text-xs text-gray-400 mt-0.5">HSN: {item.hsn}</p>}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-0 text-xs sm:text-sm text-right text-gray-600">{item.quantity}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-0 text-xs sm:text-sm text-right text-gray-600">{formatCurrency(item.price)}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-0 text-xs sm:text-sm text-right font-bold text-gray-900">{formatCurrency(item.quantity * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals - Responsive */}
          <div className="flex justify-end mb-6 sm:mb-8">
            <div className="w-full sm:w-64 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-500">Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
              {invoice.discount > 0 && <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-500">Discount ({invoice.discount}%)</span><span className="font-semibold text-emerald-600">−{formatCurrency(discountAmt)}</span></div>}
              {invoice.gstRate > 0 && (
                invoice.gstType === 'IGST'
                  ? <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-500">IGST ({invoice.gstRate}%)</span><span className="font-semibold">{formatCurrency(gstAmt)}</span></div>
                  : <>
                      <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-500">CGST ({invoice.gstRate / 2}%)</span><span className="font-semibold">{formatCurrency(gstAmt / 2)}</span></div>
                      <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-500">SGST ({invoice.gstRate / 2}%)</span><span className="font-semibold">{formatCurrency(gstAmt / 2)}</span></div>
                    </>
              )}
              <div className="border-t-2 border-gray-200 pt-2 flex justify-between">
                <span className="font-bold text-gray-900 text-sm sm:text-base">Total</span>
                <span className="text-lg sm:text-xl font-extrabold text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="p-3 sm:p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-xs font-bold text-amber-700 mb-1">Notes</p>
              <p className="text-xs sm:text-sm text-amber-800 break-words">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar: Actions + Timeline - Responsive */}
        <div className="w-full lg:w-80 xl:w-96 space-y-4">
          {/* Client link */}
          <div className="card p-4 sm:p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Client Payment Link</p>
            <div className="flex items-center gap-2 p-2 sm:p-3 bg-gray-50 rounded-xl border border-gray-100 mb-3">
              <p className="text-xs text-gray-500 font-mono truncate flex-1 break-all">{publicLink}</p>
              <button onClick={copyLink} className="flex-shrink-0 p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                <Copy className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-400">Clients can view and pay using this link — no login needed.</p>
          </div>

          {/* Status */}
          <div className="card p-4 sm:p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Status</p>
            <div className="space-y-2 sm:space-y-3">
              {[
                { s: 'draft', label: 'Draft', icon: FileText },
                { s: 'sent', label: 'Sent', icon: Send },
                { s: 'viewed', label: 'Viewed by client', icon: Eye },
                { s: 'paid', label: 'Payment received', icon: CheckCircle },
              ].map(({ s, label, icon: Icon }) => {
                const statuses = ['draft', 'sent', 'viewed', 'paid'];
                const currentIdx = statuses.indexOf(invoice.status);
                const thisIdx = statuses.indexOf(s);
                const done = thisIdx <= currentIdx;
                return (
                  <div key={s} className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${done ? 'text-primary-600' : 'text-gray-300'}`} />
                    </div>
                    <span className={`text-xs sm:text-sm font-medium ${done ? 'text-gray-800' : 'text-gray-300'}`}>{label}</span>
                    {invoice.status === s && <span className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-500 animate-pulse" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity */}
          <div className="card p-4 sm:p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Activity</p>
            <div className="space-y-3">
              {invoice.activities?.map((act, i) => (
                <div key={i} className="flex items-start gap-2 sm:gap-2.5">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-700 break-words">{act.action}</p>
                    <p className="text-xs text-gray-400 break-words">{act.user} • {timeAgo(act.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Download, CreditCard, CheckCircle, AlertCircle, Building, Phone, Mail, Calendar, Hash } from 'lucide-react';
import { invoiceAPI, paymentAPI } from '../../../services/api';
import { formatCurrency, formatDate, invoiceStatusConfig } from '../../../utils/helpers';
import toast from 'react-hot-toast';

export default function PublicInvoicePage() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    invoiceAPI.getPublic(token)
      .then(r => setInvoice(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handlePay = async () => {
    if (!window.Razorpay) {
      toast.error('Payment gateway unavailable');
      return;
    }
    setPaying(true);
    try {
      const { data } = await paymentAPI.createOrder(invoice.id);
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY,
        amount: data.amount,
        currency: data.currency,
        name: invoice.company?.name || 'InvoiceFlow',
        description: `Invoice ${invoice.invoiceNumber}`,
        order_id: data.orderId,
        handler: async (response) => {
          await paymentAPI.verify({ ...response, invoiceId: invoice.id });
          toast.success('Payment successful! Receipt sent to your email.');
          setInvoice(prev => ({ ...prev, status: 'paid' }));
        },
        prefill: { name: invoice.client?.name, email: invoice.client?.email, contact: invoice.client?.phone },
        theme: { color: '#2563eb' },
      };
      new window.Razorpay(options).open();
    } catch (e) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!invoice) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
        <p className="text-gray-500">This invoice link may be expired or invalid.</p>
      </div>
    </div>
  );

  const statusCfg = invoiceStatusConfig[invoice.status] || invoiceStatusConfig.draft;
  const subtotal = invoice.items?.reduce((s, i) => s + (i.quantity * i.price), 0) || 0;
  const discountAmt = subtotal * ((invoice.discount || 0) / 100);
  const taxableAmt = subtotal - discountAmt;
  const gstAmt = taxableAmt * ((invoice.gstRate || 0) / 100);
  const total = taxableAmt + gstAmt;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">InvoiceFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${statusCfg.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            <button onClick={() => window.print()} className="btn-secondary text-sm">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="card p-8 animate-slide-up">
          {/* Company + Invoice Info */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{invoice.company?.name || 'Company'}</h1>
              <p className="text-sm text-gray-500">{invoice.company?.address}</p>
              {invoice.company?.gstin && <p className="text-sm text-gray-500 font-mono mt-1">GSTIN: {invoice.company.gstin}</p>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-primary-600 mb-1">INVOICE</div>
              <div className="flex items-center gap-2 text-sm text-gray-500 justify-end">
                <Hash className="w-4 h-4" />{invoice.invoiceNumber}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 justify-end mt-1">
                <Calendar className="w-4 h-4" />Date: {formatDate(invoice.issueDate)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 justify-end mt-1">
                <Calendar className="w-4 h-4" />Due: {formatDate(invoice.dueDate)}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="p-5 bg-gray-50 rounded-xl">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bill To</p>
              <p className="font-bold text-gray-900">{invoice.client?.name}</p>
              <p className="text-sm text-gray-500 mt-1">{invoice.client?.address}</p>
              {invoice.client?.gstin && <p className="text-sm text-gray-500 font-mono mt-1">GSTIN: {invoice.client.gstin}</p>}
              <div className="mt-3 space-y-1">
                {invoice.client?.email && <div className="flex items-center gap-1.5 text-sm text-gray-500"><Mail className="w-3.5 h-3.5" />{invoice.client.email}</div>}
                {invoice.client?.phone && <div className="flex items-center gap-1.5 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" />{invoice.client.phone}</div>}
              </div>
            </div>
            {invoice.bankDetails && (
              <div className="p-5 bg-primary-50 rounded-xl">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payment Details</p>
                <div className="space-y-1.5 text-sm">
                  <div><span className="text-gray-500">Bank: </span><span className="font-semibold text-gray-800">{invoice.bankDetails.bankName}</span></div>
                  <div><span className="text-gray-500">A/C No: </span><span className="font-mono font-semibold text-gray-800">{invoice.bankDetails.accountNumber}</span></div>
                  <div><span className="text-gray-500">IFSC: </span><span className="font-mono font-semibold text-gray-800">{invoice.bankDetails.ifsc}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Item / Description</th>
                  <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-4 text-sm text-gray-400">{i + 1}</td>
                    <td className="py-4">
                      <p className="font-semibold text-gray-900 text-sm">{item.description}</p>
                      {item.hsn && <p className="text-xs text-gray-400 mt-0.5">HSN: {item.hsn}</p>}
                    </td>
                    <td className="py-4 text-sm text-right text-gray-600">{item.quantity}</td>
                    <td className="py-4 text-sm text-right text-gray-600">{formatCurrency(item.price)}</td>
                    <td className="py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(item.quantity * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span className="font-semibold text-gray-800">{formatCurrency(subtotal)}</span></div>
              {invoice.discount > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Discount ({invoice.discount}%)</span><span className="font-semibold text-emerald-600">-{formatCurrency(discountAmt)}</span></div>}
              {invoice.gstRate > 0 && (
                <>
                  {invoice.gstType === 'IGST' ? (
                    <div className="flex justify-between text-sm text-gray-500"><span>IGST ({invoice.gstRate}%)</span><span className="font-semibold text-gray-800">{formatCurrency(gstAmt)}</span></div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm text-gray-500"><span>CGST ({invoice.gstRate / 2}%)</span><span className="font-semibold text-gray-800">{formatCurrency(gstAmt / 2)}</span></div>
                      <div className="flex justify-between text-sm text-gray-500"><span>SGST ({invoice.gstRate / 2}%)</span><span className="font-semibold text-gray-800">{formatCurrency(gstAmt / 2)}</span></div>
                    </>
                  )}
                </>
              )}
              <div className="border-t-2 border-gray-200 pt-3 flex justify-between">
                <span className="text-base font-bold text-gray-900">Total Amount</span>
                <span className="text-xl font-extrabold text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl mb-8">
              <p className="text-xs font-bold text-amber-700 mb-1">Notes</p>
              <p className="text-sm text-amber-800">{invoice.notes}</p>
            </div>
          )}

          {/* Pay Button */}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-4">Pay securely online using UPI, Card, or Net Banking</p>
              <button onClick={handlePay} disabled={paying} className="btn-primary text-base px-10 py-4 justify-center">
                {paying ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CreditCard className="w-5 h-5" /> Pay {formatCurrency(total)}</>}
              </button>
              <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Secured by Razorpay
              </p>
            </div>
          )}

          {invoice.status === 'paid' && (
            <div className="text-center pt-4 border-t border-gray-100">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-xl font-bold text-lg">
                <CheckCircle className="w-6 h-6" /> Payment Received — Thank You!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
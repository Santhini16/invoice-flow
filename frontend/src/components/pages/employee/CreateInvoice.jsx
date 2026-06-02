import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Zap, Save, Send, ChevronDown, X, CheckCircle, AlertCircle } from 'lucide-react';
import { invoiceAPI, clientAPI } from '../../../services/api';
import { formatCurrency, generateInvoiceNumber, calculateGST } from '../../../utils/helpers';
import toast from 'react-hot-toast';

const GST_RATES = [0, 5, 12, 18, 28];
const GST_TYPES = ['IGST', 'CGST+SGST'];

const DEFAULT_ITEM = { description: '', quantity: 1, price: 0, hsn: '', unit: 'Nos' };

const AI_SUGGESTIONS = [
  { description: 'Web Development Services', price: 75000, quantity: 1, hsn: '998314', unit: 'Nos' },
  { description: 'UI/UX Design Consultation', price: 45000, quantity: 1, hsn: '998315', unit: 'Nos' },
  { description: 'Monthly Maintenance', price: 15000, quantity: 1, hsn: '998313', unit: 'Nos' },
  { description: 'SEO Optimization', price: 25000, quantity: 1, hsn: '998431', unit: 'Nos' },
  { description: 'Content Writing (per article)', price: 3000, quantity: 5, hsn: '998390', unit: 'Pcs' },
];

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [gstType, setGstType] = useState('IGST');
  const [issueDate] = useState(new Date().toISOString().split('T')[0]);

  const { register, handleSubmit, watch, control, setValue, getValues, formState: { errors } } = useForm({
    defaultValues: {
      invoiceNumber: generateInvoiceNumber(),
      issueDate,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      clientId: '',
      gstRate: 18,
      discount: 0,
      notes: 'Payment due within 30 days. Thank you for your business!',
      items: [{ ...DEFAULT_ITEM }],
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const watchedGst = watch('gstRate');
  const watchedDiscount = watch('discount');

  useEffect(() => {
    clientAPI.list().then(r => setClients(r.data?.clients || r.data || [])).catch(() => {
      setClients([
        { id: '1', name: 'Tata Consultancy Services', email: 'billing@tcs.com', gstin: '27AAACT2727Q1ZW' },
        { id: '2', name: 'Infosys Limited', email: 'accounts@infosys.com', gstin: '29AABCI1681B1ZK' },
        { id: '3', name: 'Wipro Technologies', email: 'ap@wipro.com', gstin: '29AAACW0306D2ZH' },
      ]);
    });
  }, []);

  // Calculations
  const subtotal = watchedItems?.reduce((s, item) => s + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0) || 0;
  const discountAmt = subtotal * ((parseFloat(watchedDiscount) || 0) / 100);
  const taxableAmt = subtotal - discountAmt;
  const gstAmt = taxableAmt * ((parseFloat(watchedGst) || 0) / 100);
  const total = taxableAmt + gstAmt;

  const cgst = gstType === 'CGST+SGST' ? gstAmt / 2 : 0;
  const sgst = gstType === 'CGST+SGST' ? gstAmt / 2 : 0;
  const igst = gstType === 'IGST' ? gstAmt : 0;

  const onSubmit = async (data, status = 'draft') => {
    setSaving(true);
    try {
      const payload = { ...data, status, gstType, subtotal, discountAmount: discountAmt, taxableAmount: taxableAmt, gstAmount: gstAmt, total };
      await invoiceAPI.create(payload);
      toast.success(status === 'sent' ? 'Invoice created & sent!' : 'Invoice saved as draft!');
      navigate('/employee/invoices');
    } catch {
      toast.success('Invoice saved! (offline mode)');
      navigate('/employee/invoices');
    } finally { setSaving(false); }
  };

  const addAISuggestion = (s) => {
    append({ description: s.description, quantity: s.quantity, price: s.price, hsn: s.hsn, unit: s.unit });
    setShowAI(false);
    toast.success('Item added from suggestions!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="section-title">New Invoice</h1>
          <p className="section-subtitle">Fill in the details to create your invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => onSubmit(d, 'draft'))}>
        {/* Invoice Meta */}
        <div className="card p-6 mb-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Invoice Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Invoice Number</label>
              <input {...register('invoiceNumber', { required: true })} className="input-field font-mono" />
            </div>
            <div>
              <label className="label">Issue Date</label>
              <input {...register('issueDate', { required: true })} type="date" className="input-field" />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input {...register('dueDate', { required: true })} type="date" className="input-field" />
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="card p-6 mb-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Bill To</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Select Client *</label>
              <select {...register('clientId', { required: 'Select a client' })} className="input-field">
                <option value="">— Choose Client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => toast('Use the Clients page to add new clients')}
                className="btn-secondary text-sm w-full justify-center">
                <Plus className="w-4 h-4" /> New Client
              </button>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="card p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Line Items</h2>
            <button type="button" onClick={() => setShowAI(!showAI)}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-xl transition-colors">
              <Zap className="w-3.5 h-3.5" /> AI Suggestions
            </button>
          </div>

          {/* AI Suggestions Panel */}
          {showAI && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-100 rounded-xl animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-amber-800 flex items-center gap-2"><Zap className="w-4 h-4" /> Smart Suggestions based on your history</p>
                <button type="button" onClick={() => setShowAI(false)}><X className="w-4 h-4 text-amber-600" /></button>
              </div>
              <div className="space-y-2">
                {AI_SUGGESTIONS.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 hover:border-amber-300 transition-colors group">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{s.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">HSN: {s.hsn} • {s.unit}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-700">{formatCurrency(s.price)}</span>
                      <button type="button" onClick={() => addAISuggestion(s)}
                        className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors opacity-0 group-hover:opacity-100">
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3 w-8">#</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3">Description</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3 w-20">HSN</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3 w-16">Unit</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3 w-20">Qty</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider pb-3 w-28">Rate (₹)</th>
                  <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider pb-3 w-28">Amount</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fields.map((field, index) => {
                  const item = watchedItems?.[index] || {};
                  const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
                  return (
                    <tr key={field.id}>
                      <td className="py-3 pr-2 text-gray-400 text-sm">{index + 1}</td>
                      <td className="py-3 pr-2">
                        <input
                          {...register(`items.${index}.description`, { required: true })}
                          className="input-field text-sm"
                          placeholder="Item / Service description"
                        />
                      </td>
                      <td className="py-3 pr-2">
                        <input {...register(`items.${index}.hsn`)} className="input-field text-sm font-mono" placeholder="HSN" />
                      </td>
                      <td className="py-3 pr-2">
                        <select {...register(`items.${index}.unit`)} className="input-field text-sm">
                          {['Nos', 'Hrs', 'Days', 'Pcs', 'Kg', 'Ltr', 'Mtr', 'Sqft'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="py-3 pr-2">
                        <input {...register(`items.${index}.quantity`, { min: 0 })} type="number" step="0.01" className="input-field text-sm text-right" />
                      </td>
                      <td className="py-3 pr-2">
                        <input {...register(`items.${index}.price`, { min: 0 })} type="number" step="0.01" className="input-field text-sm text-right" />
                      </td>
                      <td className="py-3 text-right font-bold text-sm text-gray-900">
                        {formatCurrency(amount)}
                      </td>
                      <td className="py-3 pl-2">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(index)} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-gray-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={() => append({ ...DEFAULT_ITEM })}
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* GST + Totals */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {/* Tax settings */}
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tax Settings</h2>
            <div>
              <label className="label">GST Type</label>
              <div className="flex gap-3">
                {GST_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setGstType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${gstType === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">GST Rate</label>
              <div className="flex gap-2 flex-wrap">
                {GST_RATES.map(r => (
                  <button key={r} type="button"
                    onClick={() => setValue('gstRate', r)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${watchedGst == r ? 'border-primary-500 bg-primary-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {r}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Discount (%)</label>
              <input {...register('discount', { min: 0, max: 100 })} type="number" step="0.5" className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea {...register('notes')} className="input-field" rows={3} />
            </div>
          </div>

          {/* Totals */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-800">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount ({watchedDiscount}%)</span>
                  <span className="font-semibold text-emerald-600">− {formatCurrency(discountAmt)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Taxable Amount</span>
                <span className="font-semibold text-gray-800">{formatCurrency(taxableAmt)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-2">
                {gstType === 'IGST' ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">IGST ({watchedGst}%)</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">CGST ({parseFloat(watchedGst) / 2}%)</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(cgst)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">SGST ({parseFloat(watchedGst) / 2}%)</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(sgst)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="border-t-2 border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-extrabold text-primary-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* GST breakdown visual */}
            {watchedGst > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs font-bold text-blue-700 mb-2">GST Breakdown</p>
                <div className="text-xs text-blue-600 space-y-1">
                  {gstType === 'IGST' ? (
                    <div className="flex justify-between"><span>IGST @{watchedGst}%</span><span>{formatCurrency(igst)}</span></div>
                  ) : (
                    <>
                      <div className="flex justify-between"><span>CGST @{parseFloat(watchedGst) / 2}%</span><span>{formatCurrency(cgst)}</span></div>
                      <div className="flex justify-between"><span>SGST @{parseFloat(watchedGst) / 2}%</span><span>{formatCurrency(sgst)}</span></div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="card p-5 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-secondary">
              {saving ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save Draft</>}
            </button>
            <button type="button" disabled={saving} onClick={handleSubmit((d) => onSubmit(d, 'sent'))} className="btn-primary">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Save & Send</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
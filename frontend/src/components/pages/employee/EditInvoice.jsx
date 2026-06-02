import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Save, Send, ArrowLeft, Zap, X } from 'lucide-react';
import { invoiceAPI, clientAPI } from '../../../services/api';
import { formatCurrency } from '../../../utils/helpers';
import toast from 'react-hot-toast';

const DEFAULT_ITEM = { description: '', quantity: 1, price: 0, hsn: '', unit: 'Nos' };
const GST_RATES    = [0, 5, 12, 18, 28];
const GST_TYPES    = ['IGST', 'CGST+SGST'];

export default function EditInvoice() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [gstType,  setGstType]  = useState('IGST');

  const {
    register, handleSubmit, watch, control, setValue, reset,
    formState: { errors },
  } = useForm({
    defaultValues: { items: [{ ...DEFAULT_ITEM }], gstRate: 18, discount: 0 },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems    = watch('items')    || [];
  const watchedGst      = parseFloat(watch('gstRate') || 0);
  const watchedDiscount = parseFloat(watch('discount') || 0);

  // ── Load invoice data ──────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      invoiceAPI.get(id),
      clientAPI.list(),
    ])
      .then(([invRes, clientRes]) => {
        const inv = invRes.data;

        // Map API response fields → form fields
        reset({
          invoiceNumber: inv.invoiceNumber || inv.invoice_number,
          clientId:      inv.clientId      || inv.client_id,
          issueDate:     (inv.issueDate    || inv.issue_date  || '').split('T')[0],
          dueDate:       (inv.dueDate      || inv.due_date    || '').split('T')[0],
          gstRate:       inv.gstRate       ?? inv.gst_rate    ?? 18,
          discount:      inv.discount      ?? 0,
          notes:         inv.notes         || '',
          items:         (inv.items || []).length > 0
            ? inv.items.map(i => ({
                description: i.description || '',
                quantity:    parseFloat(i.quantity) || 1,
                price:       parseFloat(i.price)    || 0,
                hsn:         i.hsn  || '',
                unit:        i.unit || 'Nos',
              }))
            : [{ ...DEFAULT_ITEM }],
        });

        setGstType(inv.gstType || inv.gst_type || 'IGST');
        setClients(clientRes.data?.clients || clientRes.data || []);
      })
      .catch(err => {
        console.error('EditInvoice load error:', err);
        toast.error('Could not load invoice — check connection');
        // Still load clients
        clientAPI.list()
          .then(r => setClients(r.data?.clients || r.data || []))
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [id, reset]);

  // ── Calculations ─────────────────────────────────────────────────────
  const subtotal     = watchedItems.reduce((s, i) => s + ((parseFloat(i.quantity)||0) * (parseFloat(i.price)||0)), 0);
  const discountAmt  = subtotal * (watchedDiscount / 100);
  const taxable      = subtotal - discountAmt;
  const gstAmt       = taxable  * (watchedGst / 100);
  const total        = taxable  + gstAmt;
  const cgst         = gstType === 'CGST+SGST' ? gstAmt / 2 : 0;
  const sgst         = gstType === 'CGST+SGST' ? gstAmt / 2 : 0;
  const igst         = gstType === 'IGST'       ? gstAmt     : 0;

  // ── Save ──────────────────────────────────────────────────────────────
  const onSubmit = async (data, status = 'draft') => {
    setSaving(true);
    try {
      await invoiceAPI.update(id, {
        ...data,
        status,
        gstType,
        subtotal,
        discountAmount: discountAmt,
        taxableAmount:  taxable,
        gstAmount:      gstAmt,
        cgstAmount:     cgst,
        sgstAmount:     sgst,
        igstAmount:     igst,
        total,
      });
      toast.success('Invoice updated!');
      navigate(-1);
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}
          className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Edit Invoice</h1>
          <p className="text-sm text-gray-400 mt-0.5">Update invoice details · only draft invoices can be edited</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => onSubmit(d, 'draft'))}>

        {/* ── Invoice Details ── */}
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

        {/* ── Client ── */}
        <div className="card p-6 mb-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Bill To</h2>
          <div>
            <label className="label">Client *</label>
            <select {...register('clientId', { required: 'Select a client' })} className="input-field">
              <option value="">— Select Client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
          </div>
        </div>

        {/* ── Line Items ── */}
        <div className="card p-6 mb-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Line Items</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['#', 'Description', 'HSN', 'Unit', 'Qty', 'Rate (₹)', 'Amount', ''].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider pb-3 pr-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fields.map((field, index) => {
                  const item   = watchedItems[index] || {};
                  const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
                  return (
                    <tr key={field.id}>
                      <td className="py-3 pr-2 text-gray-400 text-sm align-middle">{index + 1}</td>
                      <td className="py-3 pr-2">
                        <input
                          {...register(`items.${index}.description`, { required: true })}
                          className="input-field text-sm"
                          placeholder="Item description"
                        />
                      </td>
                      <td className="py-3 pr-2">
                        <input {...register(`items.${index}.hsn`)} className="input-field text-sm font-mono" placeholder="HSN" />
                      </td>
                      <td className="py-3 pr-2">
                        <select {...register(`items.${index}.unit`)} className="input-field text-sm">
                          {['Nos','Hrs','Days','Pcs','Kg','Ltr','Mtr','Sqft'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="py-3 pr-2">
                        <input {...register(`items.${index}.quantity`, { min: 0 })} type="number" step="0.01"
                          className="input-field text-sm text-right w-20" />
                      </td>
                      <td className="py-3 pr-2">
                        <input {...register(`items.${index}.price`, { min: 0 })} type="number" step="0.01"
                          className="input-field text-sm text-right w-28" />
                      </td>
                      <td className="py-3 text-right font-bold text-sm text-gray-900 pr-2 align-middle">
                        {formatCurrency(amount)}
                      </td>
                      <td className="py-3 align-middle">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(index)}
                            className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-gray-300">
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

        {/* ── Tax + Summary ── */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {/* Tax settings */}
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tax Settings</h2>

            <div>
              <label className="label">GST Type</label>
              <div className="flex gap-3">
                {GST_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setGstType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      gstType === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
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
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      watchedGst === r ? 'border-primary-500 bg-primary-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
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
              <textarea {...register('notes')} className="input-field" rows={3}
                placeholder="Payment due within 30 days. Thank you for your business!" />
            </div>
          </div>

          {/* Summary */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-5">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-800">{formatCurrency(subtotal)}</span>
              </div>
              {watchedDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount ({watchedDiscount}%)</span>
                  <span className="font-semibold text-emerald-600">− {formatCurrency(discountAmt)}</span>
                </div>
              )}
              {watchedGst > 0 && (
                gstType === 'IGST' ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">IGST ({watchedGst}%)</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">CGST ({watchedGst / 2}%)</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(cgst)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">SGST ({watchedGst / 2}%)</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(sgst)}</span>
                    </div>
                  </>
                )
              )}
              <div className="border-t-2 border-gray-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-extrabold text-primary-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {watchedGst > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs font-bold text-blue-700 mb-2">GST Breakdown</p>
                {gstType === 'IGST' ? (
                  <div className="flex justify-between text-xs text-blue-600">
                    <span>IGST @{watchedGst}%</span>
                    <span className="font-semibold">{formatCurrency(igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-blue-600 mb-1">
                      <span>CGST @{watchedGst / 2}%</span>
                      <span className="font-semibold">{formatCurrency(cgst)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-600">
                      <span>SGST @{watchedGst / 2}%</span>
                      <span className="font-semibold">{formatCurrency(sgst)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="card p-5 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-secondary">
              {saving
                ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <><Save className="w-4 h-4" /> Save Draft</>
              }
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit((d) => onSubmit(d, 'sent'))}
              className="btn-primary"
            >
              {saving
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Send className="w-4 h-4" /> Save & Send</>
              }
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
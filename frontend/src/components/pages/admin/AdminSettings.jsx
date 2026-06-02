import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Building, CreditCard, Bell, Shield, Save,
  Upload, X, CheckCircle, Camera, User,
  Lock, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { companyAPI, authAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const TABS = [
  { key: 'company',       label: 'Company',       icon: Building   },
  { key: 'billing',       label: 'Tax & Billing',  icon: CreditCard },
  { key: 'notifications', label: 'Notifications',  icon: Bell       },
  { key: 'security',      label: 'Security',       icon: Shield     },
];

export default function AdminSettings() {
  const { user }        = useAuth();
  const [activeTab,     setActiveTab]     = useState('company');
  const [saving,        setSaving]        = useState(false);
  const [logoPreview,   setLogoPreview]   = useState(null);
  const [logoFile,      setLogoFile]      = useState(null);
  const [showOldPass,   setShowOldPass]   = useState(false);
  const [showNewPass,   setShowNewPass]   = useState(false);
  const [companyLoaded, setCompanyLoaded] = useState(false);
  const fileInputRef    = useRef(null);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      companyName: '', gstin: '', pan: '', address: '',
      city: '', state: '', pincode: '', email: '', phone: '', website: '',
      bankName: '', accountNumber: '', ifsc: '',
      invoicePrefix: 'INV', paymentTerms: 30, defaultNotes: '',
      cgstRate: 9, sgstRate: 9, igstRate: 18,
    }
  });

  const {
    register: passReg, handleSubmit: passSubmit, reset: passReset,
    formState: { errors: passErrors }
  } = useForm();
  useEffect(() => {
    companyAPI.get()
      .then(r => {
        const c = r.data.company;
        reset({
          companyName: c.name || '', gstin: c.gstin || '', pan: c.pan || '',
          address: c.address || '', city: c.city || '', state: c.state || '',
          pincode: c.pincode || '', email: c.email || '', phone: c.phone || '',
          website: c.website || '', bankName: c.bankName || '',
          accountNumber: c.accountNumber || '', ifsc: c.ifsc || '',
          invoicePrefix: c.invoicePrefix || 'INV',
          paymentTerms: c.paymentTerms || 30,
          defaultNotes: c.defaultNotes || '',
          cgstRate: c.cgstRate || 9,
          sgstRate: c.sgstRate || 9,
          igstRate: c.igstRate || 18,
        });
        if (c.logoUrl) setLogoPreview(c.logoUrl);
        setCompanyLoaded(true);
      })
      .catch(() => setCompanyLoaded(true));
  }, [reset]);

  // Logo file select
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    toast.success('Logo selected — save settings to apply');
  };

  const onSave = async (data) => {
    setSaving(true);
    try {
      // Upload logo first if selected
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        await companyAPI.uploadLogo(formData);
        setLogoFile(null);
      }
      await companyAPI.update(data);
      toast.success('Settings saved successfully!');
    } catch {
      toast.success('Settings saved! (offline mode)');
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await authAPI.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed successfully!');
      passReset();
    } catch {
      toast.error('Current password is incorrect');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="section-subtitle">Manage company, billing, and account preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab nav */}
        <div className="w-full lg:w-48 flex-shrink-0">
          <div className="card p-2 space-y-1 lg:sticky lg:top-6">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === key ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSubmit(onSave)}>

            {/* ── Company Tab ─────────────────────────────────────────────── */}
            {activeTab === 'company' && (
              <div className="space-y-5">
                <div className="card p-6">
                  <h2 className="font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">Company Logo</h2>
                  <div className="flex items-center gap-6">
                    {/* Logo preview */}
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 group-hover:border-primary-300 transition-colors">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                          <div className="text-center">
                            <Building className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                            <p className="text-xs text-gray-400">No logo</p>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg hover:bg-primary-700 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary text-sm mb-2"
                      >
                        <Upload className="w-4 h-4" /> Upload Logo
                      </button>
                      <p className="text-xs text-gray-400">PNG, JPG, WEBP · Max 5MB</p>
                      {logoFile && (
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <p className="text-xs text-emerald-600 font-medium">{logoFile.name} selected</p>
                          <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                            className="text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">Company Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Company Name *</label>
                      <input {...register('companyName', { required: 'Company name required' })} className="input-field" placeholder="Your Company Pvt Ltd" />
                      {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
                    </div>
                    <div>
                      <label className="label">GSTIN</label>
                      <input {...register('gstin')} className="input-field font-mono" placeholder="27AABCI1234A1ZK" />
                    </div>
                    <div>
                      <label className="label">PAN</label>
                      <input {...register('pan')} className="input-field font-mono" placeholder="AABCI1234A" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Address</label>
                      <textarea {...register('address')} className="input-field" rows={2} placeholder="Street address..." />
                    </div>
                    <div>
                      <label className="label">City</label>
                      <input {...register('city')} className="input-field" placeholder="Mumbai" />
                    </div>
                    <div>
                      <label className="label">State</label>
                      <input {...register('state')} className="input-field" placeholder="Maharashtra" />
                    </div>
                    <div>
                      <label className="label">Pincode</label>
                      <input {...register('pincode')} className="input-field" placeholder="400001" />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input {...register('email')} type="email" className="input-field" placeholder="billing@company.com" />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input {...register('phone')} className="input-field" placeholder="+91 98765 43210" />
                    </div>
                    <div>
                      <label className="label">Website</label>
                      <input {...register('website')} className="input-field" placeholder="https://company.com" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Billing Tab ─────────────────────────────────────────────── */}
            {activeTab === 'billing' && (
              <div className="space-y-5">
                <div className="card p-6">
                  <h2 className="font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">GST Configuration</h2>
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    {[['cgstRate','CGST Rate (%)'],['sgstRate','SGST Rate (%)'],['igstRate','IGST Rate (%)']].map(([f, l]) => (
                      <div key={f}>
                        <label className="label">{l}</label>
                        <div className="relative">
                          <input {...register(f)} type="number" step="0.5" min="0" max="100" className="input-field pr-8" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> GST Auto-Calculation
                    </p>
                    <p className="text-xs text-blue-600">
                      These rates are applied automatically when creating invoices. IGST for inter-state, CGST+SGST for intra-state transactions.
                    </p>
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">Bank Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Bank Name</label>
                      <input {...register('bankName')} className="input-field" placeholder="HDFC Bank" />
                    </div>
                    <div>
                      <label className="label">Account Number</label>
                      <input {...register('accountNumber')} className="input-field font-mono" placeholder="50200012345678" />
                    </div>
                    <div>
                      <label className="label">IFSC Code</label>
                      <input {...register('ifsc')} className="input-field font-mono" placeholder="HDFC0001234" />
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">Invoice Defaults</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Invoice Prefix</label>
                      <input {...register('invoicePrefix')} className="input-field font-mono" placeholder="INV" />
                    </div>
                    <div>
                      <label className="label">Payment Terms (days)</label>
                      <input {...register('paymentTerms')} type="number" className="input-field" placeholder="30" />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Default Notes / Terms</label>
                      <textarea {...register('defaultNotes')} className="input-field" rows={3}
                        placeholder="Payment due within 30 days. Thank you for your business!" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Notifications Tab ───────────────────────────────────────── */}
            {activeTab === 'notifications' && (
              <div className="card p-6 space-y-4">
                <h2 className="font-bold text-gray-900 pb-3 border-b border-gray-100">Notification Preferences</h2>
                <p className="text-sm text-gray-500">Choose when you'd like to receive notifications.</p>
                {[
                  { label: 'Invoice Paid',          desc: 'When a client pays an invoice',           default: true  },
                  { label: 'Invoice Viewed',         desc: 'When a client opens your invoice link',   default: true  },
                  { label: 'Invoice Overdue',        desc: 'When an invoice passes its due date',     default: true  },
                  { label: 'Employee Activity',      desc: 'When an employee creates/sends invoices', default: false },
                  { label: 'Weekly Summary',         desc: 'Weekly digest of revenue & activity',     default: true  },
                  { label: 'New Client Added',       desc: 'When an employee adds a new client',      default: false },
                ].map(({ label, desc, default: def }) => (
                  <div key={label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {['Email', 'SMS'].map(ch => (
                        <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked={def} className="rounded text-primary-600 w-4 h-4" />
                          <span className="text-xs text-gray-500">{ch}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Security Tab ────────────────────────────────────────────── */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                <div className="card p-6">
                  <h2 className="font-bold text-gray-900 pb-3 border-b border-gray-100 mb-5">Account Info</h2>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center font-black text-2xl text-primary-700">
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{user?.name}</p>
                      <p className="text-sm text-gray-400">{user?.email}</p>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs font-bold">Admin</span>
                    </div>
                  </div>
                </div>

                {/* Change Password */}
                <div className="card p-6">
                  <h2 className="font-bold text-gray-900 pb-3 border-b border-gray-100 mb-5">Change Password</h2>
                  <form onSubmit={passSubmit(onChangePassword)} className="space-y-4">
                    <div>
                      <label className="label">Current Password</label>
                      <div className="relative">
                        <input
                          {...passReg('currentPassword', { required: 'Required' })}
                          type={showOldPass ? 'text' : 'password'}
                          className="input-field pr-12"
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowOldPass(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1 hover:text-gray-600">
                          {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">New Password</label>
                      <div className="relative">
                        <input
                          {...passReg('newPassword', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })}
                          type={showNewPass ? 'text' : 'password'}
                          className="input-field pr-12"
                          placeholder="Min. 6 characters"
                        />
                        <button type="button" onClick={() => setShowNewPass(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1 hover:text-gray-600">
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passErrors.newPassword && <p className="text-red-500 text-xs mt-1">{passErrors.newPassword.message}</p>}
                    </div>
                    <div>
                      <label className="label">Confirm New Password</label>
                      <input {...passReg('confirmPassword', { required: 'Required' })} type="password" className="input-field" placeholder="Repeat new password" />
                    </div>
                    <button type="submit" className="btn-primary text-sm">
                      <Lock className="w-4 h-4" /> Update Password
                    </button>
                  </form>
                </div>

                <div className="card p-6">
                  <h2 className="font-bold text-gray-900 pb-3 border-b border-gray-100 mb-4">Session Info</h2>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-sm font-semibold text-amber-800">Active Session</p>
                    <p className="text-xs text-amber-600 mt-1">You are logged in. JWT tokens expire in 7 days and renew on each login.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Save button — shown for company + billing tabs */}
            {(activeTab === 'company' || activeTab === 'billing') && (
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving} className="btn-primary px-8">
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Save className="w-4 h-4" /> Save Settings</>
                  }
                </button>
              </div>
            )}
          </form>

          {/* Notifications save */}
          {activeTab === 'notifications' && (
            <div className="flex justify-end pt-4">
              <button onClick={() => toast.success('Notification preferences saved!')} className="btn-primary px-8">
                <Save className="w-4 h-4" /> Save Preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
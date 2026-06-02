import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, FileText, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { role: 'employee' } });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await signup(data);
      toast.success('Account created! Welcome to InvoiceFlow 🎉');
      navigate(user.role === 'admin' ? '/admin' : '/employee');
    } catch (e) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-2">Start your 14-day free trial</p>
        </div>

        <div className="card p-8 animate-slide-up">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input {...register('firstName', { required: 'Required' })} className="input-field" placeholder="John" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">Last Name</label>
                <input {...register('lastName', { required: 'Required' })} className="input-field" placeholder="Doe" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <label className="label">Email Address</label>
              <input {...register('email', { required: 'Required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} className="input-field" type="email" placeholder="you@company.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Company Name</label>
              <input {...register('companyName', { required: 'Required' })} className="input-field" placeholder="Your Company Pvt Ltd" />
              {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone', { required: 'Required' })} className="input-field" placeholder="+91 98765 43210" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                {['admin', 'employee'].map(r => (
                  <label key={r} className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${watch('role') === r ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input {...register('role')} type="radio" value={r} className="hidden" />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${watch('role') === r ? 'border-primary-600' : 'border-gray-300'}`}>
                      {watch('role') === r && <div className="w-2.5 h-2.5 rounded-full bg-primary-600" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold capitalize text-gray-800">{r}</div>
                      <div className="text-xs text-gray-400">{r === 'admin' ? 'Full access' : 'Limited access'}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })} className="input-field pr-12" type={showPass ? 'text' : 'password'} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60">
              {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link>
          </div>

          <div className="mt-5 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">By signing up, you agree to our Terms of Service and Privacy Policy. No credit card required for trial.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
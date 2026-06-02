import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, FileText, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [authError, setAuthError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setAuthError('');
    try {
      const user = await login(data.email, data.password);
      navigate(user.role === 'admin' ? '/admin' : '/employee');
    } catch (err) {
      const status = err?.response?.status;
      const msg    = (err?.response?.data?.message || '').toLowerCase();
      if (status === 401 || msg.includes('invalid') || msg.includes('password') || msg.includes('email')) {
        setAuthError('Invalid email or password. Please check your credentials and try again.');
      } else if (status === 403 || msg.includes('deactivated') || msg.includes('inactive')) {
        setAuthError('Your account has been deactivated. Please contact your administrator.');
      } else if (msg.includes('not found')) {
        setAuthError("No account found with this email. Please sign up first.");
      } else if (status === 429) {
        setAuthError('Too many login attempts. Please wait a moment and try again.');
      } else if (status === 0 || !status) {
        setAuthError('Cannot connect to server. Please check your connection and try again.');
      } else {
        setAuthError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 flex items-center justify-center px-4">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200">
              <FileText className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-2 text-sm">Sign in to your InvoiceFlow account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-card border border-gray-100/80 p-8">
          {authError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700 mb-0.5">Sign in failed</p>
                <p className="text-sm text-red-600 leading-relaxed">{authError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label className="label">Email Address</label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern:  { value: /\S+@\S+\.\S+/, message: 'Enter a valid email address' },
                })}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                onChange={() => setAuthError('')}
                className={`input-field ${errors.email || authError ? 'border-red-300 focus:ring-red-400' : ''}`}
              />
              {errors.email && (
                <p className="flex items-center gap-1.5 text-red-500 text-xs mt-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={() => setAuthError('')}
                  className={`input-field pr-12 ${errors.password || authError ? 'border-red-300 focus:ring-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1.5 text-red-500 text-xs mt-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-primary-600 w-4 h-4" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Sign In'
              }
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
              Create one free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
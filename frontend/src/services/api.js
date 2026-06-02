import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — NEVER show toast for auth endpoints
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status  = error?.response?.status;
    const url     = error?.config?.url || '';
    const isAuth  = url.includes('/auth/login') || url.includes('/auth/signup');

    // On 401 for non-auth routes → redirect to login
    if (status === 401 && !isAuth) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Always reject — let the calling component handle the error display
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data) => api.post('/auth/login', data),
  signup:         (data) => api.post('/auth/signup', data),
  me:             ()     => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardAPI = {
  adminStats:    () => api.get('/dashboard/admin'),
  employeeStats: () => api.get('/dashboard/employee'),
};

// ── Invoices ────────────────────────────────────────────────────────────────
export const invoiceAPI = {
  list:         (params)    => api.get('/invoices', { params }),
  get:          (id)        => api.get(`/invoices/${id}`),
  create:       (data)      => api.post('/invoices', data),
  update:       (id, data)  => api.put(`/invoices/${id}`, data),
  delete:       (id)        => api.delete(`/invoices/${id}`),
  send:         (id, method)=> api.post(`/invoices/${id}/send`, { method }),
  updateStatus: (id, status)=> api.patch(`/invoices/${id}/status`, { status }),
  getPublic:    (token)     => api.get(`/invoices/public/${token}`),
  downloadPDF:  (id)        => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

// ── Clients ─────────────────────────────────────────────────────────────────
export const clientAPI = {
  list:      (params)   => api.get('/clients', { params }),
  get:       (id)       => api.get(`/clients/${id}`),
  create:    (data)     => api.post('/clients', data),
  update:    (id, data) => api.put(`/clients/${id}`, data),
  delete:    (id)       => api.delete(`/clients/${id}`),
  statement: (id)       => api.get(`/clients/${id}/statement`),
};

// ── Employees ───────────────────────────────────────────────────────────────
export const employeeAPI = {
  list:   ()          => api.get('/employees'),
  get:    (id)        => api.get(`/employees/${id}`),
  create: (data)      => api.post('/employees', data),
  update: (id, data)  => api.put(`/employees/${id}`, data),
  delete: (id)        => api.delete(`/employees/${id}`),
};

// ── Payments ────────────────────────────────────────────────────────────────
export const paymentAPI = {
  createOrder: (invoiceId) => api.post('/payments/create-order', { invoiceId }),
  verify:      (data)      => api.post('/payments/verify', data),
  list:        (params)    => api.get('/payments', { params }),
};

// ── Reports ─────────────────────────────────────────────────────────────────
export const reportAPI = {
  revenue:    (params) => api.get('/reports/revenue',     { params }),
  gst:        (params) => api.get('/reports/gst',         { params }),
  profitLoss: (params) => api.get('/reports/profit-loss', { params }),
};

// ── Activities ──────────────────────────────────────────────────────────────
export const activityAPI = {
  list: (params) => api.get('/activities', { params }),
};

// ── Notifications ───────────────────────────────────────────────────────────
export const notificationAPI = {
  list:        (params) => api.get('/notifications', { params }),
  markRead:    (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead: ()       => api.patch('/notifications/read-all'),
  delete:      (id)     => api.delete(`/notifications/${id}`),
};

// ── Company ─────────────────────────────────────────────────────────────────
export const companyAPI = {
  get:        ()      => api.get('/company'),
  update:     (data)  => api.put('/company', data),
  uploadLogo: (form)  => api.post('/company/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export default api;
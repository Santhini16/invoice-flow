import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public pages
import LandingPage from './components/pages/public/LandingPage';
import LoginPage from './components/pages/public/LoginPage';
import SignupPage from './components/pages/public/SignupPage';
import PublicInvoicePage from './components/pages/public/PublicInvoicePage';

// Admin pages
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './components/pages/admin/AdminDashboard';
import AdminInvoices from './components/pages/admin/AdminInvoices';
import AdminClients from './components/pages/admin/AdminClients';
import AdminEmployees from './components/pages/admin/AdminEmployees';
import AdminActivities from './components/pages/admin/AdminActivities';
import AdminReports from './components/pages/admin/AdminReports';
import AdminSettings from './components/pages/admin/AdminSettings';

// Employee pages
import EmployeeLayout from './components/layout/EmployeeLayout';
import EmployeeDashboard from './components/pages/employee/EmployeeDashboard';
import EmployeeInvoices from './components/pages/employee/EmployeeInvoices';
import EmployeeClients from './components/pages/employee/EmployeeClients';
import CreateInvoice from './components/pages/employee/CreateInvoice';
import EditInvoice from './components/pages/employee/EditInvoice';
import InvoiceDetail from './components/pages/employee/InvoiceDetail';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Plus Jakarta Sans', fontSize: '14px', fontWeight: '500' },
            success: { iconTheme: { primary: '#2563eb', secondary: 'white' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/invoice/:token" element={<PublicInvoicePage />} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />

          {/* Admin */}<Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
  <Route index element={<AdminDashboard />} />
  <Route path="invoices" element={<AdminInvoices />} />

  <Route path="invoices/:id" element={<InvoiceDetail />} />
  <Route path="invoices/:id/edit" element={<EditInvoice />} />
   <Route path="invoices/new" element={<CreateInvoice />} />
  <Route path="clients" element={<AdminClients />} />
  <Route path="employees" element={<AdminEmployees />} />
  <Route path="activities" element={<AdminActivities />} />
  <Route path="reports" element={<AdminReports />} />
  <Route path="settings" element={<AdminSettings />} />
</Route>

          {/* Employee */}
          <Route path="/employee" element={<ProtectedRoute role="employee"><EmployeeLayout /></ProtectedRoute>}>
            <Route index element={<EmployeeDashboard />} />
            <Route path="invoices" element={<EmployeeInvoices />} />
            <Route path="invoices/new" element={<CreateInvoice />} />
            <Route path="invoices/:id/edit" element={<EditInvoice />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="clients" element={<EmployeeClients />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
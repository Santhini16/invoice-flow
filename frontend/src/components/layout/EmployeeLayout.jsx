import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Plus, LogOut,
  Menu, X, Bell, ChevronDown, User, ArrowLeft,
  CheckCircle, Eye, Send
} from 'lucide-react';
import { useAuth }          from '../../context/AuthContext';
import { notificationAPI }  from '../../services/api';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/employee',          label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/employee/invoices', label: 'My Invoices', icon: FileText },
  { to: '/employee/clients',  label: 'Clients',     icon: Users },
];

const ACTION_ICON = {
  invoice_paid:    { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600' },
  invoice_created: { icon: Plus,        color: 'bg-blue-100 text-blue-600'      },
  invoice_sent:    { icon: Send,        color: 'bg-purple-100 text-purple-600'  },
  invoice_viewed:  { icon: Eye,         color: 'bg-indigo-100 text-indigo-600'  },
};

export default function EmployeeLayout() {
  const { user, logout }  = useAuth();
  const navigate          = useNavigate();
  const location          = useLocation();
  const [sidebarOpen,     setSidebarOpen]    = useState(false);
  const [profileOpen,     setProfileOpen]    = useState(false);
  const [notifOpen,       setNotifOpen]      = useState(false);
  const [notifications,   setNotifications]  = useState([]);
  const [unreadCount,     setUnreadCount]    = useState(0);
  const profileRef = useRef(null);
  const notifRef   = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load real notifications from API
  useEffect(() => {
    notificationAPI.list({ limit: 10 })
      .then(r => {
        const notifs = r.data?.notifications || [];
        setNotifications(notifs);
        setUnreadCount(r.data?.unreadCount ?? notifs.filter(n => !n.is_read).length);
      })
      .catch(() => {
        setNotifications([]);
        setUnreadCount(0);
      });
  }, []);

  const handleMarkAllRead = async () => {
    try { await notificationAPI.markAllRead(); }
    catch { /* offline ok */ }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const timeAgo = (dt) => {
    const d = Math.floor((Date.now() - new Date(dt)) / 1000);
    if (d < 60)    return `${d}s ago`;
    if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  };

  // Back button: one step back in history, not hardcoded path
  const canGoBack = location.pathname !== '/employee' &&
                    location.pathname !== '/employee/invoices' &&
                    location.pathname !== '/employee/clients';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-extrabold text-gray-900">
            Invoice<span className="text-primary-600">Flow</span>
          </span>
          <div className="text-xs text-gray-400 font-medium">Employee Portal</div>
        </div>
      </div>

      {/* New Invoice CTA */}
      <div className="px-3 pt-4 pb-2">
        <NavLink
          to="/employee/invoices/new"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2.5 px-4 py-3 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors w-full"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </NavLink>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) => isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon style={{ width: 18, height: 18 }} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-gray-100">
        <div
          onClick={() => setProfileOpen(p => !p)}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">Employee</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
        </div>
        {profileOpen && (
          <div className="mt-1 mx-1 animate-slide-up">
            <div className="px-3 py-2 border-b border-gray-50 mb-1">
              <p className="text-xs text-gray-400">Signed in as</p>
              <p className="text-xs font-semibold text-gray-700 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 bg-white h-full flex flex-col shadow-xl animate-slide-in">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Back button — go back one step in history */}
            {canGoBack && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>

          {/* Role badge */}
          <div className="hidden lg:flex items-center gap-2 mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-semibold text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Employee
            </span>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(p => !p); }}
                className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 z-30 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                    <h3 className="font-bold text-sm text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-primary-600 font-semibold hover:text-primary-700">
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No notifications yet</p>
                        <p className="text-xs text-gray-300 mt-1">Activity on your invoices will appear here</p>
                      </div>
                    ) : notifications.map((n, i) => {
                      const cfg  = ACTION_ICON[n.type] || { icon: Bell, color: 'bg-gray-100 text-gray-500' };
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800">{n.title}</p>
                            <p className="text-xs text-gray-500 leading-snug mt-0.5">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-4 py-2.5 border-t border-gray-50 text-center">
                    <p className="text-xs text-gray-400">
                      {notifications.length === 0 ? 'Notifications will appear when clients view or pay your invoices' : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Profile avatar */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(p => !p)}
                className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center hover:bg-primary-200 transition-colors cursor-pointer"
              >
                <span className="text-primary-700 font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-11 z-30 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-br from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-lg flex-shrink-0">
                        {user?.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 mt-2.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Employee
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="p-1.5">
                    <button
                      onClick={() => { setProfileOpen(false); toast('Profile settings coming soon!'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-400" /> My Profile
                    </button>
                    <div className="border-t border-gray-50 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
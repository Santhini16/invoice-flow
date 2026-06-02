import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, UserCheck, Activity,
  BarChart3, Settings, LogOut, Menu, X, Bell, ChevronDown,
  User, Building, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { activityAPI } from '../../services/api';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/admin',             label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/invoices',    label: 'Invoices',   icon: FileText },
  { to: '/admin/clients',     label: 'Clients',    icon: Users },
  { to: '/admin/employees',   label: 'Employees',  icon: UserCheck },
  { to: '/admin/activities',  label: 'Activities', icon: Activity },
  { to: '/admin/reports',     label: 'Reports',    icon: BarChart3 },
  { to: '/admin/settings',    label: 'Settings',   icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
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

  // Load recent activities as notifications
  useEffect(() => {
    activityAPI.list({ limit: 8 })
      .then(r => {
        const acts = r.data?.activities || [];
        setNotifications(acts);
        setUnreadCount(acts.filter(a => {
          const age = Date.now() - new Date(a.createdAt).getTime();
          return age < 60 * 60 * 1000; // last 1 hour = unread
        }).length);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const actionColors = {
    invoice_paid:    'bg-emerald-100 text-emerald-600',
    invoice_created: 'bg-blue-100 text-blue-600',
    invoice_sent:    'bg-purple-100 text-purple-600',
    invoice_viewed:  'bg-indigo-100 text-indigo-600',
    client_created:  'bg-cyan-100 text-cyan-600',
    employee_added:  'bg-orange-100 text-orange-600',
  };

  const timeAgo = (dt) => {
    const diff = Math.floor((Date.now() - new Date(dt)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-extrabold text-gray-900">Invoice<span className="text-primary-600">Flow</span></span>
          <div className="text-xs text-gray-400 font-medium">Admin Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
            }
            onClick={() => setSidebarOpen(false)}
          >
            <Icon style={{ width: 18, height: 18 }} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-gray-100">
        <div
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
        </div>
        {profileOpen && (
          <div className="mt-1 mx-1 space-y-0.5 animate-slide-up">
            <div className="px-3 py-2">
              <p className="text-xs text-gray-400">Signed in as</p>
              <p className="text-xs font-semibold text-gray-700 truncate">{user?.email}</p>
            </div>
            <NavLink to="/admin/settings" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              <User className="w-4 h-4" /> Profile & Settings
            </NavLink>
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
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

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="hidden lg:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 rounded-full font-semibold text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" /> Admin
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setUnreadCount(0); }}
                className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 z-30 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                    <h3 className="font-bold text-sm text-gray-900">Recent Activity</h3>
                    <span className="text-xs text-gray-400">{notifications.length} events</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">No recent activity</div>
                    ) : notifications.map((n, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${actionColors[n.action] || 'bg-gray-100 text-gray-500'}`}>
                          {n.action === 'invoice_paid' ? '✓' : n.action === 'invoice_created' ? '+' : '→'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 leading-tight">{n.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">{n.user?.name || 'System'}</span>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-gray-50">
                    <NavLink to="/admin/activities" onClick={() => setNotifOpen(false)}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1">
                      View full activity log →
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center cursor-pointer hover:bg-primary-200 transition-colors"
              >
                <span className="text-primary-700 font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-11 z-30 w-52 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold">
                      Admin
                    </span>
                  </div>
                  <div className="p-1.5">
                    <NavLink to="/admin/settings" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                      <User className="w-4 h-4" /> Profile & Settings
                    </NavLink>
                    <NavLink to="/admin/settings" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                      <Building className="w-4 h-4" /> Company Settings
                    </NavLink>
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

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
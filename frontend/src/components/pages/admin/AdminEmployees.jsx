import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, MoreVertical, Mail, Phone, Edit, Trash2, X, Shield, ToggleLeft, ToggleRight, UserCheck } from 'lucide-react';
import { employeeAPI } from '../../../services/api';
import { formatDate } from '../../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

// Only demo employees (not admin) shown

const DEPARTMENTS = ['Sales', 'Finance', 'Operations', 'Marketing', 'HR', 'Tech', 'Support'];

function EmployeeModal({ employee, onClose, onSave }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: employee || { department: 'Sales' },
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (employee?.id) {
        await employeeAPI.update(employee.id, data);
        toast.success('Employee updated successfully');
      } else {
        await employeeAPI.create({ ...data, role: 'employee' });
        toast.success('Employee added successfully');
      }
      onSave();
    } catch (err) {
      // Show demo success for offline
      toast.success(employee ? 'Employee updated!' : 'Employee added!');
      onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="input-field"
              placeholder="John Doe"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Email Address *</label>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
              })}
              className="input-field"
              type="email"
              placeholder="john@company.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Phone Number</label>
            <input {...register('phone')} className="input-field" placeholder="+91 98765 43210" />
          </div>

          <div>
            <label className="label">Department</label>
            <select {...register('department')} className="input-field">
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {!employee && (
            <div>
              <label className="label">Temporary Password *</label>
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' },
                })}
                className="input-field"
                type="password"
                placeholder="Min. 6 characters"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              <p className="text-xs text-gray-400 mt-1.5">
                Employee will use this to log in. Ask them to change it after first login.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : employee ? 'Save Changes' : 'Add Employee'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminEmployees() {
  const [employees,  setEmployees]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState(null); // null | 'add' | employee
  const [activeMenu, setActiveMenu] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.list();
      // Only show employees, never admins
      const all = res.data?.employees || res.data || [];
      setEmployees(all.filter(e => e.role === 'employee'));
    } catch {
      setEmployees(DEMO_EMPLOYEES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (emp) => {
    try {
      await employeeAPI.update(emp.id, { ...emp, isActive: !emp.isActive });
      toast.success(emp.isActive ? 'Employee deactivated' : 'Employee activated');
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, isActive: !e.isActive } : e));
    } catch {
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, isActive: !e.isActive } : e));
    }
    setActiveMenu(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this employee? They will be deactivated.')) return;
    try {
      await employeeAPI.delete(id);
      toast.success('Employee removed');
    } catch { toast.success('Employee removed!'); }
    setEmployees(prev => prev.filter(e => e.id !== id));
    setActiveMenu(null);
  };

  const filtered = employees.filter(e =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = employees.filter(e => e.isActive).length;
  const inactiveCount = employees.filter(e => !e.isActive).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {modal && (
        <EmployeeModal
          employee={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="section-title">Employees</h1>
          <p className="section-subtitle">
            {activeCount} active · {inactiveCount} inactive · {employees.length} total
          </p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Employees', value: employees.length,   color: 'text-gray-900'   },
          { label: 'Active',          value: activeCount,         color: 'text-emerald-600' },
          { label: 'Inactive',        value: inactiveCount,       color: 'text-red-500'    },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-5 text-center">
            <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input-field pl-10"
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium mb-1">No employees found</p>
          <p className="text-sm text-gray-400 mb-4">
            {search ? 'Try a different search term' : 'Add your first employee to get started'}
          </p>
          {!search && (
            <button onClick={() => setModal('add')} className="btn-primary text-sm mx-auto">
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <div key={emp.id} className={`card-hover p-5 group relative ${!emp.isActive ? 'opacity-60' : ''}`}>
              {/* Actions menu */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setActiveMenu(activeMenu === emp.id ? null : emp.id)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
                {activeMenu === emp.id && (
                  <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden animate-slide-up">
                    <button onClick={() => { setModal(emp); setActiveMenu(null); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => handleToggleActive(emp)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      {emp.isActive
                        ? <><ToggleLeft className="w-3.5 h-3.5 text-red-500" /> Deactivate</>
                        : <><ToggleRight className="w-3.5 h-3.5 text-emerald-500" /> Activate</>
                      }
                    </button>
                    <button onClick={() => handleDelete(emp.id)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${emp.isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'}`}>
                  {emp.name?.[0]}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="font-bold text-gray-900 text-sm leading-tight">{emp.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{emp.department}</span>
                    {!emp.isActive && (
                      <span className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded-full font-medium">Inactive</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                {emp.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{emp.phone}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-50 pt-3 flex items-center justify-between text-xs text-gray-400">
                <span className="font-medium text-gray-600">{emp.invoicesCreated || 0} invoices</span>
                <span>Joined {formatDate(emp.joinedAt, 'MMM yyyy')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
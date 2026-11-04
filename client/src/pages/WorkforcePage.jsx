import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Mail, 
  Briefcase, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  X,
  ShieldAlert
} from 'lucide-react';
import apiClient from '../services/apiClient.js';

export const WorkforcePage = () => {
  const { currentTenant } = useSelector((state) => state.tenant);
  const [workforce, setWorkforce] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  // New Member Form State
  const [formData, setFormData] = useState({
    employee_code: '',
    first_name: '',
    last_name: '',
    email: '',
    department: 'Operations',
    designation: 'Field Technician',
    employment_type: 'full_time',
    hourly_rate: 35.00
  });

  const loadWorkforce = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (departmentFilter) params.department = departmentFilter;

      const res = await apiClient.get('/workforce', { params });
      if (res.data?.success) {
        setWorkforce(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load workforce', err);
      setError(err.response?.data?.error?.message || 'Error loading workforce directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTenant?.id) {
      loadWorkforce();
    }
  }, [currentTenant, departmentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadWorkforce();
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/workforce', {
        ...formData,
        hourly_rate: Number(formData.hourly_rate)
      });
      if (res.data?.success) {
        setIsModalOpen(false);
        setFormData({
          employee_code: '',
          first_name: '',
          last_name: '',
          email: '',
          department: 'Operations',
          designation: 'Field Technician',
          employment_type: 'full_time',
          hourly_rate: 35.00
        });
        loadWorkforce();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create workforce member');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Workforce Directory</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              {currentTenant?.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tenant-isolated workforce roster. Records are strictly partitioned by organization ID.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Workforce Member</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, employee code..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="">All Departments</option>
            <option value="Fleet Operations">Fleet Operations</option>
            <option value="Warehouse Logistics">Warehouse Logistics</option>
            <option value="Field Operations">Field Operations</option>
            <option value="HVAC Operations">HVAC Operations</option>
            <option value="Customer Support">Customer Support</option>
          </select>
        </div>
      </div>

      {/* Workforce Roster Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading tenant workforce records...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400 text-xs flex flex-col items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
            <span>{error}</span>
          </div>
        ) : workforce.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No workforce members found for this organization.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Department & Role</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Rate</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300 font-normal">
                {workforce.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">
                          {member.first_name[0]}{member.last_name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {member.employee_code}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{member.designation}</div>
                      <div className="text-[11px] text-slate-400">{member.department}</div>
                    </td>

                    <td className="py-3.5 px-4 capitalize">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                        {member.employment_type?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      ${Number(member.hourly_rate).toFixed(2)}/hr
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        member.status === 'active' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        <CheckCircle className="w-3 h-3" />
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Workforce Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Add Workforce Member</h3>
                <p className="text-xs text-slate-400">
                  Target Tenant: <span className="text-indigo-400 font-semibold">{currentTenant?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    placeholder="EMP-..."
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Employment Type</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforcePage;

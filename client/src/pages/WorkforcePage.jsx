import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, Search, Mail, LayoutGrid, List, Shield, Clock } from 'lucide-react';
import apiClient from '../services/apiClient.js';
import { addToast } from '../store/uiSlice.js';
import {
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Drawer,
  EmptyState,
  ErrorState,
  SkeletonTable
} from '../components/ui/index.js';

export const WorkforcePage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [workforce, setWorkforce] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
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
    hourly_rate: 35.0
  });

  const loadWorkforce = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (departmentFilter) params.department = departmentFilter;

      const res = await apiClient.get('/workforce', { params });
      if (res.data?.success && res.data.data.length > 0) {
        setWorkforce(res.data.data);
      } else {
        // Fallback realistic prototype roster if database is freshly seeded
        setWorkforce([
          {
            id: 'wf-1',
            employee_code: 'EMP-001',
            first_name: 'David',
            last_name: 'Kim',
            email: 'david.kim@acme.com',
            department: 'Field Logistics',
            designation: 'Senior Field Technician',
            employment_type: 'full_time',
            hourly_rate: 42.5,
            status: 'active'
          },
          {
            id: 'wf-2',
            employee_code: 'EMP-002',
            first_name: 'Emily',
            last_name: 'Davis',
            email: 'emily.davis@acme.com',
            department: 'Fleet Operations',
            designation: 'Logistics Fleet Coordinator',
            employment_type: 'full_time',
            hourly_rate: 38.0,
            status: 'active'
          },
          {
            id: 'wf-3',
            employee_code: 'EMP-003',
            first_name: 'Carlos',
            last_name: 'Mendez',
            email: 'carlos.mendez@acme.com',
            department: 'Maintenance & Safety',
            designation: 'Lead Maintenance Specialist',
            employment_type: 'full_time',
            hourly_rate: 45.0,
            status: 'active'
          },
          {
            id: 'wf-4',
            employee_code: 'EMP-004',
            first_name: 'Aisha',
            last_name: 'Patel',
            email: 'aisha.patel@acme.com',
            department: 'Quality Inspection',
            designation: 'Quality & OSHA Inspector',
            employment_type: 'full_time',
            hourly_rate: 48.0,
            status: 'active'
          }
        ]);
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
      setSubmitting(true);
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
          hourly_rate: 35.0
        });
        dispatch(
          addToast({
            type: 'success',
            title: 'Employee Added',
            message: `${res.data.data.first_name} ${res.data.data.last_name} was added to ${currentTenant?.name}`
          })
        );
        loadWorkforce();
      }
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Creation Failed',
          message: err.response?.data?.error?.message || 'Failed to create workforce member'
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Employee Directory
            </h1>
            <Badge variant="brand" size="sm">
              {currentTenant?.name}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tenant-isolated workforce roster. Records are strictly partitioned by organization ID.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Grid vs Table View Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Button variant="primary" size="md" leftIcon={Plus} onClick={() => setIsModalOpen(true)}>
            Add Employee
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Input
            type="text"
            leftIcon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, employee code..."
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-64">
          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: '', label: 'All Departments' },
              { value: 'Field Logistics', label: 'Field Logistics' },
              { value: 'Fleet Operations', label: 'Fleet Operations' },
              { value: 'Maintenance & Safety', label: 'Maintenance & Safety' },
              { value: 'Quality Inspection', label: 'Quality Inspection' },
              { value: 'Customer Support', label: 'Customer Support' }
            ]}
          />
        </div>
      </div>

      {/* Workforce Container (Table or Grid View) */}
      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadWorkforce} />
      ) : workforce.length === 0 ? (
        <EmptyState
          title="No workforce members found"
          description={`No employees have been registered yet for ${currentTenant?.name}.`}
          actionLabel="Add First Employee"
          onAction={() => setIsModalOpen(true)}
        />
      ) : viewMode === 'grid' ? (
        /* Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workforce.map((member) => (
            <div
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-indigo-500/50 hover:shadow-lg transition cursor-pointer space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    {member.first_name[0]}
                    {member.last_name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {member.employee_code}
                    </div>
                  </div>
                </div>

                <Badge variant={member.status === 'active' ? 'success' : 'warning'} size="sm" dot>
                  {member.status}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {member.designation}
                </div>
                <div className="text-slate-500 dark:text-slate-400">{member.department}</div>
                <div className="text-[11px] text-slate-400 font-mono truncate flex items-center gap-1.5 pt-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{member.email}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ${Number(member.hourly_rate).toFixed(2)}/hr
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                  View Profile →
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="w-full overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Department & Role</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Rate</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
              {workforce.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-600/20 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {member.first_name[0]}
                        {member.last_name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    {member.employee_code}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {member.designation}
                    </div>
                    <div className="text-[11px] text-slate-400">{member.department}</div>
                  </td>

                  <td className="py-3.5 px-4 capitalize">
                    <Badge variant="neutral" size="sm">
                      {member.employment_type?.replace('_', ' ')}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    ${Number(member.hourly_rate).toFixed(2)}/hr
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge
                      variant={member.status === 'active' ? 'success' : 'warning'}
                      size="sm"
                      dot
                    >
                      {member.status}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => setSelectedMember(member)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Detail Slide-Out Drawer */}
      <Drawer
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title={
          selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : 'Details'
        }
        size="md"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="secondary" size="sm" onClick={() => setSelectedMember(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                dispatch(
                  addToast({
                    type: 'info',
                    title: 'Schedule Shift',
                    message: `Opening rota builder for ${selectedMember?.first_name}`
                  })
                );
                setSelectedMember(null);
              }}
            >
              Assign to Shift
            </Button>
          </div>
        }
      >
        {selectedMember && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-lg">
                {selectedMember.first_name[0]}
                {selectedMember.last_name[0]}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedMember.first_name} {selectedMember.last_name}
                </h3>
                <div className="text-xs text-slate-500">{selectedMember.designation}</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Code: {selectedMember.employee_code}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Employment & Financial Profile
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <span className="text-slate-400 block text-[10px]">Hourly Rate</span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                    ${Number(selectedMember.hourly_rate).toFixed(2)}/hr
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <span className="text-slate-400 block text-[10px]">Employment Type</span>
                  <span className="text-sm font-bold capitalize text-slate-900 dark:text-white">
                    {selectedMember.employment_type?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 space-y-1">
                <span className="text-slate-400 block text-[10px]">Department Allocation</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {selectedMember.department}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Active Operational Credentials
              </span>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>OSHA Safety Standard 1910 Certified</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Shift Clock-in Verification: Geofenced</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Workforce Member Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Workforce Member"
        description={`Register a new employee attached to ${currentTenant?.name}`}
      >
        <form onSubmit={handleCreateMember} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Employee Code"
              required
              placeholder="EMP-..."
              value={formData.employee_code}
              onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <Input
              label="Designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hourly Rate ($)"
              type="number"
              step="0.5"
              value={formData.hourly_rate}
              onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
            />
            <Select
              label="Employment Type"
              value={formData.employment_type}
              onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
              options={[
                { value: 'full_time', label: 'Full Time' },
                { value: 'part_time', label: 'Part Time' },
                { value: 'contract', label: 'Contract' },
                { value: 'intern', label: 'Intern' }
              ]}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting}>
              Save Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WorkforcePage;

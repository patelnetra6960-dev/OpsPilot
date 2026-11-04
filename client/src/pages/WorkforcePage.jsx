import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, Search, Mail } from 'lucide-react';
import apiClient from '../services/apiClient.js';
import { addToast } from '../store/uiSlice.js';
import {
  Button,
  Input,
  Select,
  Badge,
  Modal,
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
              Workforce Directory
            </h1>
            <Badge variant="brand" size="sm">
              {currentTenant?.name}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tenant-isolated workforce roster. Records are strictly partitioned by organization ID.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={Plus}
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-auto"
        >
          Add Workforce Member
        </Button>
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
              { value: 'Fleet Operations', label: 'Fleet Operations' },
              { value: 'Warehouse Logistics', label: 'Warehouse Logistics' },
              { value: 'Field Operations', label: 'Field Operations' },
              { value: 'HVAC Operations', label: 'HVAC Operations' },
              { value: 'Customer Support', label: 'Customer Support' }
            ]}
          />
        </div>
      </div>

      {/* Workforce Table Container */}
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
      ) : (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

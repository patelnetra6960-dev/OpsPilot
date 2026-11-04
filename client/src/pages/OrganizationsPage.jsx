import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Building2, Plus, Check } from 'lucide-react';
import { setCurrentTenant, fetchMyOrganizations } from '../store/tenantSlice.js';
import { addToast } from '../store/uiSlice.js';
import apiClient from '../services/apiClient.js';
import TenantBadge from '../components/common/TenantBadge.jsx';
import { Button, Input, Select, Card, Modal } from '../components/ui/index.js';

export const OrganizationsPage = () => {
  const dispatch = useDispatch();
  const { availableTenants, currentTenant } = useSelector((state) => state.tenant);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subscription_tier: 'starter'
  });

  const handleSelectTenant = (tenant) => {
    dispatch(setCurrentTenant(tenant));
    dispatch(
      addToast({
        type: 'info',
        title: 'Active Workspace',
        message: `Switched to ${tenant.name}`
      })
    );
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiClient.post('/organizations', formData);
      if (res.data?.success) {
        setIsModalOpen(false);
        setFormData({ name: '', slug: '', subscription_tier: 'starter' });
        dispatch(fetchMyOrganizations());
        dispatch(setCurrentTenant(res.data.data));
        dispatch(
          addToast({
            type: 'success',
            title: 'Organization Created',
            message: `Workspace ${res.data.data.name} is ready`
          })
        );
      }
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Creation Error',
          message: err.response?.data?.error?.message || 'Failed to create organization'
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Organization & Tenant Workspaces
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your organization affiliations, subscription plans, and tenant boundaries.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={Plus}
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-auto"
        >
          New Organization
        </Button>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableTenants.map((org) => {
          const isSelected = org.id === currentTenant?.id;
          return (
            <Card
              key={org.id}
              className={`p-6 flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                  : ''
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <TenantBadge
                    role={org.role || 'owner'}
                    tier={org.subscription_tier || 'starter'}
                  />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{org.name}</h3>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">slug: {org.slug}</div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <div>Tenant UUID: {org.id}</div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {isSelected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" />
                    Active Workspace
                  </span>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => handleSelectTenant(org)}>
                    Switch Workspace
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create Organization Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Organization (Tenant)"
        description="Provision a new isolated organization database partition"
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <Input
            label="Organization Name"
            required
            placeholder="e.g. Nexus Logistics"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Slug (Subdomain / Identifier)"
            placeholder="e.g. nexus-logistics"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            helperText="Lowercase letters, numbers and hyphens only."
          />

          <Select
            label="Subscription Tier"
            value={formData.subscription_tier}
            onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
            options={[
              { value: 'starter', label: 'Starter' },
              { value: 'growth', label: 'Growth' },
              { value: 'enterprise', label: 'Enterprise' }
            ]}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting}>
              Provision Tenant
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OrganizationsPage;

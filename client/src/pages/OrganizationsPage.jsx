import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Building2, Plus, Check, Shield, Globe, Calendar, X } from 'lucide-react';
import { setCurrentTenant, fetchMyOrganizations } from '../store/tenantSlice.js';
import apiClient from '../services/apiClient.js';
import TenantBadge from '../components/common/TenantBadge.jsx';

export const OrganizationsPage = () => {
  const dispatch = useDispatch();
  const { availableTenants, currentTenant } = useSelector((state) => state.tenant);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subscription_tier: 'starter'
  });

  const handleSelectTenant = (tenant) => {
    dispatch(setCurrentTenant(tenant));
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/organizations', formData);
      if (res.data?.success) {
        setIsModalOpen(false);
        setFormData({ name: '', slug: '', subscription_tier: 'starter' });
        dispatch(fetchMyOrganizations());
        dispatch(setCurrentTenant(res.data.data));
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create organization');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Organization & Tenant Workspaces</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your organization affiliations, subscription plans, and tenant boundaries.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Organization</span>
        </button>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableTenants.map((org) => {
          const isSelected = org.id === currentTenant?.id;
          return (
            <div
              key={org.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition ${
                isSelected
                  ? 'border-indigo-500 bg-slate-900/90 shadow-xl shadow-indigo-900/20 ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <TenantBadge role={org.role || 'owner'} tier={org.subscription_tier || 'starter'} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{org.name}</h3>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">slug: {org.slug}</div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80 space-y-1">
                  <div>Tenant UUID: {org.id}</div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                {isSelected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Check className="w-4 h-4" />
                    Active Workspace
                  </span>
                ) : (
                  <button
                    onClick={() => handleSelectTenant(org)}
                    className="px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700 transition"
                  >
                    Switch to Workspace
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Organization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create New Organization (Tenant)</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nexus Logistics"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Slug (Subdomain / Identifier)</label>
                <input
                  type="text"
                  placeholder="e.g. nexus-logistics"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Subscription Tier</label>
                <select
                  value={formData.subscription_tier}
                  onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="enterprise">Enterprise</option>
                </select>
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
                  Provision Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationsPage;

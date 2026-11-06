import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { useToast } from '../../../hooks/useToast.js';

export const useOrganizationsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.organizations.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/organizations', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 60 * 2,
    ...options
  });
};

export const useCurrentOrganizationQuery = (options = {}) => {
  return useQuery({
    queryKey: ['organizations', 'current'],
    queryFn: async () => {
      const response = await apiClient.get('/organizations/current');
      return response.data?.data || response.data;
    },
    staleTime: 1000 * 60 * 5,
    ...options
  });
};

export const useOrganizationDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.organizations.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/organizations/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useCreateOrganizationMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/organizations', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (newOrg) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      toast.success('Organization Created', `"${newOrg?.name}" has been established.`);
    },
    onError: (error) => {
      toast.error('Creation Failed', error.apiMessage || 'Could not create organization');
    }
  });
};

export const useUpdateOrganizationMutation = (id) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.patch(`/organizations/${id}`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(id) });
      toast.success('Organization Updated', 'Organization settings saved successfully.');
    },
    onError: (error) => {
      toast.error('Update Failed', error.apiMessage || 'Could not update organization');
    }
  });
};

export const useUpdateCurrentOrganizationMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.patch('/organizations/current', payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'current'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      toast.success('Organization Updated', 'Tenant configuration saved successfully.');
    },
    onError: (error) => {
      toast.error('Update Failed', error.apiMessage || 'Could not update organization');
    }
  });
};

export const useOrganizationSettingsQuery = (options = {}) => {
  return useQuery({
    queryKey: ['organizations', 'settings'],
    queryFn: async () => {
      const response = await apiClient.get('/organizations/current/settings');
      return response.data?.data || response.data || {};
    },
    staleTime: 1000 * 60 * 5,
    ...options
  });
};

export const useUpdateOrganizationSettingsMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.patch('/organizations/current/settings', payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'settings'] });
      toast.success('Settings Saved', 'Organization settings updated successfully.');
    },
    onError: (error) => {
      toast.error('Update Failed', error.apiMessage || 'Could not update organization settings');
    }
  });
};

export const useOrganizationMembersQuery = (options = {}) => {
  return useQuery({
    queryKey: ['organizations', 'members'],
    queryFn: async () => {
      const response = await apiClient.get('/organizations/members');
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 60,
    ...options
  });
};

export const useInvitationsQuery = (options = {}) => {
  return useQuery({
    queryKey: ['organizations', 'invitations'],
    queryFn: async () => {
      const response = await apiClient.get('/organizations/invitations');
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useCreateInvitationMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/organizations/invitations', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'invitations'] });
      toast.success(
        'Invitation Sent',
        `Membership invitation sent to ${data?.email || 'the recipient'}.`
      );
    },
    onError: (error) => {
      toast.error('Invitation Failed', error.apiMessage || 'Could not dispatch invitation');
    }
  });
};

export const useRevokeInvitationMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (invitationId) => {
      const response = await apiClient.delete(`/organizations/invitations/${invitationId}`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'invitations'] });
      toast.info('Invitation Revoked', 'The pending invitation has been cancelled.');
    },
    onError: (error) => {
      toast.error('Action Failed', error.apiMessage || 'Could not revoke invitation');
    }
  });
};

// ============================================================================
// Platform Subscription & Billing API Hooks
// ============================================================================

export const useSubscriptionQuery = (options = {}) => {
  return useQuery({
    queryKey: ['organizations', 'subscription'],
    queryFn: async () => {
      const response = await apiClient.get('/subscriptions/current');
      return response.data?.data || response.data;
    },
    staleTime: 1000 * 60 * 2,
    ...options
  });
};

export const useSubscriptionPlansQuery = (options = {}) => {
  return useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: async () => {
      const response = await apiClient.get('/subscriptions/plans');
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 60 * 10,
    ...options
  });
};

export const useUpgradeSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/subscriptions/upgrade', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'subscription'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', 'current'] });
      toast.success(
        'Subscription Upgraded',
        data?.message || 'Plan upgraded successfully in simulated billing mode.'
      );
    },
    onError: (error) => {
      toast.error('Upgrade Failed', error.apiMessage || 'Could not upgrade subscription');
    }
  });
};

export const useDowngradeSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/subscriptions/downgrade', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'subscription'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', 'current'] });
      toast.info(
        'Subscription Downgraded',
        data?.message || 'Plan downgrade processed successfully.'
      );
    },
    onError: (error) => {
      toast.error('Downgrade Failed', error.apiMessage || 'Could not downgrade subscription');
    }
  });
};

export const useCancelSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/subscriptions/cancel', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'subscription'] });
      toast.warning('Cancellation Scheduled', data?.message || 'Subscription marked for cancellation.');
    },
    onError: (error) => {
      toast.error('Cancellation Failed', error.apiMessage || 'Could not process cancellation');
    }
  });
};

export const useReactivateSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/subscriptions/reactivate', {});
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'subscription'] });
      toast.success('Subscription Resumed', data?.message || 'Subscription reactivated.');
    },
    onError: (error) => {
      toast.error('Reactivation Failed', error.apiMessage || 'Could not reactivate subscription');
    }
  });
};

// ============================================================================
// Super Admin Subscription Control Hooks
// ============================================================================

export const useSuperAdminSubscriptionsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['admin', 'subscriptions', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/subscriptions', { params: filters });
      return {
        data: response.data?.data || [],
        pagination: response.data?.pagination || {}
      };
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useSuperAdminSubscriptionMetricsQuery = (options = {}) => {
  return useQuery({
    queryKey: ['admin', 'subscriptions', 'metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/subscriptions/metrics');
      return response.data?.data || response.data;
    },
    staleTime: 1000 * 60,
    ...options
  });
};

export const useSuperAdminOverrideSubscriptionMutation = (orgId) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const targetId = payload.orgId || orgId;
      const response = await apiClient.patch(
        `/admin/subscriptions/organizations/${targetId}/override`,
        payload
      );
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', 'subscription'] });
      toast.success(
        'Override Applied',
        data?.message || 'Super Admin subscription override saved.'
      );
    },
    onError: (error) => {
      toast.error('Override Failed', error.apiMessage || 'Could not apply subscription override');
    }
  });
};

export const useSuperAdminUpdatePlanMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ tier, updates }) => {
      const response = await apiClient.put(`/admin/subscriptions/plans/${tier}`, updates);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
      toast.success('Plan Updated', 'Subscription plan configuration updated successfully.');
    },
    onError: (error) => {
      toast.error('Plan Update Failed', error.apiMessage || 'Could not update plan configuration');
    }
  });
};

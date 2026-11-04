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

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

export const useOrganizationMembersQuery = (orgId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.organizations.members(orgId),
    queryFn: async () => {
      if (!orgId) return [];
      const response = await apiClient.get(`/organizations/${orgId}/memberships`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(orgId),
    ...options
  });
};

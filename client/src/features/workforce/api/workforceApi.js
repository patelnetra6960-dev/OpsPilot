import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { useToast } from '../../../hooks/useToast.js';

export const useEmployeesQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.workforce.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/workforce', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 60,
    ...options
  });
};

export const useEmployeeDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.workforce.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/workforce/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useWorkforceStatsQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.workforce.stats(),
    queryFn: async () => {
      const response = await apiClient.get('/workforce/stats');
      return response.data?.data || response.data || {};
    },
    staleTime: 1000 * 60 * 2,
    ...options
  });
};

export const useCreateEmployeeMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/workforce', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (newEmployee) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workforce.all });
      toast.success(
        'Team Member Added',
        `"${newEmployee?.name || 'Employee'}" has joined the roster.`
      );
    },
    onError: (error) => {
      toast.error('Failed to Add Member', error.apiMessage || 'Could not create employee profile');
    }
  });
};

export const useUpdateEmployeeMutation = (id) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.patch(`/workforce/${id}`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workforce.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workforce.detail(id) });
      toast.success('Profile Updated', 'Employee details have been saved.');
    },
    onError: (error) => {
      toast.error('Update Failed', error.apiMessage || 'Could not update employee details');
    }
  });
};

export const useDeactivateEmployeeMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/workforce/${id}`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workforce.all });
      toast.warning('Employee Deactivated', 'The employee status has been updated.');
    },
    onError: (error) => {
      toast.error('Deactivation Failed', error.apiMessage || 'Could not deactivate employee');
    }
  });
};

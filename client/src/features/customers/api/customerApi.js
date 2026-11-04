import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { useToast } from '../../../hooks/useToast.js';

export const useCustomersQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/customers', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 60,
    ...options
  });
};

export const useCustomerDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/customers/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useCreateCustomerMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/customers', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (newCust) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Customer Created', `"${newCust?.name || 'Customer'}" added to directory.`);
    },
    onError: (error) => {
      toast.error('Failed to Create Customer', error.apiMessage || 'Could not register customer');
    }
  });
};

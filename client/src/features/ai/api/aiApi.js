import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { useToast } from '../../../hooks/useToast.js';

/**
 * Hook to retrieve standard prompt suggestions
 */
export const useAISuggestionsQuery = (options = {}) => {
  return useQuery({
    queryKey: ['ai', 'suggestions'],
    queryFn: async () => {
      const response = await apiClient.get('/ai/suggestions');
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes cache
    ...options
  });
};

/**
 * Hook to retrieve AI usage metrics and query logs
 */
export const useAIUsageQuery = (options = {}) => {
  return useQuery({
    queryKey: ['ai', 'usage'],
    queryFn: async () => {
      const response = await apiClient.get('/ai/usage');
      return response.data?.data || response.data || {};
    },
    staleTime: 1000 * 30,
    ...options
  });
};

/**
 * Mutation hook to execute natural-language queries
 */
export const useAIQueryMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ query, context = {} }) => {
      const response = await apiClient.post('/ai/query', { query, context });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'usage'] });
    },
    onError: (error) => {
      const msg = error.apiMessage || error.message || 'Could not process query';
      toast.error('AI Query Failed', msg);
    }
  });
};

export default {
  useAISuggestionsQuery,
  useAIUsageQuery,
  useAIQueryMutation
};

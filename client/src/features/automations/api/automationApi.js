import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';

export const useAutomationConfigQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.automations ? queryKeys.automations.config() : ['automations', 'config'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/automations/config');
      return response.data?.data || null;
    },
    staleTime: 60 * 1000,
    ...options
  });
};

export const useUpdateAutomationConfigMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.put('/api/v1/automations/config', payload);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.automations ? queryKeys.automations.all : ['automations']
      });
    }
  });
};

export const useQueueMetricsQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.automations ? queryKeys.automations.metrics() : ['automations', 'metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/automations/queue/metrics');
      return response.data?.data || null;
    },
    refetchInterval: 5000,
    ...options
  });
};

export const useJobHistoryQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.automations ? queryKeys.automations.jobs() : ['automations', 'jobs'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/automations/queue/jobs');
      return response.data?.data || { total: 0, jobs: [] };
    },
    refetchInterval: 5000,
    ...options
  });
};

export const useTriggerWorkflowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflow, options = {} }) => {
      const response = await apiClient.post('/api/v1/automations/trigger', { workflow, options });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.automations ? queryKeys.automations.jobs() : ['automations', 'jobs']
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.automations ? queryKeys.automations.metrics() : ['automations', 'metrics']
      });
    }
  });
};

export const useRetryJobMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId) => {
      const response = await apiClient.post(`/api/v1/automations/queue/jobs/${jobId}/retry`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.automations ? queryKeys.automations.all : ['automations']
      });
    }
  });
};

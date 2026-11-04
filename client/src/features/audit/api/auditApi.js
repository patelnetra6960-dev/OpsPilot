import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';

export const useAuditLogsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.audit.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/audit', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30, // 30-second stale time for audit trails
    ...options
  });
};

import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';

/**
 * Fetch organization executive analytics and KPIs
 */
export const useOrganizationAnalyticsQuery = (filters = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.organization(filters),
    queryFn: async () => {
      const response = await apiClient.get('/analytics/organization', { params: filters });
      return response.data.data;
    },
    staleTime: 1000 * 60 * 2 // 2 minutes fresh
  });
};

/**
 * Fetch manager team productivity, workload, and overdue tasks telemetry
 */
export const useManagerAnalyticsQuery = (filters = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.manager(filters),
    queryFn: async () => {
      const response = await apiClient.get('/analytics/manager', { params: filters });
      return response.data.data;
    },
    staleTime: 1000 * 60 * 2
  });
};

/**
 * Fetch platform-wide Super Admin analytics
 */
export const useSuperAdminAnalyticsQuery = (filters = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.platform(filters),
    queryFn: async () => {
      const response = await apiClient.get('/analytics/platform', { params: filters });
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5
  });
};

/**
 * Download analytics report in CSV format
 */
export const downloadAnalyticsReport = async (options = {}) => {
  const { type = 'executive', range = '30d' } = options;
  const response = await apiClient.get('/analytics/export', {
    params: { type, range, format: 'csv' },
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `opspilot-${type}-analytics-${range}-${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

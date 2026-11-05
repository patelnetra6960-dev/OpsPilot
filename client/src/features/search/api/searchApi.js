import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { useToast } from '../../../hooks/useToast.js';

export const useGlobalSearchQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.search.results(filters),
    queryFn: async () => {
      const response = await apiClient.get('/search', { params: filters });
      return {
        data: response.data?.data || [],
        pagination: response.data?.pagination || {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
    },
    staleTime: 1000 * 15,
    ...options
  });
};

export const downloadCsvFile = (content, filename) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const useExportDataMutation = () => {
  const toast = useToast();

  return useMutation({
    mutationFn: async (exportOptions) => {
      const response = await apiClient.post('/export', exportOptions, {
        responseType: exportOptions.format === 'json' ? 'json' : 'text'
      });

      if (exportOptions.format === 'json') {
        return response.data;
      }

      // Extract filename from Content-Disposition header if available
      const contentDisposition = response.headers?.['content-disposition'] || '';
      let filename = `${exportOptions.entity || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
      const match = contentDisposition.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) {
        filename = match[1];
      }

      downloadCsvFile(response.data, filename);
      return { success: true, filename };
    },
    onSuccess: (data) => {
      toast.success(`Data exported successfully: ${data.filename || 'Downloaded'}`);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Export failed';
      toast.error(msg);
    }
  });
};

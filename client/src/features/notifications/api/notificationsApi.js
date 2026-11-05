import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';

/**
 * Fetch paginated notification history for the authenticated user
 */
export const useNotificationsQuery = (filters = {}) => {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/notifications', { params: filters });
      return response.data.data;
    },
    refetchInterval: 60000 // Fallback poll every 60s if socket drops
  });
};

/**
 * Fetch live unread notifications count
 */
export const useUnreadCountQuery = () => {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data.data?.unreadCount || 0;
    },
    refetchInterval: 30000
  });
};

/**
 * Mark a single notification as read
 */
export const useMarkReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.patch(`/notifications/${id}/read`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    }
  });
};

/**
 * Mark all notifications as read
 */
export const useMarkAllReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/notifications/mark-all-read');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    }
  });
};

/**
 * Delete a notification
 */
export const useDeleteNotificationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/notifications/${id}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    }
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { useToast } from '../../../hooks/useToast.js';

export const useTasksQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/tasks', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useTaskDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/tasks/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/tasks', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success('Task Created', `"${newTask?.title || 'Task'}" has been added to the board.`);
    },
    onError: (error) => {
      toast.error('Task Creation Failed', error.apiMessage || 'Could not create task');
    }
  });
};

export const useUpdateTaskMutation = (id) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.patch(`/tasks/${id}`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
      toast.success('Task Updated', 'Task attributes successfully saved.');
    },
    onError: (error) => {
      toast.error('Update Failed', error.apiMessage || 'Could not update task');
    }
  });
};

/**
 * Transition task Kanban column status with optimistic UI update and server validation rollback
 */
export const useTransitionTaskStatusMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ taskId, columnName }) => {
      const response = await apiClient.patch(`/tasks/${taskId}/status`, {
        column_name: columnName
      });
      return response.data?.data || response.data;
    },
    onMutate: async ({ taskId, columnName }) => {
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

      // Snapshot previous tasks cache
      const previousQueries = queryClient.getQueriesData({
        queryKey: queryKeys.tasks.all
      });

      // Optimistically update all matching task lists
      queryClient.setQueriesData({ queryKey: queryKeys.tasks.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((task) =>
          task.id === taskId ? { ...task, column_name: columnName, column: columnName } : task
        );
      });

      return { previousQueries };
    },
    onError: (error, variables, context) => {
      // Rollback to snapshot on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(
        'Status Transition Rejected',
        error.apiMessage || 'Server rejected the status transition'
      );
    },
    onSettled: () => {
      // Sync cache with server truth
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    }
  });
};

export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/tasks/${id}`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.info('Task Archived', 'Task has been safely removed.');
    },
    onError: (error) => {
      toast.error('Action Failed', error.apiMessage || 'Could not delete task');
    }
  });
};

export const useTaskAssignmentsQuery = (taskId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.assignments(taskId),
    queryFn: async () => {
      if (!taskId) return [];
      const response = await apiClient.get(`/tasks/${taskId}/assignments`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(taskId),
    ...options
  });
};

export const useAssignTaskMutation = (taskId) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (workforceMemberId) => {
      const response = await apiClient.post(`/tasks/${taskId}/assignments`, {
        workforce_member_id: workforceMemberId
      });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assignments(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success('Task Assigned', 'Crew member assigned to task.');
    },
    onError: (error) => {
      toast.error('Assignment Failed', error.apiMessage || 'Could not assign crew member');
    }
  });
};

export const useTaskCommentsQuery = (taskId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.comments(taskId),
    queryFn: async () => {
      if (!taskId) return [];
      const response = await apiClient.get(`/tasks/${taskId}/comments`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(taskId),
    ...options
  });
};

export const useAddTaskCommentMutation = (taskId) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(`/tasks/${taskId}/comments`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success('Comment Posted', 'Comment added to task discussion.');
    },
    onError: (error) => {
      toast.error('Comment Failed', error.apiMessage || 'Could not submit comment');
    }
  });
};

export const useTaskAttachmentsQuery = (taskId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.attachments(taskId),
    queryFn: async () => {
      if (!taskId) return [];
      const response = await apiClient.get(`/tasks/${taskId}/attachments`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(taskId),
    ...options
  });
};

export const useAddTaskAttachmentMutation = (taskId) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(`/tasks/${taskId}/attachments`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.attachments(taskId) });
      toast.success('Attachment Added', 'File attached to task.');
    },
    onError: (error) => {
      toast.error('Upload Failed', error.apiMessage || 'Could not attach file');
    }
  });
};

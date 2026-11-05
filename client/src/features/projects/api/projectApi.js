import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { useToast } from '../../../hooks/useToast.js';

export const useProjectsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/projects', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 60,
    ...options
  });
};

export const useProjectDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/projects/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/projects', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(
        'Project Initiated',
        `"${newProject?.name || 'Project'}" has been established successfully.`
      );
    },
    onError: (error) => {
      toast.error('Project Creation Failed', error.apiMessage || 'Could not initiate project');
    }
  });
};

export const useUpdateProjectMutation = (id) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.patch(`/projects/${id}`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
      toast.success('Project Updated', 'Project details and milestones saved successfully.');
    },
    onError: (error) => {
      toast.error('Update Failed', error.apiMessage || 'Could not update project');
    }
  });
};

export const useDeleteProjectMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/projects/${id}`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.info('Project Archived', 'The project has been safely removed.');
    },
    onError: (error) => {
      toast.error('Action Failed', error.apiMessage || 'Could not remove project');
    }
  });
};

export const useProjectMembersQuery = (projectId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.projects.members(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const response = await apiClient.get(`/projects/${projectId}/members`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(projectId),
    ...options
  });
};

export const useAddProjectMemberMutation = (projectId) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(`/projects/${projectId}/members`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      toast.success('Member Assigned', 'Team member added to project roster.');
    },
    onError: (error) => {
      toast.error('Assignment Failed', error.apiMessage || 'Could not assign team member');
    }
  });
};

export const useRemoveProjectMemberMutation = (projectId) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (memberId) => {
      const response = await apiClient.delete(`/projects/${projectId}/members/${memberId}`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      toast.info('Member Removed', 'Team member detached from project roster.');
    },
    onError: (error) => {
      toast.error('Action Failed', error.apiMessage || 'Could not remove team member');
    }
  });
};

export const useProjectMilestonesQuery = (projectId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.projects.milestones(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const response = await apiClient.get(`/projects/${projectId}/milestones`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(projectId),
    ...options
  });
};

export const useAddProjectMilestoneMutation = (projectId) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(`/projects/${projectId}/milestones`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.milestones(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success('Milestone Scheduled', 'New project delivery milestone recorded.');
    },
    onError: (error) => {
      toast.error('Milestone Failed', error.apiMessage || 'Could not add milestone');
    }
  });
};

export const useUpdateProjectMilestoneMutation = (projectId) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ milestoneId, updates }) => {
      const response = await apiClient.patch(
        `/projects/${projectId}/milestones/${milestoneId}`,
        updates
      );
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.milestones(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      const isComplete = data?.status === 'completed';
      toast.success(
        isComplete ? 'Milestone Completed' : 'Milestone Updated',
        `Milestone "${data?.title || ''}" updated.`
      );
    },
    onError: (error) => {
      toast.error('Update Failed', error.apiMessage || 'Could not update milestone');
    }
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { useToast } from '../../../hooks/useToast.js';

// ========================================================
// 1. Service Requests Queries & Mutations
// ========================================================

export const useServiceRequestsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.serviceRequests.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/service-requests', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useServiceRequestDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.serviceRequests.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/service-requests/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useCreateServiceRequestMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/service-requests', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (newReq) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceRequests.all });
      toast.success(
        'Request Logged',
        `Service request "${newReq?.request_code || newReq?.title}" submitted.`
      );
    },
    onError: (error) => {
      toast.error('Submission Failed', error.apiMessage || 'Could not log request');
    }
  });
};

export const useReviewServiceRequestMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, manager_notes }) => {
      const response = await apiClient.post(`/service-requests/${id}/review`, { manager_notes });
      return response.data?.data || response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceRequests.detail(updated?.id) });
      toast.success('Moved to Review', `Request marked as in-review.`);
    },
    onError: (error) => {
      toast.error('Review Action Failed', error.apiMessage || 'Could not update status');
    }
  });
};

export const useApproveServiceRequestMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, manager_notes }) => {
      const response = await apiClient.post(`/service-requests/${id}/approve`, { manager_notes });
      return response.data?.data || response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceRequests.detail(updated?.id) });
      toast.success('Request Approved', `Approved for work order generation.`);
    },
    onError: (error) => {
      toast.error('Approval Failed', error.apiMessage || 'Could not approve request');
    }
  });
};

export const useRejectServiceRequestMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, rejection_reason }) => {
      const response = await apiClient.post(`/service-requests/${id}/reject`, { rejection_reason });
      return response.data?.data || response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceRequests.detail(updated?.id) });
      toast.warning('Request Rejected', `Request rejected with stated reason.`);
    },
    onError: (error) => {
      toast.error('Rejection Action Failed', error.apiMessage || 'Could not reject request');
    }
  });
};

export const useConvertServiceRequestMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await apiClient.post(
        `/service-requests/${id}/convert-to-work-order`,
        payload
      );
      return response.data?.data || response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      toast.success(
        'Work Order Generated',
        `Dispatched as ${result?.workOrder?.work_order_code || 'Work Order'}.`
      );
    },
    onError: (error) => {
      toast.error('Conversion Failed', error.apiMessage || 'Could not convert to work order');
    }
  });
};

// ========================================================
// 2. Work Orders Queries & Mutations
// ========================================================

export const useWorkOrdersQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.workOrders.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/work-orders', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useWorkOrderDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.workOrders.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/work-orders/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useCreateWorkOrderMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/work-orders', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (newWo) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      toast.success(
        'Work Order Created',
        `Work order ${newWo?.work_order_code || newWo?.title} added.`
      );
    },
    onError: (error) => {
      toast.error('Creation Failed', error.apiMessage || 'Could not create work order');
    }
  });
};

export const useAssignTechnicianMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await apiClient.post(`/work-orders/${id}/assign`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(updated?.id) });
      toast.success(
        'Technician Assigned',
        `Assigned to ${updated?.assigned_technician || 'Technician'}.`
      );
    },
    onError: (error) => {
      toast.error('Assignment Failed', error.apiMessage || 'Could not assign technician');
    }
  });
};

export const useScheduleWorkOrderMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await apiClient.post(`/work-orders/${id}/schedule`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(updated?.id) });
      toast.success('Scheduled', `Work execution window updated.`);
    },
    onError: (error) => {
      toast.error('Scheduling Failed', error.apiMessage || 'Could not schedule work order');
    }
  });
};

export const useChangeWorkOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, status, reason }) => {
      const response = await apiClient.post(`/work-orders/${id}/status`, { status, reason });
      return response.data?.data || response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(updated?.id) });
      toast.success('Status Updated', `Work order moved to ${updated?.status}.`);
    },
    onError: (error) => {
      toast.error('Status Change Error', error.apiMessage || 'Could not update status');
    }
  });
};

export const useAddChecklistMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, item_text }) => {
      const response = await apiClient.post(`/work-orders/${id}/checklists`, { item_text });
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      toast.success('Checklist Added', 'Item added to work order checklist.');
    },
    onError: (error) => {
      toast.error('Checklist Error', error.apiMessage || 'Could not add checklist item');
    }
  });
};

export const useToggleChecklistMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, itemId, is_completed }) => {
      const response = await apiClient.patch(`/work-orders/${id}/checklists/${itemId}`, {
        is_completed
      });
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
    }
  });
};

export const useDeleteChecklistMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, itemId }) => {
      const response = await apiClient.delete(`/work-orders/${id}/checklists/${itemId}`);
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      toast.info('Item Removed', 'Checklist task removed.');
    }
  });
};

export const useAddJobNoteMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, note, is_internal }) => {
      const response = await apiClient.post(`/work-orders/${id}/notes`, { note, is_internal });
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(variables.id) });
      toast.success('Job Note Logged', 'Field note added to job log.');
    },
    onError: (error) => {
      toast.error('Failed to Add Note', error.apiMessage || 'Could not record note');
    }
  });
};

export const useAddPhotoMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, type, url, caption }) => {
      const response = await apiClient.post(`/work-orders/${id}/photos`, { type, url, caption });
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(variables.id) });
      toast.success(
        'Photo Uploaded',
        `${variables.type === 'before' ? 'Before' : 'After'} photograph saved.`
      );
    },
    onError: (error) => {
      toast.error('Upload Error', error.apiMessage || 'Could not save photograph');
    }
  });
};

export const useCompleteWorkOrderMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await apiClient.post(`/work-orders/${id}/complete`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(updated?.id) });
      toast.success('Work Completed', 'Marked as completed and ready for customer signoff.');
    },
    onError: (error) => {
      toast.error('Completion Error', error.apiMessage || 'Could not mark work order as completed');
    }
  });
};

export const useConfirmWorkOrderMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await apiClient.post(`/work-orders/${id}/confirm`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(updated?.id) });
      toast.success('Signoff Recorded', 'Customer signature and feedback confirmed.');
    },
    onError: (error) => {
      toast.error('Confirmation Error', error.apiMessage || 'Could not record customer signoff');
    }
  });
};

export const useCloseWorkOrderMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, closing_notes }) => {
      const response = await apiClient.post(`/work-orders/${id}/close`, { closing_notes });
      return response.data?.data || response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.detail(updated?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceRequests.all });
      toast.success('Work Order Closed', 'Official closure recorded and linked request archived.');
    },
    onError: (error) => {
      toast.error('Close Error', error.apiMessage || 'Could not close work order');
    }
  });
};

export const useDeleteWorkOrderMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/work-orders/${id}`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
      toast.info('Work Order Archived', 'Work order removed.');
    },
    onError: (error) => {
      toast.error('Delete Failed', error.apiMessage || 'Could not delete work order');
    }
  });
};

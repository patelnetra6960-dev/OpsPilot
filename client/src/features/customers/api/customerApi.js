import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { useToast } from '../../../hooks/useToast.js';

// ========================================================
// 1. CRM & Internal Customers Management Queries & Mutations
// ========================================================

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
      toast.success('Customer Created', `"${newCust?.name || 'Customer'}" added to CRM directory.`);
    },
    onError: (error) => {
      toast.error('Failed to Create Customer', error.apiMessage || 'Could not register customer');
    }
  });
};

export const useUpdateCustomerMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await apiClient.patch(`/customers/${id}`, updates);
      return response.data?.data || response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(updated?.id) });
      toast.success('Customer Updated', `Profile for "${updated?.name}" updated successfully.`);
    },
    onError: (error) => {
      toast.error('Update Failed', error.apiMessage || 'Could not update customer');
    }
  });
};

export const useDeleteCustomerMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/customers/${id}`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Customer Removed', 'Customer account archived successfully.');
    },
    onError: (error) => {
      toast.error('Delete Failed', error.apiMessage || 'Could not remove customer');
    }
  });
};

export const useCustomerNotesQuery = (customerId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.customers.notes(customerId),
    queryFn: async () => {
      if (!customerId) return [];
      const response = await apiClient.get(`/customers/${customerId}/notes`);
      return response.data?.data || [];
    },
    enabled: Boolean(customerId),
    ...options
  });
};

export const useAddCustomerNoteMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ customerId, note }) => {
      const response = await apiClient.post(`/customers/${customerId}/notes`, { note });
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.notes(variables.customerId)
      });
      toast.success('Note Added', 'Internal note logged successfully.');
    },
    onError: (error) => {
      toast.error('Failed to Add Note', error.apiMessage || 'Could not save note');
    }
  });
};

export const useCustomerHistoryQuery = (customerId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.customers.history(customerId),
    queryFn: async () => {
      if (!customerId) return [];
      const response = await apiClient.get(`/customers/${customerId}/history`);
      return response.data?.data || [];
    },
    enabled: Boolean(customerId),
    ...options
  });
};

export const useUpdateCustomerFollowUpMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ customerId, data }) => {
      const response = await apiClient.patch(`/customers/${customerId}/follow-up`, data);
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId)
      });
      toast.success('Follow-Up Scheduled', 'Lead stage and follow-up timeline updated.');
    },
    onError: (error) => {
      toast.error('Follow-Up Update Failed', error.apiMessage || 'Could not update follow-up');
    }
  });
};

// ========================================================
// 2. Customer Portal Queries & Mutations (Self-Service)
// ========================================================

export const useCustomerPortalOverviewQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.customerPortal.overview(),
    queryFn: async () => {
      const response = await apiClient.get('/customer/portal');
      return response.data?.data || response.data;
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useCustomerProfileQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.customerPortal.profile(),
    queryFn: async () => {
      const response = await apiClient.get('/customer/profile');
      return response.data?.data || response.data;
    },
    staleTime: 1000 * 60,
    ...options
  });
};

export const useUpdateCustomerProfileMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.patch('/customer/profile', payload);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerPortal.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerPortal.overview() });
      toast.success('Profile Updated', 'Contact information saved successfully.');
    },
    onError: (error) => {
      toast.error('Update Failed', error.apiMessage || 'Could not update profile');
    }
  });
};

export const useCustomerServiceRequestsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.customerPortal.serviceRequests(filters),
    queryFn: async () => {
      const response = await apiClient.get('/customer/service-requests', { params: filters });
      return response.data?.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useCustomerServiceRequestDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.customerPortal.serviceRequestDetail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/customer/service-requests/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useCreateCustomerServiceRequestMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/customer/service-requests', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (newReq) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerPortal.all });
      toast.success(
        'Service Request Submitted',
        `Request "${newReq?.request_code || newReq?.title}" dispatched to operations.`
      );
    },
    onError: (error) => {
      toast.error('Submission Failed', error.apiMessage || 'Could not submit service request');
    }
  });
};

export const useSubmitCustomerFeedbackMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ requestId, rating, comments }) => {
      const response = await apiClient.post(`/customer/service-requests/${requestId}/feedback`, {
        rating,
        comments
      });
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerPortal.serviceRequestDetail(variables.requestId)
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerPortal.overview() });
      toast.success('Feedback Submitted', 'Thank you for your rating and review.');
    },
    onError: (error) => {
      toast.error('Feedback Error', error.apiMessage || 'Could not save feedback');
    }
  });
};

export const useCustomerProjectsQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.customerPortal.projects(),
    queryFn: async () => {
      const response = await apiClient.get('/customer/projects');
      return response.data?.data || [];
    },
    staleTime: 1000 * 60,
    ...options
  });
};

export const useCustomerInvoicesQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.customerPortal.invoices(),
    queryFn: async () => {
      const response = await apiClient.get('/customer/invoices');
      return response.data?.data || [];
    },
    staleTime: 1000 * 60,
    ...options
  });
};

export const useCustomerInvoiceDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.customerPortal.invoiceDetail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/customer/invoices/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

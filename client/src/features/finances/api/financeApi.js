import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { useToast } from '../../../hooks/useToast.js';

// ========================================================
// 1. Expenses Queries & Mutations
// ========================================================

export const useExpensesQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/expenses', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useExpenseStatsQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.expenses.stats(),
    queryFn: async () => {
      const response = await apiClient.get('/expenses/stats');
      return response.data?.data || response.data || {};
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useExpenseDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.expenses.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/expenses/${id}`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useExpenseHistoryQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.expenses.history(id),
    queryFn: async () => {
      if (!id) return [];
      const response = await apiClient.get(`/expenses/${id}/history`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useSubmitExpenseMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/expenses', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      toast.success(
        'Expense Submitted',
        `Claim ${data?.claim_code || ''} submitted for manager review`
      );
    },
    onError: (err) => {
      toast.error('Submission Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useApproveExpenseMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, notes }) => {
      const response = await apiClient.post(`/expenses/${id}/approve`, { notes });
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      toast.success('Claim Approved', `Claim ${data?.claim_code || ''} approved for reimbursement`);
    },
    onError: (err) => {
      toast.error('Approval Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useRejectExpenseMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, rejection_reason }) => {
      const response = await apiClient.post(`/expenses/${id}/reject`, { rejection_reason });
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      toast.warning('Claim Rejected', `Claim ${data?.claim_code || ''} returned with feedback`);
    },
    onError: (err) => {
      toast.error('Rejection Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useReimburseExpenseMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, notes }) => {
      const response = await apiClient.post(`/expenses/${id}/reimburse`, { notes });
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      toast.success('Claim Reimbursed', `Claim ${data?.claim_code || ''} marked as reimbursed`);
    },
    onError: (err) => {
      toast.error('Reimbursement Failed', err.response?.data?.message || err.message);
    }
  });
};

// ========================================================
// 2. Invoices & Payments Queries & Mutations
// ========================================================

export const useInvoicesQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/invoices', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useInvoiceStatsQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.invoices.stats(),
    queryFn: async () => {
      const response = await apiClient.get('/invoices/stats');
      return response.data?.data || response.data || {};
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useInvoiceDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/invoices/${id}`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useInvoicePdfQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.invoices.pdf(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/invoices/${id}/pdf`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useCreateInvoiceMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/invoices', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      toast.success(
        'Invoice Generated',
        `Invoice ${data?.invoice_number || ''} created for $${Number(data?.total || 0).toFixed(2)}`
      );
    },
    onError: (err) => {
      toast.error('Invoice Creation Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useRecordPaymentMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ invoiceId, paymentData }) => {
      const response = await apiClient.post(`/invoices/${invoiceId}/payments`, paymentData);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      toast.success(
        'Payment Recorded',
        `$${Number(data?.payment?.amount || 0).toFixed(2)} recorded. New balance: $${Number(data?.invoice?.balance_due || 0).toFixed(2)}`
      );
    },
    onError: (err) => {
      toast.error('Payment Recording Failed', err.response?.data?.message || err.message);
    }
  });
};

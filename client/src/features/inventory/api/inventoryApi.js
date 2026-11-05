import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { useToast } from '../../../hooks/useToast.js';

// ========================================================
// 1. Inventory Items & Stock Control Queries & Mutations
// ========================================================

export const useInventoryItemsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.inventory.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/inventory', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useInventoryStatsQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.inventory.stats(),
    queryFn: async () => {
      const response = await apiClient.get('/inventory/stats');
      return response.data?.data || response.data || {};
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useLowStockQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.inventory.lowStock(),
    queryFn: async () => {
      const response = await apiClient.get('/inventory/low-stock');
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useInventoryItemDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.inventory.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/inventory/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useStockTransactionsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.inventory.transactions(filters),
    queryFn: async () => {
      const endpoint = filters?.itemId
        ? `/inventory/${filters.itemId}/transactions`
        : '/inventory/transactions';
      const response = await apiClient.get(endpoint, { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 20,
    ...options
  });
};

export const useCreateInventoryItemMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/inventory', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Inventory Item Added', `SKU ${item?.sku} registered in warehouse registry.`);
    },
    onError: (err) => {
      toast.error('Failed to Add Item', err.response?.data?.message || err.message);
    }
  });
};

export const useStockInMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiClient.post(`/inventory/${id}/stock-in`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success(
        'Stock Received',
        `Added ${data?.transaction?.quantity} units to SKU ${data?.item?.sku}. New stock: ${data?.item?.in_stock}.`
      );
    },
    onError: (err) => {
      toast.error('Stock-In Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useStockOutMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiClient.post(`/inventory/${id}/stock-out`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success(
        'Stock Dispatched',
        `Dispatched ${data?.transaction?.quantity} units of SKU ${data?.item?.sku}. Remaining stock: ${data?.item?.in_stock}.`
      );
    },
    onError: (err) => {
      toast.error('Stock-Out Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useAdjustStockMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiClient.post(`/inventory/${id}/adjust`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success(
        'Stock Reconciled',
        `Stock for SKU ${data?.item?.sku} adjusted to ${data?.item?.in_stock} units.`
      );
    },
    onError: (err) => {
      toast.error('Adjustment Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useDeleteInventoryItemMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/inventory/${id}`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Item Deleted', 'Inventory item removed from active catalog.');
    },
    onError: (err) => {
      toast.error('Failed to Delete Item', err.response?.data?.message || err.message);
    }
  });
};

// ========================================================
// 2. Physical Assets Queries & Mutations
// ========================================================

export const useAssetsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.assets.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/assets', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useAssetStatsQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.assets.stats(),
    queryFn: async () => {
      const response = await apiClient.get('/assets/stats');
      return response.data?.data || response.data || {};
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useAssetDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.assets.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/assets/${id}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(id),
    ...options
  });
};

export const useCreateAssetMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/assets', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      toast.success('Asset Registered', `Asset ${asset?.asset_tag} (${asset?.name}) registered.`);
    },
    onError: (err) => {
      toast.error('Asset Registration Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useAssignAssetMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiClient.post(`/assets/${id}/assign`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      toast.success(
        'Asset Assigned',
        `Assigned ${asset?.asset_tag} to ${asset?.assigned_to_name || 'technician'}.`
      );
    },
    onError: (err) => {
      toast.error('Assignment Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useUpdateAssetStatusMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiClient.post(`/assets/${id}/status`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      toast.success(
        'Asset Status Updated',
        `${asset?.asset_tag} status changed to ${asset?.status}.`
      );
    },
    onError: (err) => {
      toast.error('Status Update Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useAddMaintenanceLogMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiClient.post(`/assets/${id}/maintenance`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      toast.success('Maintenance Logged', `Service event recorded for asset ${asset?.asset_tag}.`);
    },
    onError: (err) => {
      toast.error('Maintenance Log Failed', err.response?.data?.message || err.message);
    }
  });
};

// ========================================================
// 3. Suppliers & Purchase Orders Queries & Mutations
// ========================================================

export const useSuppliersQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.suppliers.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/suppliers', { params: filters });
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useSupplierStatsQuery = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.suppliers.stats(),
    queryFn: async () => {
      const response = await apiClient.get('/suppliers/stats');
      return response.data?.data || response.data || {};
    },
    staleTime: 1000 * 30,
    ...options
  });
};

export const useSupplierPurchasesQuery = (supplierId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.suppliers.purchases(supplierId),
    queryFn: async () => {
      const response = await apiClient.get(`/suppliers/${supplierId}/purchases`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(supplierId),
    staleTime: 1000 * 20,
    ...options
  });
};

export const useCreateSupplierMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/suppliers', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toast.success('Supplier Added', `Vendor ${supplier?.name} (${supplier?.code}) registered.`);
    },
    onError: (err) => {
      toast.error('Supplier Creation Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useCreatePurchaseOrderMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ supplierId, ...payload }) => {
      const response = await apiClient.post(`/suppliers/${supplierId}/purchases`, payload);
      return response.data?.data || response.data;
    },
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toast.success(
        'Purchase Order Created',
        `PO ${po?.po_number} created with total value $${po?.total_amount?.toFixed(2)}.`
      );
    },
    onError: (err) => {
      toast.error('PO Creation Failed', err.response?.data?.message || err.message);
    }
  });
};

export const useReceivePurchaseOrderMutation = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (poId) => {
      const response = await apiClient.post(`/suppliers/purchases/${poId}/receive`);
      return response.data?.data || response.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success(
        'PO Received & Stock Updated',
        `Purchase order ${res?.purchaseOrder?.po_number} received. Warehouse stock replenished.`
      );
    },
    onError: (err) => {
      toast.error('PO Receipt Failed', err.response?.data?.message || err.message);
    }
  });
};

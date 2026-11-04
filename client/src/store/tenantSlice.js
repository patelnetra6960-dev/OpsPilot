import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient.js';

export const fetchMyOrganizations = createAsyncThunk(
  'tenant/fetchMyOrganizations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/organizations/my');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch organizations');
    }
  }
);

const savedTenantId = localStorage.getItem('opspilot_active_tenant_id') || '11111111-1111-1111-1111-111111111111';

const defaultInitialTenant = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Acme Logistics Global',
  slug: 'acme-logistics',
  subscription_tier: 'enterprise',
  role: 'owner'
};

const tenantSlice = createSlice({
  name: 'tenant',
  initialState: {
    currentTenant: defaultInitialTenant,
    availableTenants: [defaultInitialTenant],
    isLoading: false,
    error: null
  },
  reducers: {
    setCurrentTenant: (state, action) => {
      state.currentTenant = action.payload;
      if (action.payload?.id) {
        localStorage.setItem('opspilot_active_tenant_id', action.payload.id);
      }
    },
    setAvailableTenants: (state, action) => {
      state.availableTenants = action.payload;
      // Auto-select if current tenant is not in available list
      if (!state.currentTenant || !action.payload.some((t) => t.id === state.currentTenant.id)) {
        if (action.payload.length > 0) {
          state.currentTenant = action.payload[0];
          localStorage.setItem('opspilot_active_tenant_id', action.payload[0].id);
        }
      }
    },
    clearTenant: (state) => {
      state.currentTenant = null;
      state.availableTenants = [];
      localStorage.removeItem('opspilot_active_tenant_id');
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrganizations.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMyOrganizations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableTenants = action.payload;
        // Keep active selection or match saved
        const matched = action.payload.find((t) => t.id === savedTenantId) || action.payload[0];
        if (matched) {
          state.currentTenant = matched;
          localStorage.setItem('opspilot_active_tenant_id', matched.id);
        }
      })
      .addCase(fetchMyOrganizations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { setCurrentTenant, setAvailableTenants, clearTenant } = tenantSlice.actions;
export default tenantSlice.reducer;

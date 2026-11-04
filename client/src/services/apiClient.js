import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach Supabase JWT and Active Tenant Header
apiClient.interceptors.request.use(
  (config) => {
    // Read auth token from localStorage / Redux store
    const token = localStorage.getItem('opspilot_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Read active organization ID from localStorage / Redux store
    const activeTenantId = localStorage.getItem('opspilot_active_tenant_id');
    if (activeTenantId) {
      config.headers['X-Tenant-Id'] = activeTenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired or unauthorized. Redirecting to login.');
      // Optional: clear credentials if invalidated
    } else if (error.response?.status === 403) {
      console.warn('Cross-tenant or permission breach rejected by backend:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export default apiClient;

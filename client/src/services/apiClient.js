import axios from 'axios';

// API versioning default is /api/v1 (aliased also by /api on server)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  timeout: 30000 // 30-second timeout
});

// Safe UUID generator for correlation IDs without Node crypto dependencies in browser
function generateCorrelationId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
}

// Request Interceptor: Attach Supabase JWT, Active Tenant Header and Correlation ID
apiClient.interceptors.request.use(
  (config) => {
    // 1. Attach Request Correlation ID for full end-to-end audit tracing
    if (!config.headers['X-Correlation-ID']) {
      config.headers['X-Correlation-ID'] = generateCorrelationId();
    }

    // 2. Read auth token from localStorage
    let token = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('opspilot_auth_token');
      if (!token) {
        // Fallback for development persona mode
        token = 'mock-token-alex';
        localStorage.setItem('opspilot_auth_token', token);
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 3. Read active organization tenant ID
    let activeTenantId = null;
    if (typeof window !== 'undefined') {
      activeTenantId = localStorage.getItem('opspilot_active_tenant_id');
      if (!activeTenantId) {
        activeTenantId = '11111111-1111-1111-1111-111111111111';
        localStorage.setItem('opspilot_active_tenant_id', activeTenantId);
      }
    }
    if (activeTenantId) {
      config.headers['X-Tenant-Id'] = activeTenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized error handling and structured diagnostics
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const correlationId =
      error.response?.headers?.['x-correlation-id'] || error.config?.headers?.['X-Correlation-ID'];

    // Normalize error message from standardized backend response: { success: false, error: { message, code } }
    const message =
      errorData?.error?.message ||
      errorData?.message ||
      error.message ||
      'An unexpected error occurred';

    error.apiMessage = message;
    error.correlationId = correlationId;
    error.statusCode = status;

    if (status === 401) {
      console.warn(`[API 401] Unauthorized or session expired. Correlation: ${correlationId}`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('opspilot:auth-expired', {
            detail: { message, correlationId }
          })
        );
      }
    } else if (status === 403) {
      console.warn(`[API 403] Access forbidden or cross-tenant policy violation.`, {
        correlationId,
        details: errorData
      });
    } else if (status === 429) {
      console.warn(`[API 429] Rate limit reached. Slow down requests.`, { correlationId });
    }

    return Promise.reject(error);
  }
);

export default apiClient;

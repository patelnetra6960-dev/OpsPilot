import apiClient from './apiClient.js';
import { supabase } from './supabaseClient.js';

// Assert frontend NEVER contains or accesses service-role keys
if (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'CRITICAL SECURITY VIOLATION: Supabase Service Role Key detected in frontend bundle! ' +
      'Service-role credentials must strictly reside on the backend server.'
  );
}

export const authService = {
  /**
   * Register a new user and provision their initial tenant organization
   */
  async register({
    email,
    password,
    fullName,
    organizationName = 'My Organization',
    subscriptionTier = 'starter'
  }) {
    // If Supabase client is actively configured, register via Supabase Auth
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            organization_name: organizationName
          }
        }
      });

      if (error) {
        const err = new Error(error.message);
        err.statusCode = error.status || 400;
        throw err;
      }

      // Also invoke backend registration endpoint to initialize database profile and organization tenancy
      try {
        const backendRes = await apiClient.post('/auth/register', {
          email,
          password,
          full_name: fullName,
          organization_name: organizationName,
          subscription_tier: subscriptionTier
        });
        return backendRes.data?.data || backendRes.data;
      } catch {
        // Return Supabase response if backend already synchronized via webhook/trigger
        return {
          user: data.user,
          session: data.session,
          message: 'Account created. Please verify your email if required.'
        };
      }
    }

    // Standard backend REST API registration (Mock or production proxy)
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      full_name: fullName,
      organization_name: organizationName,
      subscription_tier: subscriptionTier
    });
    return response.data?.data || response.data;
  },

  /**
   * Authenticate user with email and password
   */
  async login({ email, password }) {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        const err = new Error(error.message);
        err.statusCode = error.status || 401;
        throw err;
      }

      // Sync verified token to apiClient
      if (data.session?.access_token) {
        localStorage.setItem('opspilot_auth_token', data.session.access_token);
      }

      // Fetch complete user profile and organization memberships from backend
      try {
        const meRes = await apiClient.get('/auth/me');
        const user = meRes.data?.data || meRes.data;
        const orgRes = await apiClient.get('/organizations/my');
        const organizations = orgRes.data?.data || orgRes.data || [];
        return {
          user: { ...data.user, ...user },
          session: data.session,
          organizations,
          activeOrganization: organizations[0] || null
        };
      } catch {
        return {
          user: data.user,
          session: data.session,
          organizations: [],
          activeOrganization: null
        };
      }
    }

    // Standard backend REST API login
    const response = await apiClient.post('/auth/login', { email, password });
    const payload = response.data?.data || response.data;
    if (payload.session?.access_token) {
      localStorage.setItem('opspilot_auth_token', payload.session.access_token);
    }
    return payload;
  },

  /**
   * Request email verification / OTP confirmation
   */
  async verifyEmail({ email, token, type = 'signup' }) {
    if (supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type
      });
      if (error) {
        const err = new Error(error.message);
        err.statusCode = error.status || 400;
        throw err;
      }
      return { success: true, user: data.user, session: data.session };
    }

    const response = await apiClient.post('/auth/verify-email', { email, token, type });
    return response.data?.data || response.data;
  },

  /**
   * Request password recovery link
   */
  async recoverPassword({ email }) {
    if (supabase) {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });
      if (error) {
        const err = new Error(error.message);
        err.statusCode = error.status || 400;
        throw err;
      }
      return { success: true, data, message: 'Password reset link sent.' };
    }

    const response = await apiClient.post('/auth/recover-password', { email });
    return response.data?.data || response.data;
  },

  /**
   * Set new password using recovery token or authenticated session
   */
  async resetPassword({ newPassword, accessToken, userId }) {
    if (supabase) {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        const err = new Error(error.message);
        err.statusCode = error.status || 400;
        throw err;
      }
      return { success: true, user: data.user, message: 'Password updated successfully' };
    }

    const response = await apiClient.post('/auth/reset-password', {
      newPassword,
      _accessToken: accessToken,
      userId
    });
    return response.data?.data || response.data;
  },

  /**
   * Sign out and terminate session across client and server
   */
  async logout() {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.warn('Logout notification warning:', err.message);
    } finally {
      localStorage.removeItem('opspilot_auth_token');
      localStorage.removeItem('opspilot_active_tenant_id');
    }
    return { success: true };
  },

  /**
   * Refresh session token
   */
  async refreshToken(refreshToken) {
    if (supabase) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        throw error;
      }
      return data.session;
    }

    const response = await apiClient.post('/auth/refresh-token', {
      refresh_token: refreshToken
    });
    return response.data?.data || response.data;
  },

  /**
   * Initialize Supabase auth listener with subscription teardown
   */
  initAuthListener(callback) {
    if (!supabase) return () => {};

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (callback) {
        callback(event, session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }
};

export default authService;

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import apiClient from '../../../services/apiClient.js';
import authService from '../../../services/authService.js';
import { queryKeys } from '../../../services/queryClient.js';
import { loginSuccess, logout } from '../../../store/authSlice.js';
import { setCurrentTenant, setAvailableTenants } from '../../../store/tenantSlice.js';
import { useToast } from '../../../hooks/useToast.js';

/**
 * Hook to retrieve authenticated profile and session state
 */
export const useCurrentUserQuery = (options = {}) => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: async () => {
      const response = await apiClient.get('/auth/me');
      const user = response.data?.data || response.data;
      if (user) {
        dispatch(
          loginSuccess({
            user,
            token: localStorage.getItem('opspilot_auth_token') || ''
          })
        );
      }
      return user;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    ...options
  });
};

/**
 * Mutation for signing in with email & password
 */
export const useLoginMutation = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (credentials) => {
      return await authService.login(credentials);
    },
    onSuccess: (data) => {
      const user = data.user;
      const token = data.session?.access_token || data.token;
      if (token) {
        localStorage.setItem('opspilot_auth_token', token);
      }
      dispatch(loginSuccess({ user, token }));
      if (data.organizations && data.organizations.length > 0) {
        dispatch(setAvailableTenants(data.organizations));
      }
      if (data.activeOrganization) {
        dispatch(setCurrentTenant(data.activeOrganization));
      }
      queryClient.setQueryData(queryKeys.auth.currentUser(), user);
      toast.success('Welcome back', `Signed in as ${user?.full_name || user?.email || 'User'}`);
    },
    onError: (error) => {
      toast.error(
        'Authentication Failed',
        error.apiMessage || error.message || 'Invalid email or password'
      );
    }
  });
};

/**
 * Mutation for registering a new tenant organization and owner
 */
export const useRegisterMutation = () => {
  const dispatch = useDispatch();
  const toast = useToast();

  return useMutation({
    mutationFn: async (registrationData) => {
      return await authService.register(registrationData);
    },
    onSuccess: (data) => {
      const user = data.user;
      const token = data.session?.access_token || data.token;
      if (token && user) {
        localStorage.setItem('opspilot_auth_token', token);
        dispatch(loginSuccess({ user, token }));
      }
      if (data.organization) {
        dispatch(setAvailableTenants([data.organization]));
        dispatch(setCurrentTenant(data.organization));
      }
      toast.success('Registration Complete', 'Your organization account has been created.');
    },
    onError: (error) => {
      toast.error(
        'Registration Failed',
        error.apiMessage || error.message || 'Could not complete registration'
      );
    }
  });
};

/**
 * Mutation for verifying email address
 */
export const useVerifyEmailMutation = () => {
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      return await authService.verifyEmail(payload);
    },
    onSuccess: (data) => {
      toast.success('Email Verified', data.message || 'Your email has been confirmed.');
    },
    onError: (error) => {
      toast.error(
        'Verification Failed',
        error.apiMessage || error.message || 'Could not verify email'
      );
    }
  });
};

/**
 * Mutation for initiating password recovery email
 */
export const useRecoverPasswordMutation = () => {
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      return await authService.recoverPassword(payload);
    },
    onSuccess: (data) => {
      toast.success('Recovery Dispatched', data.message || 'Check your email for instructions.');
    },
    onError: (error) => {
      toast.error(
        'Recovery Failed',
        error.apiMessage || error.message || 'Could not request recovery'
      );
    }
  });
};

/**
 * Mutation for resetting password with new credentials
 */
export const useResetPasswordMutation = () => {
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      return await authService.resetPassword(payload);
    },
    onSuccess: (data) => {
      toast.success('Password Updated', data.message || 'Your password has been changed.');
    },
    onError: (error) => {
      toast.error(
        'Password Reset Failed',
        error.apiMessage || error.message || 'Could not reset password'
      );
    }
  });
};

/**
 * Mutation for signing out cleanly
 */
export const useLogoutMutation = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async () => {
      return await authService.logout();
    },
    onSettled: () => {
      localStorage.removeItem('opspilot_auth_token');
      localStorage.removeItem('opspilot_active_tenant_id');
      dispatch(logout());
      queryClient.clear();
      toast.info('Signed Out', 'You have been safely signed out.');
    }
  });
};

/**
 * Mutation for updating user profile
 */
export const useUpdateProfileMutation = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.patch('/auth/profile', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() });
      if (updatedUser) {
        dispatch(
          loginSuccess({
            user: updatedUser,
            token: localStorage.getItem('opspilot_auth_token') || ''
          })
        );
      }
      toast.success('Profile Saved', 'Personal profile details updated successfully.');
    },
    onError: (error) => {
      toast.error('Update Failed', error.apiMessage || 'Could not update profile');
    }
  });
};

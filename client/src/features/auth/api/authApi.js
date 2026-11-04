import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import apiClient from '../../../services/apiClient.js';
import { queryKeys } from '../../../services/queryClient.js';
import { loginSuccess, logout } from '../../../store/authSlice.js';
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
      const response = await apiClient.post('/auth/login', credentials);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      const { user, token } = data;
      if (token) {
        localStorage.setItem('opspilot_auth_token', token);
      }
      dispatch(loginSuccess({ user, token }));
      queryClient.setQueryData(queryKeys.auth.currentUser(), user);
      toast.success('Welcome back', `Signed in as ${user?.name || user?.email || 'User'}`);
    },
    onError: (error) => {
      toast.error('Authentication Failed', error.apiMessage || 'Invalid email or password');
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
      const response = await apiClient.post('/auth/register', registrationData);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      const { user, token } = data;
      if (token) {
        localStorage.setItem('opspilot_auth_token', token);
        dispatch(loginSuccess({ user, token }));
      }
      toast.success('Registration Complete', 'Your organization account has been created.');
    },
    onError: (error) => {
      toast.error('Registration Failed', error.apiMessage || 'Could not complete registration');
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
      try {
        await apiClient.post('/auth/logout');
      } catch (err) {
        // Even if server request fails, clean up client session
        console.warn('Logout server notification failed:', err.message);
      }
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

import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppRoutes from './routes/AppRoutes.jsx';
import { fetchCurrentUser, logout, loginSuccess, setAuthLoading } from './store/authSlice.js';
import { fetchMyOrganizations } from './store/tenantSlice.js';
import { addToast } from './store/uiSlice.js';
import { authService } from './services/authService.js';
import { supabase } from './services/supabaseClient.js';
import { SocketProvider } from './features/notifications/context/SocketContext.jsx';

export function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  // Initialize and synchronize Supabase session state on boot / refresh
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        if (supabase) {
          dispatch(setAuthLoading(true));
          const { data, error } = await supabase.auth.getSession();
          if (!error && data?.session && isMounted) {
            const currentSession = data.session;
            const accessToken = currentSession.access_token;
            localStorage.setItem('opspilot_auth_token', accessToken);
            dispatch(
              loginSuccess({
                user: currentSession.user,
                token: accessToken
              })
            );
          }
        }
      } catch (err) {
        console.warn('Session restoration notice:', err.message);
      } finally {
        if (isMounted) {
          dispatch(setAuthLoading(false));
        }
      }
    }

    initSession();

    // Attach real-time Supabase auth state change subscription
    const unsubscribe = authService.initAuthListener((event, session) => {
      if (!isMounted) return;

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        localStorage.setItem('opspilot_auth_token', session.access_token);
        dispatch(
          loginSuccess({
            user: session.user,
            token: session.access_token
          })
        );
      } else if (event === 'SIGNED_OUT') {
        dispatch(logout());
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [dispatch]);

  // Sync profile data and organization memberships whenever user is authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      dispatch(fetchCurrentUser());
      dispatch(fetchMyOrganizations());
    }
  }, [dispatch, isAuthenticated, token]);

  // Centralized listener for session expiration / 401 events emitted by apiClient
  useEffect(() => {
    const handleAuthExpired = (event) => {
      dispatch(logout());
      dispatch(
        addToast({
          type: 'warning',
          title: 'Session Expired',
          message: event.detail?.message || 'Your session has ended. Please sign in again.',
          duration: 6000
        })
      );
    };

    window.addEventListener('opspilot:auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('opspilot:auth-expired', handleAuthExpired);
    };
  }, [dispatch]);

  return (
    <BrowserRouter>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;

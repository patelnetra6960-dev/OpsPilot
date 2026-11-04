import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppRoutes from './routes/AppRoutes.jsx';
import { fetchCurrentUser, logout } from './store/authSlice.js';
import { fetchMyOrganizations } from './store/tenantSlice.js';
import { addToast } from './store/uiSlice.js';

export function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  // Sync user profile and organization list on authenticated startup
  useEffect(() => {
    if (isAuthenticated && token) {
      dispatch(fetchCurrentUser());
      dispatch(fetchMyOrganizations());
    }
  }, [dispatch, isAuthenticated, token]);

  // Global listener for session expiry / 401 events dispatched by apiClient
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
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

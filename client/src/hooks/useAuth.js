import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { loginSuccess, logout, fetchCurrentUser, switchDemoPersona } from '../store/authSlice.js';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  const role = user?.role || 'owner';
  const isSuperAdmin = Boolean(user?.is_superadmin || role === 'superadmin');
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || role === 'owner';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const isCustomer = role === 'customer';

  const hasRole = useCallback(
    (allowedRoles) => {
      if (!allowedRoles || !allowedRoles.length) return true;
      if (isSuperAdmin) return true;
      if (allowedRoles.includes(role)) return true;
      if (role === 'owner' && allowedRoles.includes('admin')) return true;
      if (role === 'admin' && allowedRoles.includes('owner')) return true;
      return false;
    },
    [role, isSuperAdmin]
  );

  const hasPermission = useCallback(
    (permission) => {
      if (isSuperAdmin) return true;
      if (isOwner) return true;
      const userPermissions = user?.permissions || [];
      return userPermissions.includes(permission);
    },
    [isSuperAdmin, isOwner, user?.permissions]
  );

  const handleLogin = useCallback(
    (payload) => {
      dispatch(loginSuccess(payload));
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    return dispatch(fetchCurrentUser());
  }, [dispatch]);

  const handleSwitchPersona = useCallback(
    (roleKey) => {
      dispatch(switchDemoPersona(roleKey));
    },
    [dispatch]
  );

  return {
    user,
    token,
    role,
    isAuthenticated,
    isLoading,
    error,
    isSuperAdmin,
    isOwner,
    isAdmin,
    isManager,
    isEmployee,
    isCustomer,
    hasRole,
    hasPermission,
    login: handleLogin,
    logout: handleLogout,
    refreshUser: handleRefresh,
    switchDemoPersona: handleSwitchPersona
  };
};

export default useAuth;

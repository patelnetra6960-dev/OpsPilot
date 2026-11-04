import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingOverlay } from '../components/ui/LoadingSpinner.jsx';

export const ProtectedRoute = ({ allowedRoles }) => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useSelector((state) => state.auth);

  // If session is still restoring (e.g. initial token verification on page refresh)
  if (isLoading) {
    return <LoadingOverlay fullScreen message="Verifying security session..." />;
  }

  // If not authenticated, redirect to login preserving target location
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required, verify user role matches
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role || 'owner';
    const isSuperAdmin = Boolean(user?.is_superadmin || userRole === 'superadmin');

    // Super Admin has platform-wide authority
    if (isSuperAdmin) {
      return <Outlet />;
    }

    // Normalise 'owner' as eligible for 'admin' roles
    const isAllowed =
      allowedRoles.includes(userRole) ||
      (userRole === 'owner' && allowedRoles.includes('admin')) ||
      (userRole === 'admin' && allowedRoles.includes('owner'));

    if (!isAllowed) {
      // Divert to explicit Unauthorized Page rather than silently hiding
      return <Navigate to="/unauthorized" state={{ attemptedPath: location.pathname }} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;

import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { getDefaultRouteForRole } from '../utils/demoPersonas.js';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, verify user role matches
  if (allowedRoles && user?.role) {
    // Normalise 'owner' as eligible for 'admin' roles
    const userRole = user.role;
    const isAllowed =
      allowedRoles.includes(userRole) ||
      (userRole === 'owner' && allowedRoles.includes('admin')) ||
      (userRole === 'admin' && allowedRoles.includes('owner'));

    if (!isAllowed) {
      return <Navigate to={getDefaultRouteForRole(userRole)} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;

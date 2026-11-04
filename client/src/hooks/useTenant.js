import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  setCurrentTenant,
  setAvailableTenants,
  fetchMyOrganizations
} from '../store/tenantSlice.js';

export const useTenant = () => {
  const dispatch = useDispatch();
  const { currentTenant, availableTenants, isLoading, error } = useSelector(
    (state) => state.tenant
  );

  const activeTenantId = currentTenant?.id || null;
  const isLoaded = Boolean(currentTenant?.id);

  const switchTenant = useCallback(
    (tenantOrId) => {
      if (typeof tenantOrId === 'string') {
        const found = availableTenants.find((t) => t.id === tenantOrId);
        if (found) {
          dispatch(setCurrentTenant(found));
          return found;
        }
        const minimalTenant = { id: tenantOrId, name: 'Active Tenant' };
        dispatch(setCurrentTenant(minimalTenant));
        return minimalTenant;
      } else if (tenantOrId && tenantOrId.id) {
        dispatch(setCurrentTenant(tenantOrId));
        return tenantOrId;
      }
    },
    [availableTenants, dispatch]
  );

  const refreshOrganizations = useCallback(() => {
    return dispatch(fetchMyOrganizations());
  }, [dispatch]);

  const setOrganizations = useCallback(
    (tenants) => {
      dispatch(setAvailableTenants(tenants));
    },
    [dispatch]
  );

  return {
    currentTenant,
    availableTenants,
    activeTenantId,
    isLoading,
    error,
    isLoaded,
    switchTenant,
    refreshOrganizations,
    setOrganizations
  };
};

export default useTenant;

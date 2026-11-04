import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppRoutes from './routes/AppRoutes.jsx';
import { fetchCurrentUser } from './store/authSlice.js';
import { fetchMyOrganizations } from './store/tenantSlice.js';

export function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && token) {
      dispatch(fetchCurrentUser());
      dispatch(fetchMyOrganizations());
    }
  }, [dispatch, isAuthenticated, token]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

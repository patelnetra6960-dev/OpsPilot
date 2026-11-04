import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import tenantReducer from './tenantSlice.js';
import uiReducer from './uiSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tenant: tenantReducer,
    ui: uiReducer
  },
  devTools: process.env.NODE_ENV !== 'production'
});

export default store;

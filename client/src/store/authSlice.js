import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient.js';

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to authenticate');
    }
  }
);

if (typeof window !== 'undefined' && !localStorage.getItem('opspilot_auth_token')) {
  localStorage.setItem('opspilot_auth_token', 'mock-token-alex');
}

const initialToken =
  (typeof window !== 'undefined' && localStorage.getItem('opspilot_auth_token')) ||
  'mock-token-alex';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      email: 'alex.director@acme.com',
      full_name: 'Alex Rivera',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    },
    token: initialToken,
    isAuthenticated: Boolean(initialToken),
    isLoading: false,
    error: null
  },
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.error = null;
      if (token) {
        localStorage.setItem('opspilot_auth_token', token);
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('opspilot_auth_token');
      localStorage.removeItem('opspilot_active_tenant_id');
    },
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { setCredentials, logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;

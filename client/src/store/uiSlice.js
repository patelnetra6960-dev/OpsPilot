import { createSlice } from '@reduxjs/toolkit';

const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('opspilot_theme');
    if (savedTheme) return savedTheme;
    return 'dark'; // Default to enterprise dark mode
  }
  return 'dark';
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    searchModalOpen: false,
    activeModal: null,
    drawerOpen: false,
    drawerContent: null,
    theme: getInitialTheme(),
    toasts: []
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    openSearchModal: (state) => {
      state.searchModalOpen = true;
    },
    closeSearchModal: (state) => {
      state.searchModalOpen = false;
    },
    toggleSearchModal: (state) => {
      state.searchModalOpen = !state.searchModalOpen;
    },
    openModal: (state, action) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
    openDrawer: (state, action) => {
      state.drawerOpen = true;
      state.drawerContent = action.payload;
    },
    closeDrawer: (state) => {
      state.drawerOpen = false;
      state.drawerContent = null;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('opspilot_theme', action.payload);
        if (action.payload === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },
    toggleTheme: (state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      state.theme = nextTheme;
      if (typeof window !== 'undefined') {
        localStorage.setItem('opspilot_theme', nextTheme);
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },
    addToast: (state, action) => {
      const {
        id = `toast-${Date.now()}-${Math.random()}`,
        type = 'info', // 'success' | 'error' | 'warning' | 'info'
        title,
        message,
        duration = 4000
      } = action.payload;
      state.toasts.push({ id, type, title, message, duration });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    }
  }
});

export const {
  toggleSidebar,
  setSidebarOpen,
  openSearchModal,
  closeSearchModal,
  toggleSearchModal,
  openModal,
  closeModal,
  openDrawer,
  closeDrawer,
  setTheme,
  toggleTheme,
  addToast,
  removeToast,
  clearToasts
} = uiSlice.actions;

export default uiSlice.reducer;

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // Data remains fresh for 1 minute
      gcTime: 1000 * 60 * 5, // Garbage collect unused queries after 5 minutes
      retry: 1, // Retry failed queries once before raising an error
      refetchOnWindowFocus: false, // Prevent distracting refetches on tab focus
      refetchOnReconnect: true
    },
    mutations: {
      retry: 0
    }
  }
});

// Centralized Query Key Factory for clean cache invalidation and query deduplication
export const queryKeys = {
  auth: {
    all: ['auth'],
    currentUser: () => ['auth', 'currentUser'],
    session: () => ['auth', 'session']
  },
  organizations: {
    all: ['organizations'],
    list: (filters = {}) => ['organizations', 'list', filters],
    detail: (id) => ['organizations', 'detail', id],
    members: (orgId) => ['organizations', orgId, 'members']
  },
  workforce: {
    all: ['workforce'],
    list: (filters = {}) => ['workforce', 'list', filters],
    detail: (id) => ['workforce', 'detail', id],
    stats: () => ['workforce', 'stats']
  },
  customers: {
    all: ['customers'],
    list: (filters = {}) => ['customers', 'list', filters],
    detail: (id) => ['customers', 'detail', id],
    notes: (id) => ['customers', id, 'notes'],
    history: (id) => ['customers', id, 'history']
  },
  customerPortal: {
    all: ['customerPortal'],
    overview: () => ['customerPortal', 'overview'],
    profile: () => ['customerPortal', 'profile'],
    serviceRequests: (filters = {}) => ['customerPortal', 'serviceRequests', filters],
    serviceRequestDetail: (id) => ['customerPortal', 'serviceRequests', id],
    projects: () => ['customerPortal', 'projects'],
    invoices: () => ['customerPortal', 'invoices'],
    invoiceDetail: (id) => ['customerPortal', 'invoices', id]
  },
  projects: {
    all: ['projects'],
    list: (filters = {}) => ['projects', 'list', filters],
    detail: (id) => ['projects', 'detail', id],
    members: (projectId) => ['projects', projectId, 'members'],
    milestones: (projectId) => ['projects', projectId, 'milestones']
  },
  tasks: {
    all: ['tasks'],
    list: (filters = {}) => ['tasks', 'list', filters],
    detail: (id) => ['tasks', 'detail', id],
    assignments: (taskId) => ['tasks', taskId, 'assignments'],
    comments: (taskId) => ['tasks', taskId, 'comments'],
    attachments: (taskId) => ['tasks', taskId, 'attachments']
  },
  serviceRequests: {
    all: ['serviceRequests'],
    list: (filters = {}) => ['serviceRequests', 'list', filters],
    detail: (id) => ['serviceRequests', 'detail', id]
  },
  workOrders: {
    all: ['workOrders'],
    list: (filters = {}) => ['workOrders', 'list', filters],
    detail: (id) => ['workOrders', 'detail', id],
    checklists: (woId) => ['workOrders', woId, 'checklists'],
    notes: (woId) => ['workOrders', woId, 'notes'],
    photos: (woId) => ['workOrders', woId, 'photos']
  },
  inventory: {
    all: ['inventory'],
    list: (filters = {}) => ['inventory', 'list', filters],
    detail: (id) => ['inventory', 'detail', id],
    stats: () => ['inventory', 'stats'],
    lowStock: () => ['inventory', 'lowStock'],
    transactions: (filters = {}) => ['inventory', 'transactions', filters]
  },
  assets: {
    all: ['assets'],
    list: (filters = {}) => ['assets', 'list', filters],
    detail: (id) => ['assets', 'detail', id],
    stats: () => ['assets', 'stats']
  },
  suppliers: {
    all: ['suppliers'],
    list: (filters = {}) => ['suppliers', 'list', filters],
    detail: (id) => ['suppliers', 'detail', id],
    stats: () => ['suppliers', 'stats'],
    purchases: (supplierId) => ['suppliers', supplierId, 'purchases']
  },
  expenses: {
    all: ['expenses'],
    list: (filters = {}) => ['expenses', 'list', filters],
    detail: (id) => ['expenses', 'detail', id],
    stats: () => ['expenses', 'stats'],
    history: (id) => ['expenses', id, 'history']
  },
  invoices: {
    all: ['invoices'],
    list: (filters = {}) => ['invoices', 'list', filters],
    detail: (id) => ['invoices', 'detail', id],
    stats: () => ['invoices', 'stats'],
    payments: (id) => ['invoices', id, 'payments'],
    pdf: (id) => ['invoices', id, 'pdf']
  },
  search: {
    all: ['search'],
    results: (params = {}) => ['search', 'results', params]
  },
  notifications: {
    all: ['notifications'],
    list: (filters = {}) => ['notifications', 'list', filters],
    unreadCount: () => ['notifications', 'unreadCount']
  },
  analytics: {
    all: ['analytics'],
    organization: (filters = {}) => ['analytics', 'organization', filters],
    manager: (filters = {}) => ['analytics', 'manager', filters],
    platform: (filters = {}) => ['analytics', 'platform', filters]
  },
  audit: {
    all: ['audit'],
    list: (filters = {}) => ['audit', 'list', filters]
  }
};

export default queryClient;

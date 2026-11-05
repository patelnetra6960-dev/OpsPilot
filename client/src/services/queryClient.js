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
    detail: (id) => ['customers', 'detail', id]
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
  audit: {
    all: ['audit'],
    list: (filters = {}) => ['audit', 'list', filters]
  }
};

export default queryClient;

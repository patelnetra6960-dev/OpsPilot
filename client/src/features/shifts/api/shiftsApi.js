import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient.js';

export const shiftKeys = {
  all: ['shifts'],
  lists: () => [...shiftKeys.all, 'list'],
  list: (filters) => [...shiftKeys.lists(), filters],
  details: () => [...shiftKeys.all, 'detail'],
  detail: (id) => [...shiftKeys.details(), id],
  attendance: ['attendance'],
  timesheets: (filters) => [...shiftKeys.attendance, 'timesheets', filters]
};

// ---------------------------------------------------------------------
// 1. Shift Queries & Mutations
// ---------------------------------------------------------------------

export const useShiftsQuery = (filters = {}) => {
  return useQuery({
    queryKey: shiftKeys.list(filters),
    queryFn: async () => {
      const res = await apiClient.get('/shifts', { params: filters });
      return res.data?.data || [];
    }
  });
};

export const useCreateShiftMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/shifts', payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
    }
  });
};

export const useUpdateShiftMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await apiClient.patch(`/shifts/${id}`, payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
    }
  });
};

export const useDeleteShiftMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/shifts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() });
    }
  });
};

// ---------------------------------------------------------------------
// 2. Attendance & Timesheet Queries & Mutations
// ---------------------------------------------------------------------

export const useTimesheetsQuery = (filters = {}) => {
  return useQuery({
    queryKey: shiftKeys.timesheets(filters),
    queryFn: async () => {
      const res = await apiClient.get('/attendance/timesheets', { params: filters });
      return res.data?.data || [];
    }
  });
};

export const useClockInMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/attendance/clock-in', payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.attendance });
    }
  });
};

export const useClockOutMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/attendance/clock-out', payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.attendance });
    }
  });
};

export const useApproveTimesheetMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }) => {
      const res = await apiClient.post(`/attendance/timesheets/${id}/approve`, { status, notes });
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.attendance });
    }
  });
};

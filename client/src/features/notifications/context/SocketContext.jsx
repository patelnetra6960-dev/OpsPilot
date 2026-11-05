import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { addToast } from '../../../store/uiSlice.js';
import { queryKeys } from '../../../services/queryClient.js';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useSelector((state) => state.auth);
  const currentTenant = useSelector((state) => state.tenant?.currentTenant);
  const organizationId = currentTenant?.id;

  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Client-side sliding-window deduplication (prevents duplicate toasts / rerenders)
  const processedEventIds = useRef(new Set());
  const isDuplicateEvent = useCallback((eventId) => {
    if (!eventId) return false;
    if (processedEventIds.current.has(eventId)) {
      return true;
    }
    processedEventIds.current.add(eventId);
    if (processedEventIds.current.size > 500) {
      const first = processedEventIds.current.values().next().value;
      processedEventIds.current.delete(first);
    }
    return false;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token || !organizationId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setIsReconnecting(false);
      }
      return;
    }

    // Determine target URL for WebSocket connection
    const serverUrl =
      import.meta.env.VITE_API_URL?.replace(/\/api(\/v1)?\/?$/, '') ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

    const socket = io(serverUrl, {
      path: '/socket.io',
      auth: {
        token,
        organizationId
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': organizationId
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Disconnected by server (e.g. auth failure or revoked token)
        setConnectionError('Disconnected by server');
      }
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      setIsReconnecting(true);
      setConnectionError(err.message || 'Connection failed');
    });

    socket.on('reconnect_attempt', () => {
      setIsReconnecting(true);
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
      // Invalidate queries to sync state after reconnection
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });

    // 1. In-App Notifications
    socket.on('notification:new', (envelope) => {
      if (envelope?.eventId && isDuplicateEvent(envelope.eventId)) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

      const notif = envelope.notification || envelope;
      if (notif.title) {
        dispatch(
          addToast({
            type: notif.type === 'error' ? 'error' : notif.type === 'warning' ? 'warning' : 'info',
            title: notif.title,
            message: notif.message,
            duration: 5000
          })
        );
      }
    });

    // Notification Read Synchronization
    socket.on('notification:read', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });

    socket.on('notification:read_all', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });

    // 2. Task Assignment & Updates
    socket.on('task:assigned', (envelope) => {
      if (envelope?.eventId && isDuplicateEvent(envelope.eventId)) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    });

    socket.on('task:status_updated', (envelope) => {
      if (envelope?.eventId && isDuplicateEvent(envelope.eventId)) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    });

    // 3. Project Activity
    socket.on('project:updated', (envelope) => {
      if (envelope?.eventId && isDuplicateEvent(envelope.eventId)) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    });

    // 4. Work Order Updates
    socket.on('workorder:status_updated', (envelope) => {
      if (envelope?.eventId && isDuplicateEvent(envelope.eventId)) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders.all });
    });

    // 5. Expense Approval Updates
    socket.on('expense:status_updated', (envelope) => {
      if (envelope?.eventId && isDuplicateEvent(envelope.eventId)) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
    });

    // 6. Customer Request Status Updates
    socket.on('service_request:status_updated', (envelope) => {
      if (envelope?.eventId && isDuplicateEvent(envelope.eventId)) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerPortal.all });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, organizationId, isAuthenticated, dispatch, queryClient, isDuplicateEvent]);

  /**
   * Safe room join requester with server-side validation
   */
  const joinRoom = useCallback((roomName) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        return reject(new Error('Socket not connected'));
      }
      socketRef.current.emit('room:join', roomName, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Failed to join room'));
        }
      });
    });
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    connectionError,
    joinRoom
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Clock,
  Send,
  Check,
  Trash2,
  AlertCircle,
  FileText,
  DollarSign,
  Briefcase,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addToast } from '../../store/uiSlice.js';
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation
} from '../../features/notifications/api/notificationsApi.js';
import { useSocket } from '../../features/notifications/context/SocketContext.jsx';

// Format relative timestamps
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return 'Just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Choose appropriate category icon and colors
const getNotificationVisuals = (type, title = '') => {
  const lowerTitle = title.toLowerCase();

  if (type === 'dispatch' || lowerTitle.includes('work order') || lowerTitle.includes('task')) {
    return {
      Icon: lowerTitle.includes('work order') ? Send : Briefcase,
      colorClass: 'text-indigo-500 bg-indigo-500/10'
    };
  }
  if (type === 'warning' || lowerTitle.includes('reject') || lowerTitle.includes('overdue')) {
    return {
      Icon: AlertCircle,
      colorClass: 'text-amber-500 bg-amber-500/10'
    };
  }
  if (type === 'success' || lowerTitle.includes('approved') || lowerTitle.includes('completed')) {
    return {
      Icon: CheckCheck,
      colorClass: 'text-emerald-500 bg-emerald-500/10'
    };
  }
  if (lowerTitle.includes('expense') || lowerTitle.includes('invoice') || lowerTitle.includes('payment')) {
    return {
      Icon: DollarSign,
      colorClass: 'text-blue-500 bg-blue-500/10'
    };
  }
  if (lowerTitle.includes('service') || lowerTitle.includes('request')) {
    return {
      Icon: FileText,
      colorClass: 'text-cyan-500 bg-cyan-500/10'
    };
  }
  return {
    Icon: Clock,
    colorClass: 'text-slate-500 bg-slate-500/10'
  };
};

export const NotificationDropdown = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  // Real-time socket state
  const { isConnected, isReconnecting } = useSocket();

  // Notification API queries and mutations
  const { data: notificationsData, isLoading } = useNotificationsQuery();
  const { data: liveUnreadCount = 0 } = useUnreadCountQuery();
  const markReadMutation = useMarkReadMutation();
  const markAllReadMutation = useMarkAllReadMutation();
  const deleteMutation = useDeleteNotificationMutation();

  const notifications = useMemo(() => {
    return notificationsData?.items || [];
  }, [notificationsData]);

  const unreadCount = liveUnreadCount;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      dispatch(
        addToast({
          type: 'info',
          title: 'Notifications Updated',
          message: 'All notifications marked as read'
        })
      );
    } catch {
      dispatch(
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to mark all as read'
        })
      );
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.action_url) {
      setIsOpen(false);
      navigate(notif.action_url);
    }
  };

  const handleToggleRead = (e, notif) => {
    e.stopPropagation();
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
  };

  const handleDelete = (e, notifId) => {
    e.stopPropagation();
    deleteMutation.mutate(notifId);
  };

  const displayedNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                  {unreadCount} new
                </span>
              )}

              {/* Real-time connection badge */}
              <div
                className="flex items-center gap-1 ml-2 text-[10px] font-medium"
                title={
                  isConnected
                    ? 'Connected to real-time events via WebSocket'
                    : isReconnecting
                    ? 'Reconnecting to real-time engine...'
                    : 'Disconnected from real-time events'
                }
              >
                {isConnected ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live</span>
                  </span>
                ) : isReconnecting ? (
                  <span className="flex items-center gap-1 text-amber-500">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>Syncing</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400">
                    <WifiOff className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markAllReadMutation.isPending}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                filter === 'unread'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin opacity-50" />
                <p className="text-xs">Loading activity feed...</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No notifications to show</p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const { Icon, colorClass } = getNotificationVisuals(notif.type, notif.title);
                const isUnread = !notif.is_read;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition group hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      isUnread ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                    </div>

                    {/* Actions: Mark read & Delete */}
                    <div className="shrink-0 pt-1 flex items-center gap-1.5">
                      {isUnread ? (
                        <button
                          type="button"
                          onClick={(e) => handleToggleRead(e, notif)}
                          title="Mark as read"
                          className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 hover:scale-125 transition"
                        />
                      ) : (
                        <Check className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, notif.id)}
                        title="Delete notification"
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;

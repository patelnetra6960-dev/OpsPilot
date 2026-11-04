import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Clock, Send, ShieldCheck, Check, Trash2 } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addToast } from '../../store/uiSlice.js';

export const NotificationDropdown = () => {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'New Work Order Assigned',
      message: 'Dispatch WO-8492 allocated to Team North for site inspection.',
      time: '12m ago',
      category: 'dispatch',
      unread: true,
      icon: Send,
      iconColor: 'text-indigo-500 bg-indigo-500/10'
    },
    {
      id: 'notif-2',
      title: 'Shift Approval Required',
      message: 'David Kim submitted a 4-hour overtime timesheet for review.',
      time: '45m ago',
      category: 'shifts',
      unread: true,
      icon: Clock,
      iconColor: 'text-amber-500 bg-amber-500/10'
    },
    {
      id: 'notif-3',
      title: 'Automated Database Backup',
      message: 'Daily tenant snapshot completed successfully with RLS verified.',
      time: '2h ago',
      category: 'system',
      unread: false,
      icon: ShieldCheck,
      iconColor: 'text-emerald-500 bg-emerald-500/10'
    },
    {
      id: 'notif-4',
      title: 'Monthly Statement Generated',
      message: 'Invoice INV-2026-11 is ready for Acme Logistics Global.',
      time: '1d ago',
      category: 'billing',
      unread: false,
      icon: CheckCheck,
      iconColor: 'text-blue-500 bg-blue-500/10'
    }
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    dispatch(
      addToast({
        type: 'info',
        title: 'Notifications Updated',
        message: 'All notifications marked as read'
      })
    );
  };

  const handleToggleRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n)));
  };

  const handleClearAll = () => {
    setNotifications([]);
    dispatch(
      addToast({
        type: 'info',
        title: 'Notifications Cleared',
        message: 'All notification history cleared'
      })
    );
  };

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => n.unread) : notifications;

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
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
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
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  title="Clear all"
                  className="p-1 text-slate-400 hover:text-rose-500 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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

          {/* Notification Items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {displayedNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No notifications to show</p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const Icon = notif.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleToggleRead(notif.id)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      notif.unread ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${notif.iconColor}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                    </div>

                    <div className="shrink-0 pt-1">
                      {notif.unread ? (
                        <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                      ) : (
                        <Check className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      )}
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

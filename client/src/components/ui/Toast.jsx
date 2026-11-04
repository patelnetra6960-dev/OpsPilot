import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { removeToast } from '../../store/uiSlice.js';

const toastConfig = {
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60'
  },
  error: {
    icon: AlertCircle,
    border: 'border-rose-500/30',
    iconColor: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/60'
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-500/30',
    iconColor: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/60'
  },
  info: {
    icon: Info,
    border: 'border-sky-500/30',
    iconColor: 'text-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-950/60'
  }
};

export const ToastItem = ({ toast }) => {
  const dispatch = useDispatch();
  const config = toastConfig[toast.type] || toastConfig.info;
  const Icon = config.icon;

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        dispatch(removeToast(toast.id));
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [dispatch, toast.id, toast.duration]);

  return (
    <div
      className={`w-80 sm:w-96 rounded-2xl border p-4 shadow-xl flex items-start gap-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all duration-200 animate-in fade-in-0 slide-in-from-top-4`}
      role="alert"
    >
      <div className={`p-1.5 rounded-xl shrink-0 ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        {toast.title && (
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{toast.title}</h4>
        )}
        {toast.message && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed break-words">
            {toast.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => dispatch(removeToast(toast.id))}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts } = useSelector((state) => state.ui);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { addToast, removeToast, clearToasts } from '../store/uiSlice.js';

export const useToast = () => {
  const dispatch = useDispatch();
  const toasts = useSelector((state) => state.ui.toasts);

  const toast = useCallback(
    ({ type = 'info', title, message, duration = 4000 }) => {
      const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      dispatch(addToast({ id, type, title, message, duration }));
      return id;
    },
    [dispatch]
  );

  const success = useCallback(
    (title, message, duration = 4000) => {
      return toast({ type: 'success', title, message, duration });
    },
    [toast]
  );

  const error = useCallback(
    (title, message, duration = 5000) => {
      return toast({ type: 'error', title, message, duration });
    },
    [toast]
  );

  const warning = useCallback(
    (title, message, duration = 4500) => {
      return toast({ type: 'warning', title, message, duration });
    },
    [toast]
  );

  const info = useCallback(
    (title, message, duration = 4000) => {
      return toast({ type: 'info', title, message, duration });
    },
    [toast]
  );

  const dismiss = useCallback(
    (id) => {
      dispatch(removeToast(id));
    },
    [dispatch]
  );

  const clear = useCallback(() => {
    dispatch(clearToasts());
  }, [dispatch]);

  return {
    toasts,
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    clear
  };
};

export default useToast;

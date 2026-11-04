import { useSelector, useDispatch } from 'react-redux';
import { Sun, Moon } from 'lucide-react';
import { toggleTheme } from '../../store/uiSlice.js';

export const ThemeToggle = ({ className = '' }) => {
  const dispatch = useDispatch();
  const { theme } = useSelector((state) => state.ui);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle visual theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600" />
      )}
    </button>
  );
};

export default ThemeToggle;

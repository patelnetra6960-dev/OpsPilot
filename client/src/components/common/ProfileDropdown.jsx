import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { User, Building2, LogOut, ChevronDown, ShieldCheck, Sun, Moon } from 'lucide-react';
import { logout } from '../../store/authSlice.js';
import { toggleTheme, addToast } from '../../store/uiSlice.js';
import authService from '../../services/authService.js';
import TenantBadge from './TenantBadge.jsx';

export const ProfileDropdown = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const { currentTenant } = useSelector((state) => state.tenant);
  const { theme } = useSelector((state) => state.ui);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    dispatch(logout());
    dispatch(
      addToast({
        type: 'info',
        title: 'Logged Out',
        message: 'You have been signed out successfully'
      })
    );
    navigate('/login');
  };

  const handleNav = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const isPlatformOrOrgAdmin =
    user?.role === 'superadmin' || user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 transition"
      >
        <img
          src={
            user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
          }
          alt={user?.full_name || 'User Avatar'}
          className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20"
        />
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
            {user?.full_name || 'OpsPilot User'}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono leading-tight">
            {user?.email || 'user@example.com'}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Profile Badge */}
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl mb-2">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {user?.full_name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</div>
            <div className="mt-2 flex items-center justify-between">
              <TenantBadge
                role={user?.role || currentTenant?.role || 'member'}
                tier={currentTenant?.subscription_tier || 'starter'}
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <button
              type="button"
              onClick={() => handleNav('/settings')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>Profile & Security</span>
            </button>

            {isPlatformOrOrgAdmin && (
              <button
                type="button"
                onClick={() => handleNav('/settings')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
              >
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>Organization & Billing</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => dispatch(toggleTheme())}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
            >
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
                <span>Appearance</span>
              </div>
              <span className="text-[10px] capitalize font-medium text-slate-400">{theme}</span>
            </button>

            {user?.role === 'superadmin' && (
              <button
                type="button"
                onClick={() => handleNav('/super-admin')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition text-left font-semibold"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Platform Control</span>
              </button>
            )}

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-left font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;

import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Check, ShieldCheck, UserCheck, Menu, Search } from 'lucide-react';
import { setCurrentTenant } from '../store/tenantSlice.js';
import { setCredentials } from '../store/authSlice.js';
import { toggleSidebar, openSearchModal, addToast } from '../store/uiSlice.js';
import TenantBadge from '../components/common/TenantBadge.jsx';
import { ThemeToggle } from '../components/ui/index.js';
import NotificationDropdown from '../components/common/NotificationDropdown.jsx';
import ProfileDropdown from '../components/common/ProfileDropdown.jsx';
import { DEMO_PERSONAS, getDefaultRouteForRole } from '../utils/demoPersonas.js';

export const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { currentTenant, availableTenants } = useSelector((state) => state.tenant);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);

  const handleSelectTenant = (tenant) => {
    dispatch(setCurrentTenant(tenant));
    setTenantDropdownOpen(false);
    dispatch(
      addToast({
        type: 'info',
        title: 'Organization Switched',
        message: `Active workspace is now ${tenant.name}`
      })
    );
  };

  const handleSelectPersona = (persona) => {
    dispatch(setCredentials({ user: persona.user, token: persona.token }));
    dispatch(setCurrentTenant(persona.tenant));
    setPersonaDropdownOpen(false);

    dispatch(
      addToast({
        type: 'success',
        title: 'Persona Activated',
        message: `Switched to ${persona.label}`
      })
    );

    const targetRoute = getDefaultRouteForRole(persona.user.role);
    navigate(targetRoute);
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Menu Toggle & Tenant Switcher */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition lg:hidden"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Tenant Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition shadow-sm"
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 dark:bg-indigo-600/20 border border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col max-w-[130px] sm:max-w-[200px]">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none truncate">
                {currentTenant?.name || 'Select Organization'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono leading-none mt-1 truncate">
                {currentTenant?.slug || 'no-tenant'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {tenantDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-3 py-1.5 uppercase tracking-wider">
                Switch Organization (Tenant)
              </div>
              <div className="space-y-1">
                {availableTenants.map((tenant) => {
                  const isSelected = tenant.id === currentTenant?.id;
                  return (
                    <button
                      key={tenant.id}
                      type="button"
                      onClick={() => handleSelectTenant(tenant)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-900 dark:text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate">{tenant.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{tenant.slug}</div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {currentTenant && (
          <div className="hidden sm:block">
            <TenantBadge
              role={user?.role || currentTenant.role || 'member'}
              tier={currentTenant.subscription_tier || 'starter'}
            />
          </div>
        )}
      </div>

      {/* Center: Global Search Trigger Button */}
      <div className="hidden lg:flex items-center">
        <button
          type="button"
          onClick={() => dispatch(openSearchModal())}
          className="flex items-center gap-3 px-4 py-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl transition w-64 justify-between"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search OpsPilot...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-400 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions: Search Mobile, Notifications, Theme, QA Persona, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Mobile Search Icon */}
        <button
          type="button"
          onClick={() => dispatch(openSearchModal())}
          aria-label="Open global search"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition lg:hidden"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notification Panel */}
        <NotificationDropdown />

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Quick Persona Switcher for QA & Verification */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition shadow-sm"
            title="Switch demo persona to test role-specific dashboards & security boundaries"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Role:</span>
            <span className="font-semibold capitalize">
              {user?.role === 'superadmin'
                ? 'Super Admin'
                : user?.role === 'owner'
                  ? 'Admin'
                  : user?.role || 'User'}
            </span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {personaDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Switch User Role & Persona
              </div>
              <div className="space-y-1">
                {DEMO_PERSONAS.map((persona, index) => {
                  const isCurrent = user?.email === persona.user.email;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectPersona(persona)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition ${
                        isCurrent
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{persona.user.full_name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                          {persona.roleLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        {persona.user.email}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu Dropdown */}
        <ProfileDropdown />
      </div>
    </header>
  );
};

export default Navbar;

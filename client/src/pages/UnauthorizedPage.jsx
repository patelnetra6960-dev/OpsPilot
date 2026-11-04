import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, User, LogOut, Home } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useTenant } from '../hooks/useTenant.js';
import { getDefaultRouteForRole } from '../utils/demoPersonas.js';
import { Button, Card, ThemeToggle } from '../components/ui/index.js';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const { currentTenant } = useTenant();

  const handleGoHome = () => {
    const route = getDefaultRouteForRole(role);
    navigate(route);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden transition-colors">
      <div className="absolute top-4 right-4 sm:right-8 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        <Card variant="elevated" className="p-6 sm:p-8 space-y-6 text-center border-rose-500/30">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
              403 • Access Forbidden
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Unauthorized Access Attempt
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              You do not possess the required permissions or organization role to view this module.
              OpsPilot multi-tenant security strictly isolates tenant data across both the frontend
              routing layer and backend database policies.
            </p>
          </div>

          {/* Current Identity & Tenant Context Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-750">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5" /> Authenticated As:
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {user?.full_name || user?.email || 'Authenticated User'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-750">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                Active Tenant Organization:
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {currentTenant?.name || 'Primary Workspace'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Assigned Role:</span>
              <span className="capitalize font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900 text-[11px]">
                {role}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              className="flex-1 justify-center"
              onClick={handleGoHome}
            >
              <Home className="w-4 h-4 mr-1.5" />
              <span>Return to My Dashboard</span>
            </Button>

            <Button
              variant="outline"
              size="md"
              className="flex-1 justify-center"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-1.5 text-slate-400" />
              <span>Sign Out</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UnauthorizedPage;

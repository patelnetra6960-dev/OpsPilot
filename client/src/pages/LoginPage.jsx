import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  Users,
  CalendarCheck,
  Send
} from 'lucide-react';
import { setCredentials } from '../store/authSlice.js';
import { setCurrentTenant, setAvailableTenants } from '../store/tenantSlice.js';
import { addToast } from '../store/uiSlice.js';
import { Button, Input, Card, ThemeToggle } from '../components/ui/index.js';
import { DEMO_PERSONAS, getDefaultRouteForRole } from '../utils/demoPersonas.js';

export const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleQuickLogin = (demo) => {
    dispatch(setCredentials({ user: demo.user, token: demo.token }));
    dispatch(setAvailableTenants([demo.tenant]));
    dispatch(setCurrentTenant(demo.tenant));
    dispatch(
      addToast({
        type: 'success',
        title: 'Authentication Successful',
        message: `Signed in as ${demo.user.full_name} (${demo.roleLabel})`
      })
    );
    navigate(demo.defaultRoute || getDefaultRouteForRole(demo.user.role));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: 'Please provide your work email address'
        })
      );
      return;
    }

    // Match with existing demo or default to Alex
    const matched =
      DEMO_PERSONAS.find((p) => p.user.email.toLowerCase() === email.trim().toLowerCase()) ||
      DEMO_PERSONAS[0];

    handleQuickLogin(matched);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden transition-colors">
      {/* Top Bar with Landing link & theme switcher */}
      <div className="absolute top-4 left-4 sm:left-8 z-20 flex items-center gap-3">
        <Link
          to="/landing"
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          <span>Back to Landing</span>
        </Link>
      </div>

      <div className="absolute top-4 right-4 sm:right-8 z-20">
        <ThemeToggle />
      </div>

      {/* Ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 items-center justify-center shadow-lg shadow-indigo-600/30">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            OpsPilot Platform
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-Tenant Enterprise Operations & Workforce Management
          </p>
        </div>

        {/* Login Card */}
        <Card variant="elevated" className="p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
              autoComplete="email"
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" size="md">
              <span>Sign In to Workspace</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick 1-Click Role Switcher */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Instant 1-Click Role Logins:</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                All 5 Roles Ready
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_PERSONAS.map((demo) => {
                const getRoleIcon = (roleId) => {
                  switch (roleId) {
                    case 'superadmin':
                      return ShieldCheck;
                    case 'manager':
                      return CalendarCheck;
                    case 'employee':
                      return Users;
                    case 'customer':
                      return Send;
                    default:
                      return Building2;
                  }
                };
                const Icon = getRoleIcon(demo.roleId);

                return (
                  <button
                    key={demo.user.id}
                    type="button"
                    onClick={() => handleQuickLogin(demo)}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-850 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800/80 transition text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 block truncate">
                          {demo.user.full_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">
                          {demo.roleLabel} • {demo.tenant.name}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-500">
          Need an organization account?{' '}
          <Link
            to="/register"
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Create an Enterprise Tenant
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

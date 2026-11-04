import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { loginSchema } from '../features/auth/schemas/authSchemas.js';
import { useLoginMutation } from '../features/auth/api/authApi.js';
import { setCredentials } from '../store/authSlice.js';
import { setCurrentTenant, setAvailableTenants } from '../store/tenantSlice.js';
import { addToast } from '../store/uiSlice.js';
import { Button, Card, ThemeToggle } from '../components/ui/index.js';
import { FormInput, FormCheckbox } from '../components/form/index.js';
import { DEMO_PERSONAS, getDefaultRouteForRole } from '../utils/demoPersonas.js';

export const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true
    }
  });

  const redirectAfterLogin = (role) => {
    const from = location.state?.from?.pathname || getDefaultRouteForRole(role);
    navigate(from, { replace: true });
  };

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
    redirectAfterLogin(demo.user.role);
  };

  const onSubmit = async (values) => {
    try {
      const data = await loginMutation.mutateAsync({
        email: values.email,
        password: values.password
      });
      redirectAfterLogin(data.user?.role || 'owner');
    } catch {
      // Fallback: check if matches any demo persona email in development mode
      const matched = DEMO_PERSONAS.find(
        (p) => p.user.email.toLowerCase() === values.email.trim().toLowerCase()
      );
      if (matched) {
        handleQuickLogin(matched);
      }
    }
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormInput
              id="email"
              name="email"
              label="Work Email"
              type="email"
              register={register}
              error={errors.email}
              placeholder="name@company.com"
              icon={Mail}
              autoComplete="email"
              required
            />

            <div className="relative">
              <FormInput
                id="password"
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                register={register}
                error={errors.password}
                placeholder="••••••••••••"
                icon={Lock}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <FormCheckbox
                id="rememberMe"
                name="rememberMe"
                label="Remember me"
                register={register}
              />

              <Link
                to="/forgot-password"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="md"
              disabled={loginMutation.isPending}
            >
              <span>
                {loginMutation.isPending ? 'Verifying Session...' : 'Sign In to Workspace'}
              </span>
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

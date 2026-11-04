import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layers, Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { resetPasswordSchema } from '../features/auth/schemas/authSchemas.js';
import { useResetPasswordMutation } from '../features/auth/api/authApi.js';
import { Button, Card, ThemeToggle } from '../components/ui/index.js';
import { FormInput } from '../components/form/index.js';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [token, setToken] = useState('');

  const resetMutation = useResetPasswordMutation();

  useEffect(() => {
    // Check search params or hash for recovery token
    const paramToken = searchParams.get('token') || searchParams.get('access_token');
    if (paramToken) {
      setToken(paramToken);
    } else if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashToken = hashParams.get('access_token');
      if (hashToken) {
        setToken(hashToken);
      }
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (values) => {
    try {
      await resetMutation.mutateAsync({
        newPassword: values.password,
        accessToken: token
      });
      setResetSuccess(true);
    } catch {
      // Handled by mutation toast
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden transition-colors">
      <div className="absolute top-4 right-4 sm:right-8 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 items-center justify-center shadow-lg shadow-indigo-600/30">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Set New Password
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose a strong, unique password to secure your OpsPilot workspace account
          </p>
        </div>

        <Card variant="elevated" className="p-6 sm:p-8 space-y-5">
          {resetSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Password Updated Successfully
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your password has been changed. You can now authenticate with your new
                  credentials.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="relative">
                <FormInput
                  id="password"
                  name="password"
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  register={register}
                  error={errors.password}
                  placeholder="••••••••••••"
                  icon={Lock}
                  helperText="Must be at least 8 characters long"
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

              <FormInput
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                register={register}
                error={errors.confirmPassword}
                placeholder="••••••••••••"
                icon={Lock}
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="md"
                disabled={resetMutation.isPending}
              >
                <span>
                  {resetMutation.isPending ? 'Updating Password...' : 'Save New Password'}
                </span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}
        </Card>

        <div className="text-center text-xs text-slate-500">
          Remembered your password?{' '}
          <Link
            to="/login"
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

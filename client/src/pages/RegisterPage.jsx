import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { registerSchema } from '../features/auth/schemas/authSchemas.js';
import { useRegisterMutation } from '../features/auth/api/authApi.js';
import { Button, Card, ThemeToggle } from '../components/ui/index.js';
import { FormInput, FormCheckbox } from '../components/form/index.js';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      organizationName: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false
    }
  });

  const passwordValue = watch('password', '');

  // Calculate password strength
  const getPasswordStrength = () => {
    if (!passwordValue) return 0;
    let score = 0;
    if (passwordValue.length >= 8) score += 25;
    if (/[A-Z]/.test(passwordValue)) score += 25;
    if (/[0-9]/.test(passwordValue)) score += 25;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score += 25;
    return score;
  };

  const strength = getPasswordStrength();
  const strengthColor =
    strength <= 25
      ? 'bg-rose-500'
      : strength <= 50
        ? 'bg-amber-500'
        : strength <= 75
          ? 'bg-blue-500'
          : 'bg-emerald-500';

  const onSubmit = async (values) => {
    try {
      await registerMutation.mutateAsync({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        organizationName: values.organizationName,
        subscriptionTier: 'starter'
      });
      setRegisteredEmail(values.email);
      setRegisteredSuccess(true);
    } catch {
      // Error handled by mutation onError toast
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden transition-colors">
      <div className="absolute top-4 left-4 sm:left-8 z-20 flex items-center gap-3">
        <Link
          to="/login"
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <div className="absolute top-4 right-4 sm:right-8 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 items-center justify-center shadow-lg shadow-indigo-600/30">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Create an Enterprise Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Deploy an isolated multi-tenant instance for your operational workforce
          </p>
        </div>

        <Card variant="elevated" className="p-6 sm:p-8 space-y-5">
          {registeredSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Registration Successful
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Your tenant organization has been provisioned. A confirmation link has been
                  dispatched to{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{registeredEmail}</strong>.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-3">
                <Link
                  to={`/verify-email?email=${encodeURIComponent(registeredEmail)}`}
                  className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  <span>Verify Email Address</span>
                </Link>

                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  <span>Proceed to Sign In</span>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  id="fullName"
                  name="fullName"
                  label="Full Name"
                  register={register}
                  error={errors.fullName}
                  placeholder="Alex Rivera"
                  icon={User}
                  required
                />

                <FormInput
                  id="email"
                  name="email"
                  label="Work Email"
                  type="email"
                  register={register}
                  error={errors.email}
                  placeholder="alex@acme.com"
                  icon={Mail}
                  required
                />
              </div>

              <FormInput
                id="organizationName"
                name="organizationName"
                label="Organization / Company Name"
                register={register}
                error={errors.organizationName}
                placeholder="Acme Global Operations"
                icon={Building2}
                helperText="This creates your isolated multi-tenant organization."
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  id="password"
                  name="password"
                  label="Master Password"
                  type="password"
                  register={register}
                  error={errors.password}
                  placeholder="••••••••••••"
                  icon={Lock}
                  required
                />

                <FormInput
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  register={register}
                  error={errors.confirmPassword}
                  placeholder="••••••••••••"
                  icon={Lock}
                  required
                />
              </div>

              {/* Password strength bar */}
              {passwordValue && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Password Security:</span>
                    <span>{strength}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strengthColor} transition-all duration-300`}
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                </div>
              )}

              <FormCheckbox
                id="agreeTerms"
                name="agreeTerms"
                label="I accept the Enterprise SaaS Master Terms of Service and Privacy Policy"
                register={register}
                error={errors.agreeTerms}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="md"
                disabled={registerMutation.isPending}
              >
                <span>
                  {registerMutation.isPending
                    ? 'Provisioning Tenant Workspace...'
                    : 'Deploy My Workspace'}
                </span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}
        </Card>

        <div className="text-center text-xs text-slate-500">
          Already have an existing OpsPilot account?{' '}
          <Link
            to="/login"
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Sign in to Workspace
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

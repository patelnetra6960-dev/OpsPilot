import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  Mail,
  KeyRound,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { verifyEmailSchema } from '../features/auth/schemas/authSchemas.js';
import { useVerifyEmailMutation } from '../features/auth/api/authApi.js';
import { Button, Card, ThemeToggle } from '../components/ui/index.js';
import { FormInput } from '../components/form/index.js';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || searchParams.get('code') || '';

  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const verifyMutation = useVerifyEmailMutation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: initialEmail,
      token: initialToken
    }
  });

  // Auto-verify if token is provided in URL parameters
  useEffect(() => {
    if (initialToken) {
      setValue('token', initialToken);
      if (initialEmail) {
        setValue('email', initialEmail);
      }
      verifyMutation
        .mutateAsync({
          email: initialEmail || undefined,
          token: initialToken,
          type: 'signup'
        })
        .then(() => setVerifiedSuccess(true))
        .catch(() => {});
    }
  }, [initialToken, initialEmail, setValue]);

  const onSubmit = async (values) => {
    try {
      await verifyMutation.mutateAsync({
        email: values.email || undefined,
        token: values.token,
        type: 'signup'
      });
      setVerifiedSuccess(true);
    } catch {
      // Handled by mutation toast
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

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 items-center justify-center shadow-lg shadow-indigo-600/30">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Verify Email Address
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Confirm your account email to activate organization workspace access
          </p>
        </div>

        <Card variant="elevated" className="p-6 sm:p-8 space-y-5">
          {verifiedSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Email Verified Successfully
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your email address has been confirmed and your organization account is active.
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
              <FormInput
                id="email"
                name="email"
                label="Registered Email"
                type="email"
                register={register}
                error={errors.email}
                placeholder="name@company.com"
                icon={Mail}
              />

              <FormInput
                id="token"
                name="token"
                label="Verification Code / OTP Token"
                register={register}
                error={errors.token}
                placeholder="Enter 6-digit code or paste token"
                icon={KeyRound}
                helperText="Enter the verification code received in your inbox"
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="md"
                disabled={verifyMutation.isPending}
              >
                <span>
                  {verifyMutation.isPending ? 'Verifying Code...' : 'Confirm Verification'}
                </span>
                <ShieldCheck className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;

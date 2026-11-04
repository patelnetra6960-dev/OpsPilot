import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { setCredentials } from '../store/authSlice.js';
import { setCurrentTenant, setAvailableTenants } from '../store/tenantSlice.js';
import { addToast } from '../store/uiSlice.js';
import { Button, Input, Select, Card, ThemeToggle } from '../components/ui/index.js';

export const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = Personal Details, 2 = Organization Setup

  // Step 1 State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('owner');

  // Step 2 State
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [industry, setIndustry] = useState('logistics');
  const [teamSize, setTeamSize] = useState('10-50');
  const [subscriptionTier, setSubscriptionTier] = useState('growth');

  const handleNameChange = (name) => {
    setFullName(name);
  };

  const handleOrgNameChange = (name) => {
    setOrgName(name);
    // Auto-generate clean slug
    const generated = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setOrgSlug(generated);
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };

  const strength = getPasswordStrength();

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Validation Failed',
          message: 'Please complete all required fields'
        })
      );
      return;
    }
    if (password.length < 8) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Weak Password',
          message: 'Password must be at least 8 characters'
        })
      );
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    if (!orgName.trim() || !orgSlug.trim()) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Validation Failed',
          message: 'Organization name and slug are required'
        })
      );
      return;
    }

    const newTenant = {
      id: `tenant-${Date.now()}`,
      name: orgName.trim(),
      slug: orgSlug.trim(),
      subscription_tier: subscriptionTier,
      role: role
    };

    const newUser = {
      id: `user-${Date.now()}`,
      email: email.trim(),
      full_name: fullName.trim(),
      role: role,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`
    };

    const token = `token-${Date.now()}`;

    dispatch(setCredentials({ user: newUser, token }));
    dispatch(setAvailableTenants([newTenant]));
    dispatch(setCurrentTenant(newTenant));

    dispatch(
      addToast({
        type: 'success',
        title: 'Organization Provisioned',
        message: `Welcome to OpsPilot! ${newTenant.name} is ready.`
      })
    );

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden transition-colors">
      <div className="absolute top-4 left-4 sm:left-8 z-20 flex items-center gap-3">
        <Link
          to="/landing"
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing</span>
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
            Create Your Enterprise Tenant
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Step {step} of 2 — {step === 1 ? 'Personal Profile & Role' : 'Organization & Tier'}
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center justify-center gap-2">
          <div
            className={`w-20 h-1.5 rounded-full transition-colors ${
              step >= 1 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
            }`}
          />
          <div
            className={`w-20 h-1.5 rounded-full transition-colors ${
              step >= 2 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
            }`}
          />
        </div>

        <Card variant="elevated" className="p-6 sm:p-8 space-y-5">
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Jane Doe"
                leftIcon={<Users className="w-4 h-4 text-slate-400" />}
                required
              />

              <Input
                label="Work Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                required
              />

              <div className="space-y-1">
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters, uppercase & special"
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                  required
                />
                {password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Password strength:</span>
                      <span className="font-semibold capitalize">
                        {strength <= 25
                          ? 'Weak'
                          : strength <= 50
                            ? 'Fair'
                            : strength <= 75
                              ? 'Good'
                              : 'Strong'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength <= 25
                            ? 'bg-rose-500 w-1/4'
                            : strength <= 50
                              ? 'bg-amber-500 w-2/4'
                              : strength <= 75
                                ? 'bg-blue-500 w-3/4'
                                : 'bg-emerald-500 w-full'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Select
                label="Primary Role in Organization"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={[
                  { value: 'owner', label: 'Organization Owner / Executive' },
                  { value: 'admin', label: 'Operations Administrator' },
                  { value: 'manager', label: 'Field Operations Manager' }
                ]}
              />

              <Button type="submit" variant="primary" className="w-full mt-2" size="md">
                <span>Continue to Organization Setup</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <Input
                label="Organization Name"
                type="text"
                value={orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                placeholder="e.g. Apex Logistics Solutions"
                leftIcon={<Building2 className="w-4 h-4 text-slate-400" />}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tenant URL Slug (Subdomain)
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                  <span className="text-slate-400">opspilot.io/</span>
                  <input
                    type="text"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    className="bg-transparent focus:outline-none flex-1 ml-1 font-bold text-indigo-600 dark:text-indigo-400"
                    placeholder="apex-logistics"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  options={[
                    { value: 'logistics', label: 'Logistics & Freight' },
                    { value: 'field-services', label: 'Field Services' },
                    { value: 'construction', label: 'Construction' },
                    { value: 'healthcare', label: 'Healthcare Ops' },
                    { value: 'retail', label: 'Retail & Warehousing' }
                  ]}
                />

                <Select
                  label="Expected Team Size"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  options={[
                    { value: '1-10', label: '1 - 10 staff' },
                    { value: '10-50', label: '10 - 50 staff' },
                    { value: '50-250', label: '50 - 250 staff' },
                    { value: '250+', label: '250+ enterprise' }
                  ]}
                />
              </div>

              <Select
                label="Subscription Tier"
                value={subscriptionTier}
                onChange={(e) => setSubscriptionTier(e.target.value)}
                options={[
                  { value: 'starter', label: 'Starter Tier ($99/mo) — 14-day free trial' },
                  { value: 'growth', label: 'Growth Tier ($299/mo) — Most Popular' },
                  { value: 'enterprise', label: 'Enterprise Tier ($799/mo) — Full RLS Audit' }
                ]}
              />

              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-300">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Isolated PostgreSQL schema partition automatically initialized upon creation.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(1)}
                  className="w-1/3"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  <span>Back</span>
                </Button>

                <Button type="submit" variant="primary" className="w-2/3" size="md">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  <span>Provision Tenant</span>
                </Button>
              </div>
            </form>
          )}
        </Card>

        <div className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link
            to="/login"
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Sign in to existing workspace
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

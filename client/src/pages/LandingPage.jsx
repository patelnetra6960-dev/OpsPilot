import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Layers,
  Shield,
  ArrowRight,
  CheckCircle2,
  Users,
  CalendarCheck,
  Send,
  FolderLock,
  History,
  Lock,
  Sparkles,
  Zap,
  Building2
} from 'lucide-react';
import { ThemeToggle } from '../components/ui/index.js';
import { DEMO_PERSONAS, getDefaultRouteForRole } from '../utils/demoPersonas.js';
import { setCredentials } from '../store/authSlice.js';
import { setCurrentTenant, setAvailableTenants } from '../store/tenantSlice.js';
import { addToast } from '../store/uiSlice.js';

export const LandingPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activePersonaTab, setActivePersonaTab] = useState('owner');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  const handleLaunchPersona = (persona) => {
    dispatch(setCredentials({ user: persona.user, token: persona.token }));
    dispatch(setAvailableTenants([persona.tenant]));
    dispatch(setCurrentTenant(persona.tenant));
    dispatch(
      addToast({
        type: 'success',
        title: 'Demo Session Active',
        message: `Welcome, ${persona.user.full_name} (${persona.roleLabel})`
      })
    );
    navigate(getDefaultRouteForRole(persona.user.role));
  };

  const personaDetails = {
    owner: {
      title: 'Organization Admin (Owner)',
      headline: 'Complete Operations Oversight & Tenant Control',
      description:
        'Empowers executive leadership to orchestrate workforce members, oversee multi-site shift rotas, configure automated dispatch workflows, and monitor real-time company performance.',
      highlights: [
        'Centralized workforce directory with role-based permissions',
        'Dynamic multi-site shift scheduling & overtime controls',
        'Direct integration with client accounts and invoice generation',
        'PostgreSQL Row-Level Security guarantee across all tenant records'
      ],
      persona: DEMO_PERSONAS.find((p) => p.roleId === 'owner')
    },
    superadmin: {
      title: 'Super Admin (Platform Operator)',
      headline: 'Global SaaS Multi-Tenant Infrastructure Governance',
      description:
        'Single pane of glass for platform operators to provision tenants, manage subscription tiers, monitor database health metrics, and audit system-wide security logs.',
      highlights: [
        'Multi-tenant provisioning & tier upgrade engine',
        'System health telemetry, API response monitoring & error rates',
        'Global immutable audit trail across every active organization',
        'Zero-trust tenant isolation with hardware-level cryptographic tokens'
      ],
      persona: DEMO_PERSONAS.find((p) => p.roleId === 'superadmin')
    },
    manager: {
      title: 'Operations Manager',
      headline: 'Real-Time Dispatch & Field Workforce Coordination',
      description:
        'Purpose-built for operational managers to assign dispatches, approve timesheets, manage daily shift rosters, and verify team attendance in real time.',
      highlights: [
        'Live technician dispatch board with status tracking',
        '1-click timesheet review, approval, and overtime verification',
        'Daily rota management with drag-and-drop shift assignments',
        'Incident reporting and field work order lifecycles'
      ],
      persona: DEMO_PERSONAS.find((p) => p.roleId === 'manager')
    },
    employee: {
      title: 'Field Employee & Technician',
      headline: 'Frictionless Mobile-First Self-Service Portal',
      description:
        'Frontline staff can view their shifts, punch clock-in/out with GPS verification, review assigned work orders, and access certifications from anywhere.',
      highlights: [
        'One-tap mobile clock-in/out with timestamp & GPS coordinates',
        'Personal weekly schedule with upcoming shift reminders',
        'Assigned task checklists with proof-of-work updates',
        'Digital credential and safety certificate vault'
      ],
      persona: DEMO_PERSONAS.find((p) => p.roleId === 'employee')
    },
    customer: {
      title: 'Customer Client Portal',
      headline: 'Transparent Live Service Tracking for Business Clients',
      description:
        'Give clients real-time visibility into their service requests, active dispatches, completed work orders, and digital invoices without phone tag.',
      highlights: [
        'Real-time work order progress stepper and technician ETA',
        'Online service request submission with priority tagging',
        'Downloadable invoice statements and service reports',
        'Direct communication history with assigned operations leads'
      ],
      persona: DEMO_PERSONAS.find((p) => p.roleId === 'customer')
    }
  };

  const selectedPersonaData = personaDetails[activePersonaTab];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                OpsPilot
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Enterprise
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#features"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              Features
            </a>
            <a
              href="#personas"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              Roles & Personas
            </a>
            <a
              href="#architecture"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              Architecture
            </a>
            <a
              href="#pricing"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-xl transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Generation Multi-Tenant Operations Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
            Enterprise Workforce & Operations Management,{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 bg-clip-text text-transparent">
              Built for Scale
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Unify shift scheduling, real-time field dispatch, mobile clock-in attendance, and
            encrypted document vaults across every tenant. Powered by PostgreSQL Row-Level Security.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-xl shadow-indigo-600/25 transition flex items-center gap-2"
            >
              <span>Start 14-Day Enterprise Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={() => handleLaunchPersona(DEMO_PERSONAS[0])}
              className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-bold transition flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Launch 1-Click Interactive Demo</span>
            </button>
          </div>

          {/* Social Proof Stats */}
          <div className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">99.99%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Platform SLA Uptime
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">100%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Postgres RLS Isolation
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">50k+</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monthly Shifts Scheduled
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">5 Roles</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tailored Navigation Portals
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Personas Showcase Section */}
      <section
        id="personas"
        className="py-20 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Role-Specific Workflows
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
              Five Dedicated Personas, Zero Compromises
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm">
              Each user role gets a dedicated navigation structure and interactive dashboard
              tailored to their responsibilities.
            </p>
          </div>

          {/* Persona Tabs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'owner', label: 'Org Admin', icon: Building2 },
              { id: 'superadmin', label: 'Super Admin', icon: Shield },
              { id: 'manager', label: 'Manager', icon: CalendarCheck },
              { id: 'employee', label: 'Field Employee', icon: Users },
              { id: 'customer', label: 'Customer Client', icon: Send }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activePersonaTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePersonaTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Persona Showcase Content Card */}
          <div className="mt-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5 text-left">
                <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800/80">
                  {selectedPersonaData.title}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedPersonaData.headline}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedPersonaData.description}
                </p>

                <div className="space-y-3 pt-2">
                  {selectedPersonaData.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => handleLaunchPersona(selectedPersonaData.persona)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20"
                  >
                    <span>Launch Portal as {selectedPersonaData.persona.user.full_name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Persona Mock Preview Box */}
              <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <img
                    src={selectedPersonaData.persona.user.avatar_url}
                    alt={selectedPersonaData.persona.user.full_name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/30"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedPersonaData.persona.user.full_name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {selectedPersonaData.persona.user.title}
                    </div>
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                      Org: {selectedPersonaData.persona.tenant.name}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                    <span className="text-slate-400">Target Route:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                      {selectedPersonaData.persona.defaultRoute}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                    <span className="text-slate-400">Access Scope:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Multi-Tenant Isolated
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Mock Auth Token:</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate max-w-[150px]">
                      {selectedPersonaData.persona.token}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Modular Monolith Capabilities
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
              Every Tool Operations Leaders Need
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Dual-Tier Multi-Tenancy',
                description:
                  'Backend middleware verification paired with PostgreSQL Row-Level Security prevents data contamination even if application code is bypassed.'
              },
              {
                icon: CalendarCheck,
                title: 'Smart Shift Scheduling',
                description:
                  'Build recurring rotas, manage shift swaps, enforce overtime limits, and balance hours across distributed field teams.'
              },
              {
                icon: Send,
                title: 'Real-Time Dispatch Board',
                description:
                  'Kanban-style field work order dispatching with status lifecycles: Pending, En Route, On Site, and Completed.'
              },
              {
                icon: FolderLock,
                title: 'Encrypted Document Vault',
                description:
                  'Store technician credentials, compliance forms, and work order proof of completion photos in tenant-isolated S3 buckets.'
              },
              {
                icon: History,
                title: 'Immutable Audit Trail',
                description:
                  'Append-only PostgreSQL audit stream tracking actor identity, IP address, timestamp, and JSON diffs on every record mutation.'
              },
              {
                icon: Lock,
                title: 'Zero Credential Leakage',
                description:
                  'Frontend client bundles strictly anon keys; privileged database operations execute via isolated server-side service tokens.'
              }
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="py-20 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              Transparent Pricing
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
              Scale Your Operations Predictably
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm">
              All plans include complete multi-tenant isolation, real-time dispatch, and Supabase
              RLS.
            </p>

            {/* Billing Toggle */}
            <div className="mt-6 inline-flex items-center p-1 rounded-2xl bg-slate-200 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                tier: 'Starter',
                price: billingCycle === 'monthly' ? '$99' : '$79',
                period: '/month',
                desc: 'Perfect for small operations teams getting started.',
                features: [
                  'Up to 15 workforce members',
                  'Standard shift scheduling & rota',
                  'Mobile clock-in & time log',
                  '10 GB encrypted document storage',
                  'Community support'
                ],
                highlight: false
              },
              {
                tier: 'Growth',
                price: billingCycle === 'monthly' ? '$299' : '$239',
                period: '/month',
                desc: 'For growing service companies with active field dispatch.',
                features: [
                  'Up to 100 workforce members',
                  'Advanced real-time dispatch board',
                  'Customer portal access',
                  '50 GB document storage',
                  'Manager approval workflows',
                  'Priority email & chat support'
                ],
                highlight: true
              },
              {
                tier: 'Enterprise',
                price: billingCycle === 'monthly' ? '$799' : '$639',
                period: '/month',
                desc: 'For large operations requiring immutable audit & custom SLA.',
                features: [
                  'Unlimited workforce members',
                  'Full immutable audit trail & compliance',
                  'Custom roles & permissions',
                  '500 GB document storage',
                  'Dedicated tenant database replica',
                  '24/7 phone & SLA support'
                ],
                highlight: false
              }
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-3xl p-8 border transition flex flex-col justify-between ${
                  plan.highlight
                    ? 'bg-white dark:bg-slate-900 border-indigo-600 ring-2 ring-indigo-600 shadow-2xl relative'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.tier}</h3>
                  <p className="text-xs text-slate-500 mt-1">{plan.desc}</p>
                  <div className="mt-6 flex items-baseline">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">{plan.period}</span>
                  </div>

                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feat, fi) => (
                      <li
                        key={fi}
                        className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Link
                    to="/register"
                    className={`w-full py-3 rounded-xl text-xs font-bold text-center block transition ${
                      plan.highlight
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                    }`}
                  >
                    Get Started with {plan.tier}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              OP
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">OpsPilot SaaS</span>
            <span className="text-xs text-slate-400">© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <Link to="/login" className="hover:text-indigo-600 transition">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-indigo-600 transition">
              Create Tenant
            </Link>
            <a href="#features" className="hover:text-indigo-600 transition">
              Security Overview
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

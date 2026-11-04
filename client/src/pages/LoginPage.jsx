import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Layers, ShieldCheck, UserCheck, ArrowRight, Lock } from 'lucide-react';
import { setCredentials } from '../store/authSlice.js';
import { setCurrentTenant, setAvailableTenants } from '../store/tenantSlice.js';

export const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const demoAccounts = [
    {
      label: 'Alex Rivera — Acme Logistics Global (Owner)',
      email: 'alex.director@acme.com',
      user: {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        email: 'alex.director@acme.com',
        full_name: 'Alex Rivera',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      },
      token: 'mock-token-alex',
      tenant: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Acme Logistics Global',
        slug: 'acme-logistics',
        subscription_tier: 'enterprise',
        role: 'owner'
      }
    },
    {
      label: 'Marcus Vance — Apex Field Services (Owner)',
      email: 'marcus.lead@apex.com',
      user: {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        email: 'marcus.lead@apex.com',
        full_name: 'Marcus Vance',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
      },
      token: 'mock-token-marcus',
      tenant: {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Apex Field Services',
        slug: 'apex-field-services',
        subscription_tier: 'growth',
        role: 'owner'
      }
    },
    {
      label: 'Sarah Chen — Acme Logistics Global (Manager)',
      email: 'sarah.ops@acme.com',
      user: {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        email: 'sarah.ops@acme.com',
        full_name: 'Sarah Chen',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      },
      token: 'mock-token-sarah',
      tenant: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Acme Logistics Global',
        slug: 'acme-logistics',
        subscription_tier: 'enterprise',
        role: 'manager'
      }
    }
  ];

  const handleQuickLogin = (demo) => {
    dispatch(setCredentials({ user: demo.user, token: demo.token }));
    dispatch(setAvailableTenants([demo.tenant]));
    dispatch(setCurrentTenant(demo.tenant));
    navigate('/');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Default fallback to first demo account
    handleQuickLogin(demoAccounts[0]);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 items-center justify-center shadow-xl shadow-indigo-600/30">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">OpsPilot</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Multi-Tenant Enterprise Operations & Workforce Management Platform
          </p>
        </div>

        {/* Demo Fast Login Box */}
        <div className="bg-slate-900/90 border border-indigo-900/40 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <UserCheck className="w-4 h-4" />
            <span>Instant Demo Persona Access (One-Click)</span>
          </div>
          <div className="space-y-2">
            {demoAccounts.map((demo, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickLogin(demo)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-100 group-hover:text-indigo-300">
                    {demo.label}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{demo.email}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
              </button>
            ))}
          </div>
        </div>

        {/* Standard Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Or Sign In with Supabase Auth
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Corporate Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign In to Organization Workspace</span>
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Tenant isolation enforced at backend and database levels</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

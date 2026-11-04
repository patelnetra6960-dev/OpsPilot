import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Building2, ChevronDown, Check, LogOut, ShieldCheck, UserCheck, Menu } from 'lucide-react';
import { setCurrentTenant } from '../store/tenantSlice.js';
import { setCredentials, logout } from '../store/authSlice.js';
import { toggleSidebar } from '../store/uiSlice.js';
import TenantBadge from '../components/common/TenantBadge.jsx';

export const Navbar = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentTenant, availableTenants } = useSelector((state) => state.tenant);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);

  const demoPersonas = [
    {
      label: 'Alex Rivera (Acme Owner)',
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
      label: 'Marcus Vance (Apex Owner)',
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
      label: 'Sarah Chen (Acme Manager)',
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

  const handleSelectTenant = (tenant) => {
    dispatch(setCurrentTenant(tenant));
    setDropdownOpen(false);
  };

  const handleSelectPersona = (persona) => {
    dispatch(setCredentials({ user: persona.user, token: persona.token }));
    dispatch(setCurrentTenant(persona.tenant));
    setPersonaOpen(false);
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Tenant Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-800 text-left transition shadow-sm"
          >
            <div className="w-6 h-6 rounded bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200 leading-none">
                {currentTenant?.name || 'Select Organization'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono leading-none mt-1">
                {currentTenant?.slug || 'no-tenant'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-xl bg-slate-850 border border-slate-700 shadow-2xl p-2 z-50 bg-slate-900">
              <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                Switch Organization (Tenant)
              </div>
              <div className="space-y-1">
                {availableTenants.map((tenant) => {
                  const isSelected = tenant.id === currentTenant?.id;
                  return (
                    <button
                      key={tenant.id}
                      onClick={() => handleSelectTenant(tenant)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                        isSelected
                          ? 'bg-indigo-600/20 border border-indigo-500/30 text-white'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">{tenant.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{tenant.slug}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {currentTenant && (
          <TenantBadge
            role={currentTenant.role || 'member'}
            tier={currentTenant.subscription_tier || 'starter'}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Persona Switcher for Verification & QA */}
        <div className="relative">
          <button
            onClick={() => setPersonaOpen(!personaOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 transition"
            title="Switch demo persona to test multi-tenant access boundaries"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">QA Switcher:</span>
            <span className="font-semibold">{user?.full_name?.split(' ')[0]}</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {personaOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50">
              <div className="text-[11px] font-semibold text-emerald-400 px-3 py-1.5 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> QA Persona Simulation
              </div>
              <div className="space-y-1">
                {demoPersonas.map((persona, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectPersona(persona)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-800 text-slate-200 transition"
                  >
                    <div className="font-semibold text-slate-100">{persona.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Org: {persona.tenant.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <img
            src={
              user?.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
            }
            alt={user?.full_name || 'User'}
            className="w-8 h-8 rounded-full border border-slate-700 object-cover"
          />
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-200 leading-tight">
              {user?.full_name || 'Operations Lead'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono leading-tight">
              {user?.email}
            </span>
          </div>
          <button
            onClick={() => dispatch(logout())}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

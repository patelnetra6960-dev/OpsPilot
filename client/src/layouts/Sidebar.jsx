import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Send,
  FolderLock,
  History,
  Building2,
  Shield,
  Layers
} from 'lucide-react';

export const Sidebar = () => {
  const { currentTenant } = useSelector((state) => state.tenant);
  const { sidebarOpen } = useSelector((state) => state.ui);

  const navItems = [
    { label: 'Operations Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Workforce Directory', path: '/workforce', icon: Users },
    { label: 'Shift Scheduling', path: '/shifts', icon: CalendarCheck, badge: 'M4' },
    { label: 'Field Dispatch & Assets', path: '/dispatch', icon: Send, badge: 'M5' },
    { label: 'Document Vault', path: '/documents', icon: FolderLock, badge: 'M6' },
    { label: 'Audit Trail', path: '/audit', icon: History, badge: 'M7' },
    { label: 'Organization & Tenants', path: '/organizations', icon: Building2 }
  ];

  return (
    <aside
      className={`w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between fixed lg:static top-0 bottom-0 left-0 z-40 transition-transform duration-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              OpsPilot
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono font-medium border border-indigo-500/30">
                SaaS
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium -mt-0.5">Enterprise Operations</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Tenant Security Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Shield className="w-4 h-4" />
            <span>Multi-Tenant RLS Active</span>
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed">
            Data boundary isolated to <span className="font-semibold text-slate-200">{currentTenant?.name || 'Tenant'}</span>.
          </div>
          <div className="text-[9px] font-mono text-slate-400 truncate pt-1 border-t border-slate-800">
            ID: {currentTenant?.id}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

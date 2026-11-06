import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Send,
  FolderLock,
  History,
  Building2,
  Shield,
  Layers,
  Settings,
  CreditCard,
  Clock,
  Server,
  X,
  Briefcase,
  Boxes,
  Receipt,
  BarChart3,
  Inbox,
  Wrench,
  Activity,
  Search,
  Sparkles
} from 'lucide-react';
import { setSidebarOpen } from '../store/uiSlice.js';

export const Sidebar = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const { user } = useSelector((state) => state.auth);
  const { sidebarOpen } = useSelector((state) => state.ui);

  const role = user?.role || 'owner';

  // Role-specific navigation definitions
  let navGroups = [];

  if (role === 'superadmin') {
    navGroups = [
      {
        title: 'Platform Control',
        items: [
          { label: 'Platform Overview', path: '/super-admin', icon: LayoutDashboard },
          { label: 'Tenant Directory', path: '/super-admin/tenants', icon: Building2 },
          {
            label: 'Subscriptions & Billing',
            path: '/super-admin/subscriptions',
            icon: CreditCard
          },
          { label: 'AI Business Assistant', path: '/assistant', icon: Sparkles },
          { label: 'System Diagnostics', path: '/super-admin/system-health', icon: Server },
          { label: 'Global Audit Trail', path: '/super-admin/audit', icon: History }
        ]
      },
      {
        title: 'Platform Configuration',
        items: [{ label: 'Platform Settings', path: '/settings', icon: Settings }]
      }
    ];
  } else if (role === 'manager') {
    navGroups = [
      {
        title: 'Operations Command',
        items: [
          { label: 'Dispatch Center', path: '/manager', icon: LayoutDashboard },
          { label: 'AI Business Assistant', path: '/assistant', icon: Sparkles },
          { label: 'Team Shift Rota', path: '/shifts', icon: CalendarCheck },
          { label: 'Work Orders', path: '/workorders', icon: Wrench },
          { label: 'Field Dispatches', path: '/dispatch', icon: Send },
          { label: 'Tasks & Kanban', path: '/tasks', icon: Activity }
        ]
      },
      {
        title: 'Team & Logistics',
        items: [
          { label: 'Timesheet Approvals', path: '/manager/timesheets', icon: Clock },
          { label: 'Team Attendance', path: '/manager/attendance', icon: Users },
          { label: 'Service Requests', path: '/services', icon: Inbox },
          { label: 'Inventory & Parts', path: '/inventory', icon: Boxes },
          { label: 'Assets & Equipment', path: '/assets', icon: Wrench },
          { label: 'Expenses', path: '/expenses', icon: Receipt },
          { label: 'Global Search & Export', path: '/search', icon: Search },
          { label: 'Document Vault', path: '/documents', icon: FolderLock }
        ]
      },
      {
        title: 'Preferences',
        items: [{ label: 'Manager Settings', path: '/settings', icon: Settings }]
      }
    ];
  } else if (role === 'employee') {
    navGroups = [
      {
        title: 'Self-Service Portal',
        items: [
          { label: 'My Dashboard', path: '/portal', icon: LayoutDashboard },
          { label: 'My Shift Schedule', path: '/portal/schedule', icon: CalendarCheck },
          { label: 'Clock-In & Hours', path: '/portal/attendance', icon: Clock },
          { label: 'Assigned Work Orders', path: '/portal/tasks', icon: Send },
          { label: 'Search & Records', path: '/search', icon: Search },
          { label: 'My Certifications', path: '/portal/documents', icon: FolderLock }
        ]
      },
      {
        title: 'Account',
        items: [{ label: 'Profile Settings', path: '/settings', icon: Settings }]
      }
    ];
  } else if (role === 'customer') {
    navGroups = [
      {
        title: 'Customer Services',
        items: [
          { label: 'Service Hub', path: '/customer', icon: LayoutDashboard },
          { label: 'My Work Orders', path: '/customer/services', icon: Send },
          { label: 'Search My Records', path: '/search', icon: Search },
          { label: 'Request Service', path: '/customer/request', icon: CalendarCheck }
        ]
      },
      {
        title: 'Billing & Records',
        items: [
          { label: 'Invoices & Statements', path: '/customer/invoices', icon: CreditCard },
          { label: 'Shared Documents', path: '/customer/documents', icon: FolderLock }
        ]
      },
      {
        title: 'Account',
        items: [{ label: 'Account Profile', path: '/settings', icon: Settings }]
      }
    ];
  } else {
    // Org Admin / Owner
    navGroups = [
      {
        title: 'Operations Management',
        items: [
          { label: 'Operations Dashboard', path: '/', icon: LayoutDashboard },
          { label: 'Employee Directory', path: '/workforce', icon: Users },
          { label: 'Shift Scheduling', path: '/shifts', icon: CalendarCheck },
          { label: 'Work Orders', path: '/workorders', icon: Wrench },
          { label: 'Field Dispatch', path: '/dispatch', icon: Send },
          { label: 'Tasks & Kanban', path: '/tasks', icon: Activity },
          { label: 'Client Projects', path: '/projects', icon: Briefcase }
        ]
      },
      {
        title: 'Logistics & Resources',
        items: [
          { label: 'Service Requests', path: '/services', icon: Inbox },
          { label: 'Inventory & Parts', path: '/inventory', icon: Boxes },
          { label: 'Assets & Equipment', path: '/assets', icon: Wrench },
          { label: 'Expenses', path: '/expenses', icon: Receipt },
          { label: 'Global Search & Export', path: '/search', icon: Search },
          { label: 'Document Vault', path: '/documents', icon: FolderLock }
        ]
      },
      {
        title: 'Business & Analytics',
        items: [
          { label: 'Analytics & KPIs', path: '/analytics', icon: BarChart3 },
          { label: 'AI Business Assistant', path: '/assistant', icon: Sparkles },
          { label: 'Clients & Accounts', path: '/clients', icon: Building2 },
          { label: 'Invoices & Billing', path: '/invoices', icon: CreditCard },
          { label: 'Audit Trail', path: '/audit', icon: History }
        ]
      },
      {
        title: 'Configuration',
        items: [
          { label: 'Organization & Tenants', path: '/organizations', icon: Building2 },
          { label: 'Settings & Security', path: '/settings', icon: Settings }
        ]
      }
    ];
  }

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      dispatch(setSidebarOpen(false));
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-35 lg:hidden transition-opacity"
          onClick={() => dispatch(setSidebarOpen(false))}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between fixed lg:static top-0 bottom-0 left-0 z-40 transition-transform duration-200 ease-in-out shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  OpsPilot
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold border border-indigo-500/20">
                    SaaS
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium -mt-0.5">
                  Enterprise Operations
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => dispatch(setSidebarOpen(false))}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links with Group Headers */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-5">
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                <div className="px-3.5 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={
                        item.path === '/' ||
                        item.path === '/super-admin' ||
                        item.path === '/manager' ||
                        item.path === '/portal' ||
                        item.path === '/customer'
                      }
                      onClick={handleLinkClick}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition group ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Tenant Security Status Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 shrink-0">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Multi-Tenant RLS Active</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Boundary:{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold truncate block">
                {currentTenant?.name || 'Acme Logistics'}
              </strong>
            </div>
            <div className="text-[9px] font-mono text-slate-400 truncate pt-1 border-t border-slate-100 dark:border-slate-800">
              Role: <span className="capitalize font-semibold">{role}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

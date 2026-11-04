import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Search,
  X,
  Layers,
  Users,
  CalendarCheck,
  Send,
  FolderLock,
  History,
  Building2,
  Settings,
  ShieldCheck,
  User,
  ArrowRight,
  Sun,
  Moon,
  Clock,
  Briefcase,
  Boxes,
  Receipt,
  BarChart3,
  Inbox,
  Wrench,
  Activity
} from 'lucide-react';
import { closeSearchModal, toggleTheme, addToast } from '../../store/uiSlice.js';

export const GlobalSearchModal = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { searchModalOpen, theme } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);
  const { currentTenant } = useSelector((state) => state.tenant);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Search items database
  const searchIndex = [
    // Pages
    {
      id: 'page-dash',
      title: 'Operations Dashboard',
      subtitle: 'Real-time overview of workforce & operations',
      category: 'Navigation',
      icon: Layers,
      action: () => navigate('/')
    },
    {
      id: 'page-workforce',
      title: 'Workforce Directory',
      subtitle: 'Manage active staff, roles, and profiles',
      category: 'Navigation',
      icon: Users,
      action: () => navigate('/workforce')
    },
    {
      id: 'page-shifts',
      title: 'Shift Scheduling & Rota',
      subtitle: 'Schedule shifts, rosters, and overtime',
      category: 'Navigation',
      icon: CalendarCheck,
      action: () => navigate('/shifts')
    },
    {
      id: 'page-dispatch',
      title: 'Field Dispatch & Assets',
      subtitle: 'Dispatch jobs, track status, and view equipment',
      category: 'Navigation',
      icon: Send,
      action: () => navigate('/dispatch')
    },
    {
      id: 'page-clients',
      title: 'Clients & Accounts',
      subtitle: 'Customer directories and client accounts',
      category: 'Navigation',
      icon: Building2,
      action: () => navigate('/clients')
    },
    {
      id: 'page-documents',
      title: 'Document Vault',
      subtitle: 'Encrypted tenant documents & certificates',
      category: 'Navigation',
      icon: FolderLock,
      action: () => navigate('/documents')
    },
    {
      id: 'page-invoices',
      title: 'Invoices & Billing',
      subtitle: 'Billing records, statements, and payment status',
      category: 'Navigation',
      icon: Clock,
      action: () => navigate('/invoices')
    },
    {
      id: 'page-audit',
      title: 'Audit Trail',
      subtitle: 'Immutable PostgreSQL multi-tenant audit logs',
      category: 'Navigation',
      icon: History,
      action: () => navigate('/audit')
    },
    {
      id: 'page-projects',
      title: 'Projects & Milestones',
      subtitle: 'Client project delivery, burndown, and milestones',
      category: 'Navigation',
      icon: Briefcase,
      action: () => navigate('/projects')
    },
    {
      id: 'page-tasks',
      title: 'Task Management & Kanban',
      subtitle: 'Field maintenance tasks and 4-column kanban board',
      category: 'Navigation',
      icon: Activity,
      action: () => navigate('/tasks')
    },
    {
      id: 'page-services',
      title: 'Service Request Management',
      subtitle: 'Customer request intake and work order conversion',
      category: 'Navigation',
      icon: Inbox,
      action: () => navigate('/services')
    },
    {
      id: 'page-workorders',
      title: 'Work Order Management',
      subtitle: 'Field work orders, cost estimates, and checklists',
      category: 'Navigation',
      icon: Wrench,
      action: () => navigate('/workorders')
    },
    {
      id: 'page-inventory',
      title: 'Inventory & Spare Parts',
      subtitle: 'Warehouse inventory, stock levels, and part registry',
      category: 'Navigation',
      icon: Boxes,
      action: () => navigate('/inventory')
    },
    {
      id: 'page-expenses',
      title: 'Operational Expenses',
      subtitle: 'Field expense claims, fuel costs, and approvals',
      category: 'Navigation',
      icon: Receipt,
      action: () => navigate('/expenses')
    },
    {
      id: 'page-analytics',
      title: 'Operations Analytics & KPIs',
      subtitle: 'Executive metrics, revenue vs costs, and SLA compliance',
      category: 'Navigation',
      icon: BarChart3,
      action: () => navigate('/analytics')
    },
    {
      id: 'page-settings',
      title: 'Settings & Preferences',
      subtitle: 'Profile, organization, security, and notification settings',
      category: 'Navigation',
      icon: Settings,
      action: () => navigate('/settings')
    },

    // Sample Workforce / People
    {
      id: 'person-alex',
      title: 'Alex Rivera',
      subtitle: 'Owner & Managing Director — alex.director@acme.com',
      category: 'People',
      icon: User,
      action: () => navigate('/workforce')
    },
    {
      id: 'person-sarah',
      title: 'Sarah Chen',
      subtitle: 'Operations Manager — sarah.ops@acme.com',
      category: 'People',
      icon: User,
      action: () => navigate('/workforce')
    },
    {
      id: 'person-david',
      title: 'David Kim',
      subtitle: 'Senior Field Technician — david.kim@acme.com',
      category: 'People',
      icon: User,
      action: () => navigate('/workforce')
    },

    // Quick Actions
    {
      id: 'action-theme',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: 'Toggle platform visual appearance',
      category: 'Actions',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => {
        dispatch(toggleTheme());
        dispatch(
          addToast({
            type: 'info',
            title: 'Theme Changed',
            message: `Switched to ${theme === 'dark' ? 'Light' : 'Dark'} mode`
          })
        );
      }
    },
    {
      id: 'action-workforce-new',
      title: 'Add Workforce Member',
      subtitle: 'Invite a new team member to this tenant',
      category: 'Actions',
      icon: Users,
      action: () => navigate('/workforce')
    },
    {
      id: 'action-verify-tenant',
      title: 'Verify Tenant RLS Boundary',
      subtitle: `Active tenant: ${currentTenant?.name || 'Acme'} (${currentTenant?.slug})`,
      category: 'Actions',
      icon: ShieldCheck,
      action: () => {
        dispatch(
          addToast({
            type: 'success',
            title: 'RLS Isolated',
            message: `Active tenant: ${currentTenant?.name}`
          })
        );
      }
    }
  ];

  // Role-specific shortcuts
  if (user?.role === 'superadmin') {
    searchIndex.unshift(
      {
        id: 'page-super-admin',
        title: 'Super Admin Platform Control',
        subtitle: 'Global multi-tenant system oversight',
        category: 'Super Admin',
        icon: ShieldCheck,
        action: () => navigate('/super-admin')
      },
      {
        id: 'page-super-tenants',
        title: 'Platform Tenant Directory',
        subtitle: 'Inspect and manage all organizations',
        category: 'Super Admin',
        icon: Building2,
        action: () => navigate('/super-admin/tenants')
      }
    );
  }

  if (user?.role === 'employee') {
    searchIndex.unshift(
      {
        id: 'page-portal',
        title: 'Employee Portal Dashboard',
        subtitle: 'My shifts, attendance, and tasks',
        category: 'Employee',
        icon: User,
        action: () => navigate('/portal')
      },
      {
        id: 'page-portal-clock',
        title: 'Clock In / Clock Out',
        subtitle: 'Punch in with GPS timestamp',
        category: 'Employee',
        icon: Clock,
        action: () => navigate('/portal/attendance')
      }
    );
  }

  if (user?.role === 'customer') {
    searchIndex.unshift(
      {
        id: 'page-customer-portal',
        title: 'Customer Service Hub',
        subtitle: 'Track work orders and live service progress',
        category: 'Customer',
        icon: Building2,
        action: () => navigate('/customer')
      },
      {
        id: 'page-customer-req',
        title: 'Request New Service',
        subtitle: 'Submit a new work order request',
        category: 'Customer',
        icon: Send,
        action: () => navigate('/customer/request')
      }
    );
  }

  const filteredItems = searchIndex.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (searchModalOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchModalOpen]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (searchModalOpen) {
          dispatch(closeSearchModal());
        } else {
          // open modal
          dispatch({ type: 'ui/openSearchModal' });
        }
      } else if (e.key === 'Escape' && searchModalOpen) {
        dispatch(closeSearchModal());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen, dispatch]);

  const handleSelect = (item) => {
    dispatch(closeSearchModal());
    item.action();
  };

  const handleKeyNav = (e) => {
    if (filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  if (!searchModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      onClick={() => dispatch(closeSearchModal())}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyNav}
            placeholder="Search pages, workforce, dispatches, settings... (↑↓ to navigate, ↵ to open)"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md ml-2">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No results found for &quot;{query}&quot;</p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching for workforce, shifts, dispatches, or settings.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div
                          className={`text-xs font-semibold ${
                            isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {item.title}
                        </div>
                        <div
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.category}
                      </span>
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                ↑
              </kbd>{' '}
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                ↓
              </kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                ↵
              </kbd>{' '}
              to select
            </span>
          </div>
          <span>OpsPilot Global Command</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;

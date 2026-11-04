import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useSelector } from 'react-redux';
import { getDefaultRouteForRole } from '../../utils/demoPersonas.js';

const ROUTE_LABELS = {
  '': 'Home',
  'super-admin': 'Super Admin Platform',
  tenants: 'Tenant Directory',
  subscriptions: 'Platform Subscriptions',
  'system-health': 'System Health Diagnostics',
  workforce: 'Workforce Directory',
  shifts: 'Shift Scheduling & Rota',
  dispatch: 'Field Dispatch & Assets',
  clients: 'Clients & Accounts',
  documents: 'Document Vault',
  invoices: 'Financials & Invoices',
  audit: 'Audit Trail',
  manager: 'Manager Operations Hub',
  timesheets: 'Timesheet Approvals',
  attendance: 'Attendance Monitor',
  portal: 'Employee Portal',
  schedule: 'My Schedule',
  tasks: 'Assigned Tasks',
  customer: 'Customer Portal',
  services: 'Service Requests',
  request: 'Request Service',
  settings: 'Settings',
  profile: 'Profile Preferences',
  organization: 'Organization Settings',
  billing: 'Billing & Plans',
  security: 'Security & Audit',
  organizations: 'Organization Directory'
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const homePath = getDefaultRouteForRole(user?.role);

  const pathnames = location.pathname.split('/').filter((x) => x);

  // If on root landing or exact role home, keep it minimal
  if (pathnames.length === 0 || (pathnames.length === 1 && `/${pathnames[0]}` === homePath)) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <li>
          <Link
            to={homePath}
            className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
        </li>

        {pathnames.map((segment, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const label = ROUTE_LABELS[segment] || segment.replace(/-/g, ' ');

          return (
            <React.Fragment key={routeTo}>
              <li aria-hidden="true" className="text-slate-400 dark:text-slate-600">
                <ChevronRight className="w-3.5 h-3.5" />
              </li>
              <li>
                {isLast ? (
                  <span
                    aria-current="page"
                    className="font-semibold text-slate-800 dark:text-slate-200 capitalize"
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    to={routeTo}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition capitalize"
                  >
                    {label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;

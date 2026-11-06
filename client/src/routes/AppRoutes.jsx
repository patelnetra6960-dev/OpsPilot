import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProtectedRoute from './ProtectedRoute.jsx';
import AppLayout from '../layouts/AppLayout.jsx';

// Lightweight Route Loading Spinner
const RouteLoadingFallback = () => (
  <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3">
    <div className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent shadow-sm" />
    <span className="text-xs font-medium text-slate-400">Loading view...</span>
  </div>
);

// Public Authentication Pages (Code-Split)
const LandingPage = lazy(() => import('../pages/LandingPage.jsx'));
const LoginPage = lazy(() => import('../pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('../pages/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage.jsx'));
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage.jsx'));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage.jsx'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));
const AcceptInvitePage = lazy(() => import('../pages/AcceptInvitePage.jsx'));

// Dashboards (Code-Split)
const DashboardPage = lazy(() => import('../pages/DashboardPage.jsx'));
const SuperAdminDashboardPage = lazy(() => import('../pages/superadmin/SuperAdminDashboardPage.jsx'));
const SuperAdminSubscriptionsPage = lazy(() => import('../pages/superadmin/SuperAdminSubscriptionsPage.jsx'));
const SuperAdminSystemHealthPage = lazy(() => import('../pages/superadmin/SuperAdminSystemHealthPage.jsx'));
const ManagerDashboardPage = lazy(() => import('../pages/manager/ManagerDashboardPage.jsx'));
const ManagerTimesheetsPage = lazy(() => import('../pages/manager/ManagerTimesheetsPage.jsx'));
const ManagerAttendancePage = lazy(() => import('../pages/manager/ManagerAttendancePage.jsx'));
const EmployeePortalPage = lazy(() => import('../pages/employee/EmployeePortalPage.jsx'));
const EmployeeSchedulePage = lazy(() => import('../pages/employee/EmployeeSchedulePage.jsx'));
const EmployeeAttendancePage = lazy(() => import('../pages/employee/EmployeeAttendancePage.jsx'));
const EmployeeTasksPage = lazy(() => import('../pages/employee/EmployeeTasksPage.jsx'));
const CustomerPortalPage = lazy(() => import('../pages/customer/CustomerPortalPage.jsx'));
const CustomerServicesPage = lazy(() => import('../pages/customer/CustomerServicesPage.jsx'));
const CustomerRequestServicePage = lazy(() => import('../pages/customer/CustomerRequestServicePage.jsx'));

// Core Operations & Specialized Modules (Code-Split)
const WorkforcePage = lazy(() => import('../pages/WorkforcePage.jsx'));
const ShiftsPage = lazy(() => import('../pages/shifts/ShiftsPage.jsx'));
const DispatchPage = lazy(() => import('../pages/dispatch/DispatchPage.jsx'));
const ClientsPage = lazy(() => import('../pages/clients/ClientsPage.jsx'));
const DocumentsPage = lazy(() => import('../pages/documents/DocumentsPage.jsx'));
const InvoicesPage = lazy(() => import('../pages/invoices/InvoicesPage.jsx'));
const AuditPage = lazy(() => import('../pages/audit/AuditPage.jsx'));
const OrganizationsPage = lazy(() => import('../pages/OrganizationsPage.jsx'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage.jsx'));
const ProjectsPage = lazy(() => import('../pages/projects/ProjectsPage.jsx'));
const ProjectDetailPage = lazy(() => import('../pages/projects/ProjectDetailPage.jsx'));
const TasksKanbanPage = lazy(() => import('../pages/tasks/TasksKanbanPage.jsx'));
const ServiceRequestsPage = lazy(() => import('../pages/services/ServiceRequestsPage.jsx'));
const WorkOrdersPage = lazy(() => import('../pages/workorders/WorkOrdersPage.jsx'));
const InventoryPage = lazy(() => import('../pages/inventory/InventoryPage.jsx'));
const ExpensesPage = lazy(() => import('../pages/expenses/ExpensesPage.jsx'));
const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage.jsx'));
const SearchPage = lazy(() => import('../pages/search/SearchPage.jsx'));
const AIAssistantPage = lazy(() => import('../pages/assistant/AIAssistantPage.jsx'));

// Dynamic Role Home Component for root path ("/")
const DynamicRoleHome = () => {
  const { user } = useSelector((state) => state.auth);

  switch (user?.role) {
    case 'superadmin':
      return <SuperAdminDashboardPage />;
    case 'manager':
      return <ManagerDashboardPage />;
    case 'employee':
      return <EmployeePortalPage />;
    case 'customer':
      return <CustomerPortalPage />;
    case 'owner':
    case 'admin':
    default:
      return <DashboardPage />;
  }
};

export const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/invite/accept" element={<AcceptInvitePage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />

        {/* Protected Multi-Tenant App Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Dynamic Root Route based on verified role */}
            <Route path="/" element={<DynamicRoleHome />} />

            {/* Super Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
              <Route path="/super-admin" element={<SuperAdminDashboardPage />} />
              <Route path="/super-admin/tenants" element={<SuperAdminDashboardPage />} />
              <Route path="/super-admin/subscriptions" element={<SuperAdminSubscriptionsPage />} />
              <Route path="/super-admin/system-health" element={<SuperAdminSystemHealthPage />} />
              <Route path="/super-admin/audit" element={<AuditPage />} />
            </Route>

            {/* Manager Specific Routes */}
            <Route element={<ProtectedRoute allowedRoles={['manager', 'owner', 'admin']} />}>
              <Route path="/manager" element={<ManagerDashboardPage />} />
              <Route path="/manager/timesheets" element={<ManagerTimesheetsPage />} />
              <Route path="/manager/attendance" element={<ManagerAttendancePage />} />
            </Route>

            {/* Employee Specific Portal Routes */}
            <Route
              element={<ProtectedRoute allowedRoles={['employee', 'owner', 'admin', 'manager']} />}
            >
              <Route path="/portal" element={<EmployeePortalPage />} />
              <Route path="/portal/schedule" element={<EmployeeSchedulePage />} />
              <Route path="/portal/attendance" element={<EmployeeAttendancePage />} />
              <Route path="/portal/tasks" element={<EmployeeTasksPage />} />
              <Route path="/portal/documents" element={<DocumentsPage />} />
            </Route>

            {/* Customer Specific Portal Routes */}
            <Route element={<ProtectedRoute allowedRoles={['customer', 'owner', 'admin']} />}>
              <Route path="/customer" element={<CustomerPortalPage />} />
              <Route path="/customer/services" element={<CustomerServicesPage />} />
              <Route path="/customer/request" element={<CustomerRequestServicePage />} />
              <Route path="/customer/invoices" element={<InvoicesPage />} />
              <Route path="/customer/documents" element={<DocumentsPage />} />
            </Route>

            {/* Core Operations & Multi-Tenant Modules */}
            <Route path="/workforce" element={<WorkforcePage />} />
            <Route path="/shifts" element={<ShiftsPage />} />
            <Route path="/shifts/attendance" element={<ManagerAttendancePage />} />
            <Route path="/shifts/schedule" element={<ShiftsPage />} />
            <Route path="/dispatch" element={<DispatchPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/tasks" element={<TasksKanbanPage />} />
            <Route path="/services" element={<ServiceRequestsPage />} />
            <Route path="/workorders" element={<WorkOrdersPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/assets" element={<InventoryPage initialTab="assets" />} />
            <Route path="/assets/:id" element={<InventoryPage initialTab="assets" />} />
            <Route path="/suppliers" element={<InventoryPage initialTab="suppliers" />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/assistant" element={<AIAssistantPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* 404 Route within layout */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

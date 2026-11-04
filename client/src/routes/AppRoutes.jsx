import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProtectedRoute from './ProtectedRoute.jsx';
import AppLayout from '../layouts/AppLayout.jsx';

// Public Authentication Pages
import LandingPage from '../pages/LandingPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx';
import VerifyEmailPage from '../pages/VerifyEmailPage.jsx';
import UnauthorizedPage from '../pages/UnauthorizedPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

// Dashboards
import DashboardPage from '../pages/DashboardPage.jsx';
import SuperAdminDashboardPage from '../pages/superadmin/SuperAdminDashboardPage.jsx';
import SuperAdminSubscriptionsPage from '../pages/superadmin/SuperAdminSubscriptionsPage.jsx';
import SuperAdminSystemHealthPage from '../pages/superadmin/SuperAdminSystemHealthPage.jsx';
import ManagerDashboardPage from '../pages/manager/ManagerDashboardPage.jsx';
import ManagerTimesheetsPage from '../pages/manager/ManagerTimesheetsPage.jsx';
import ManagerAttendancePage from '../pages/manager/ManagerAttendancePage.jsx';
import EmployeePortalPage from '../pages/employee/EmployeePortalPage.jsx';
import EmployeeSchedulePage from '../pages/employee/EmployeeSchedulePage.jsx';
import EmployeeAttendancePage from '../pages/employee/EmployeeAttendancePage.jsx';
import EmployeeTasksPage from '../pages/employee/EmployeeTasksPage.jsx';
import CustomerPortalPage from '../pages/customer/CustomerPortalPage.jsx';
import CustomerServicesPage from '../pages/customer/CustomerServicesPage.jsx';
import CustomerRequestServicePage from '../pages/customer/CustomerRequestServicePage.jsx';

// Core Operations & Prototyping Modules
import WorkforcePage from '../pages/WorkforcePage.jsx';
import ShiftsPage from '../pages/shifts/ShiftsPage.jsx';
import DispatchPage from '../pages/dispatch/DispatchPage.jsx';
import ClientsPage from '../pages/clients/ClientsPage.jsx';
import DocumentsPage from '../pages/documents/DocumentsPage.jsx';
import InvoicesPage from '../pages/invoices/InvoicesPage.jsx';
import AuditPage from '../pages/audit/AuditPage.jsx';
import OrganizationsPage from '../pages/OrganizationsPage.jsx';
import SettingsPage from '../pages/settings/SettingsPage.jsx';

// Newly Implemented Prototype Modules (Prompt 07)
import ProjectsPage from '../pages/projects/ProjectsPage.jsx';
import ProjectDetailPage from '../pages/projects/ProjectDetailPage.jsx';
import TasksKanbanPage from '../pages/tasks/TasksKanbanPage.jsx';
import ServiceRequestsPage from '../pages/services/ServiceRequestsPage.jsx';
import WorkOrdersPage from '../pages/workorders/WorkOrdersPage.jsx';
import InventoryPage from '../pages/inventory/InventoryPage.jsx';
import ExpensesPage from '../pages/expenses/ExpensesPage.jsx';
import AnalyticsPage from '../pages/analytics/AnalyticsPage.jsx';

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
    <Routes>
      {/* Public Routes */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

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
          <Route path="/dispatch" element={<DispatchPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/tasks" element={<TasksKanbanPage />} />
          <Route path="/services" element={<ServiceRequestsPage />} />
          <Route path="/workorders" element={<WorkOrdersPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
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
  );
};

export default AppRoutes;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AppLayout from '../layouts/AppLayout.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import WorkforcePage from '../pages/WorkforcePage.jsx';
import OrganizationsPage from '../pages/OrganizationsPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import PlaceholderModulePage from '../pages/PlaceholderModulePage.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Multi-Tenant App Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/workforce" element={<WorkforcePage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />

          {/* Placeholders for upcoming milestones */}
          <Route
            path="/shifts"
            element={
              <PlaceholderModulePage
                title="Shift Scheduling & Clock-in Engine"
                milestone="Milestone 4"
                description="Intelligent shift assignment, overtime policies, geofenced mobile clock-in/out, and live workforce availability tracking."
                features={[
                  'Dynamic shift templates & calendar views',
                  'Attendance & punctuality tracking',
                  'Break time compliance logs',
                  'Tenant-isolated payroll hour calculation'
                ]}
              />
            }
          />

          <Route
            path="/dispatch"
            element={
              <PlaceholderModulePage
                title="Operations Field Dispatch & Asset Tracking"
                milestone="Milestone 5"
                description="Real-time field work-order dispatching, equipment status monitoring, maintenance schedules, and route optimization."
                features={[
                  'Work order lifecycle management (Open, Assigned, In-Progress, Completed)',
                  'Asset & heavy equipment registry with maintenance logs',
                  'GPS technician dispatch & job estimation',
                  'Incident reporting & resolution workflows'
                ]}
              />
            }
          />

          <Route
            path="/documents"
            element={
              <PlaceholderModulePage
                title="Multi-Tenant Document Vault"
                milestone="Milestone 6"
                description="Encrypted, tenant-isolated document storage powered by Supabase Storage with signed download URLs and RLS bucket security."
                features={[
                  'Tenant-scoped storage buckets (<org_id>/<file>)',
                  'Employee credential & certificate vault',
                  'Work order proof-of-delivery photo uploads',
                  'Time-limited signed URLs'
                ]}
              />
            }
          />

          <Route
            path="/audit"
            element={
              <PlaceholderModulePage
                title="Enterprise Immutable Audit Trail"
                milestone="Milestone 7"
                description="Immutable, tamper-proof activity logging recording who changed what, when, from which IP, and within which tenant."
                features={[
                  'Append-only PostgreSQL audit log stream',
                  'Diff view of modified JSON properties',
                  'Compliance export to CSV and JSON',
                  'Real-time Supabase event stream'
                ]}
              />
            }
          />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

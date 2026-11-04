import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// 1. Import Query Keys and Service Layer
import { queryKeys } from '../../client/src/services/queryClient.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../../client/src/features/auth/schemas/authSchemas.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema
} from '../../client/src/features/organizations/schemas/organizationSchemas.js';
import {
  employeeCreateSchema,
  employeeUpdateSchema,
  workforceFilterSchema
} from '../../client/src/features/workforce/schemas/workforceSchemas.js';
import {
  customerCreateSchema,
  customerUpdateSchema
} from '../../client/src/features/customers/schemas/customerSchemas.js';
import { auditFilterSchema } from '../../client/src/features/audit/schemas/auditSchemas.js';

describe('Prompt 17: React Application Architecture Test Suite', () => {
  describe('1. TanStack Query Configuration & Query Key Factory', () => {
    it('1.1 Verifies query keys factory creates consistent hierarchically scoped query keys', () => {
      assert.deepStrictEqual(queryKeys.auth.currentUser(), ['auth', 'currentUser']);
      assert.deepStrictEqual(queryKeys.organizations.all, ['organizations']);
      assert.deepStrictEqual(queryKeys.organizations.list({ search: 'Acme' }), [
        'organizations',
        'list',
        { search: 'Acme' }
      ]);
      assert.deepStrictEqual(queryKeys.organizations.detail('org-123'), [
        'organizations',
        'detail',
        'org-123'
      ]);
      assert.deepStrictEqual(queryKeys.workforce.detail('emp-456'), [
        'workforce',
        'detail',
        'emp-456'
      ]);
      assert.deepStrictEqual(queryKeys.workforce.stats(), ['workforce', 'stats']);
      assert.deepStrictEqual(queryKeys.customers.detail('cust-789'), [
        'customers',
        'detail',
        'cust-789'
      ]);
      assert.deepStrictEqual(queryKeys.audit.list({ page: 2 }), ['audit', 'list', { page: 2 }]);
    });

    it('1.2 QueryClient configuration enforces robust cache staleness and retry limits', () => {
      const qcFile = fs.readFileSync(path.resolve('client/src/services/queryClient.js'), 'utf8');
      assert.ok(qcFile.includes('staleTime: 1000 * 60'), 'Configures 1-minute default stale time');
      assert.ok(qcFile.includes('gcTime: 1000 * 60 * 5'), 'Configures 5-minute gcTime');
      assert.ok(qcFile.includes('retry: 1'), 'Restricts retry count to 1 to prevent spamming');
      assert.ok(
        qcFile.includes('refetchOnWindowFocus: false'),
        'Disables aggressive refetch on window focus'
      );
    });
  });

  describe('2. Separation of State: Redux Toolkit (UI/Session) vs TanStack Query (Server)', () => {
    it('2.1 Redux slices manage only client session, tenant selection, and ephemeral UI state', () => {
      const uiSlice = fs.readFileSync(path.resolve('client/src/store/uiSlice.js'), 'utf8');
      const authSlice = fs.readFileSync(path.resolve('client/src/store/authSlice.js'), 'utf8');
      const tenantSlice = fs.readFileSync(path.resolve('client/src/store/tenantSlice.js'), 'utf8');

      // UI slice handles toasts, modals, drawers, themes
      assert.ok(uiSlice.includes('addToast') && uiSlice.includes('removeToast'));
      assert.ok(uiSlice.includes('toggleSidebar') && uiSlice.includes('openModal'));

      // Auth slice handles session token, persona switching, current user credentials
      assert.ok(authSlice.includes('loginSuccess') && authSlice.includes('logout'));

      // Tenant slice handles active tenant ID and available tenants list
      assert.ok(
        tenantSlice.includes('setCurrentTenant') && tenantSlice.includes('availableTenants')
      );
    });

    it('2.2 Feature API layers utilize TanStack Query hooks instead of polluting Redux with entity stores', () => {
      const authApi = fs.readFileSync(
        path.resolve('client/src/features/auth/api/authApi.js'),
        'utf8'
      );
      const orgApi = fs.readFileSync(
        path.resolve('client/src/features/organizations/api/organizationApi.js'),
        'utf8'
      );
      const wfApi = fs.readFileSync(
        path.resolve('client/src/features/workforce/api/workforceApi.js'),
        'utf8'
      );
      const custApi = fs.readFileSync(
        path.resolve('client/src/features/customers/api/customerApi.js'),
        'utf8'
      );

      assert.ok(authApi.includes('useQuery') && authApi.includes('useMutation'));
      assert.ok(
        orgApi.includes('useOrganizationsQuery') && orgApi.includes('useCreateOrganizationMutation')
      );
      assert.ok(wfApi.includes('useEmployeesQuery') && wfApi.includes('useCreateEmployeeMutation'));
      assert.ok(
        custApi.includes('useCustomersQuery') && custApi.includes('useCreateCustomerMutation')
      );
    });
  });

  describe('3. Production API Client Hardening', () => {
    it('3.1 API Client injects X-Correlation-ID, Bearer token, and X-Tenant-Id on outgoing requests', () => {
      const apiCode = fs.readFileSync(path.resolve('client/src/services/apiClient.js'), 'utf8');
      assert.ok(apiCode.includes("config.headers['X-Correlation-ID']"));
      assert.ok(apiCode.includes('config.headers.Authorization = `Bearer ${token}`'));
      assert.ok(apiCode.includes("config.headers['X-Tenant-Id'] = activeTenantId"));
      assert.ok(apiCode.includes('generateCorrelationId'));
    });

    it('3.2 API Client response interceptor handles 401, 403, and 429 status codes with custom events', () => {
      const apiCode = fs.readFileSync(path.resolve('client/src/services/apiClient.js'), 'utf8');
      assert.ok(apiCode.includes('status === 401'));
      assert.ok(apiCode.includes('opspilot:auth-expired'));
      assert.ok(apiCode.includes('status === 403'));
      assert.ok(apiCode.includes('status === 429'));
    });
  });

  describe('4. Form Validation & Zod Feature Schemas', () => {
    describe('4.1 Auth Schemas', () => {
      it('Validates login inputs correctly', () => {
        const valid = loginSchema.safeParse({
          email: 'alex.morgan@acme.com',
          password: 'Password123!',
          rememberMe: true
        });
        assert.strictEqual(valid.success, true);

        const invalidEmail = loginSchema.safeParse({
          email: 'not-an-email',
          password: 'Password123!'
        });
        assert.strictEqual(invalidEmail.success, false);

        const shortPassword = loginSchema.safeParse({
          email: 'alex@acme.com',
          password: '123'
        });
        assert.strictEqual(shortPassword.success, false);
      });

      it('Validates registration with password confirmation and terms acceptance', () => {
        const valid = registerSchema.safeParse({
          fullName: 'Taylor Swift',
          email: 'taylor@acme.com',
          organizationName: 'Midnights Corp',
          password: 'SuperSecret123!',
          confirmPassword: 'SuperSecret123!',
          agreeTerms: true
        });
        assert.strictEqual(valid.success, true);

        const mismatch = registerSchema.safeParse({
          fullName: 'Taylor Swift',
          email: 'taylor@acme.com',
          organizationName: 'Midnights Corp',
          password: 'SuperSecret123!',
          confirmPassword: 'DifferentPassword456!',
          agreeTerms: true
        });
        assert.strictEqual(mismatch.success, false);
      });

      it('Validates forgot and reset password schemas', () => {
        const validForgot = forgotPasswordSchema.safeParse({ email: 'user@acme.com' });
        assert.strictEqual(validForgot.success, true);

        const invalidForgot = forgotPasswordSchema.safeParse({ email: 'not-an-email' });
        assert.strictEqual(invalidForgot.success, false);

        const validReset = resetPasswordSchema.safeParse({
          password: 'NewStrongPassword1!',
          confirmPassword: 'NewStrongPassword1!'
        });
        assert.strictEqual(validReset.success, true);

        const mismatchReset = resetPasswordSchema.safeParse({
          password: 'NewStrongPassword1!',
          confirmPassword: 'WrongPassword2!'
        });
        assert.strictEqual(mismatchReset.success, false);
      });
    });

    describe('4.2 Organization Schemas', () => {
      it('Enforces slug regex formatting and subscription tier enum', () => {
        const valid = createOrganizationSchema.safeParse({
          name: 'Apex Logistics LLC',
          slug: 'apex-logistics',
          subscription_tier: 'enterprise'
        });
        assert.strictEqual(valid.success, true);

        const invalidSlug = createOrganizationSchema.safeParse({
          name: 'Apex Logistics LLC',
          slug: 'APEX LOGISTICS with SPACES!',
          subscription_tier: 'enterprise'
        });
        assert.strictEqual(invalidSlug.success, false);
      });

      it('Validates update organization schema optional properties', () => {
        const valid = updateOrganizationSchema.safeParse({
          name: 'Updated Logistics LLC'
        });
        assert.strictEqual(valid.success, true);

        const invalid = updateOrganizationSchema.safeParse({
          slug: 'INVALID SLUG WITH SPACES'
        });
        assert.strictEqual(invalid.success, false);
      });

      it('Validates invitation schema role options', () => {
        const valid = inviteMemberSchema.safeParse({
          email: 'tech@domain.com',
          role: 'manager'
        });
        assert.strictEqual(valid.success, true);

        const invalidRole = inviteMemberSchema.safeParse({
          email: 'tech@domain.com',
          role: 'supergod'
        });
        assert.strictEqual(invalidRole.success, false);
      });
    });

    describe('4.3 Workforce Schemas', () => {
      it('Validates workforce profile creation and number coercion for hourly rate', () => {
        const valid = employeeCreateSchema.safeParse({
          name: 'David Kim',
          email: 'david.kim@acme.com',
          role: 'employee',
          job_title: 'Field Lead',
          department: 'Field Logistics',
          hourly_rate: '45.50' // string coerced to number
        });
        assert.strictEqual(valid.success, true);
        assert.strictEqual(valid.data.hourly_rate, 45.5);

        const negativeRate = employeeCreateSchema.safeParse({
          name: 'David Kim',
          email: 'david.kim@acme.com',
          role: 'employee',
          job_title: 'Field Lead',
          hourly_rate: -10
        });
        assert.strictEqual(negativeRate.success, false);
      });

      it('Validates employee update schema and workforce filter pagination limits', () => {
        const validUpdate = employeeUpdateSchema.safeParse({
          name: 'David Kim Updated',
          hourly_rate: '50.00',
          is_active: false
        });
        assert.strictEqual(validUpdate.success, true);
        assert.strictEqual(validUpdate.data.hourly_rate, 50.0);

        const validFilter = workforceFilterSchema.safeParse({
          search: 'David',
          department: 'Field Logistics',
          page: '1',
          limit: '25'
        });
        assert.strictEqual(validFilter.success, true);
        assert.strictEqual(validFilter.data.limit, 25);
      });
    });

    describe('4.4 Customer Schemas', () => {
      it('Validates customer creation and update schemas', () => {
        const valid = customerCreateSchema.safeParse({
          name: 'Sarah Connor',
          company_name: 'Cyberdyne Systems',
          email: 'sarah@cyberdyne.com',
          phone: '+1 555-0199'
        });
        assert.strictEqual(valid.success, true);

        const missingCompany = customerCreateSchema.safeParse({
          name: 'Sarah Connor',
          company_name: '',
          email: 'sarah@cyberdyne.com'
        });
        assert.strictEqual(missingCompany.success, false);

        const validUpdate = customerUpdateSchema.safeParse({
          status: 'active',
          phone: '+1 555-9999'
        });
        assert.strictEqual(validUpdate.success, true);
      });
    });

    describe('4.5 Audit Schemas', () => {
      it('Validates audit filter boundaries and pagination limits', () => {
        const valid = auditFilterSchema.safeParse({
          action: 'auth.login',
          page: '2',
          limit: '50'
        });
        assert.strictEqual(valid.success, true);
        assert.strictEqual(valid.data.page, 2);
        assert.strictEqual(valid.data.limit, 50);

        const overLimit = auditFilterSchema.safeParse({
          limit: 500
        });
        assert.strictEqual(overLimit.success, false);
      });
    });
  });

  describe('5. Component Architecture & Reusable Primitives', () => {
    it('5.1 Confirms ErrorBoundary implements getDerivedStateFromError and diagnostic fallback UI', () => {
      const ebFile = fs.readFileSync(
        path.resolve('client/src/components/common/ErrorBoundary.jsx'),
        'utf8'
      );
      assert.ok(ebFile.includes('class ErrorBoundary extends Component'));
      assert.ok(ebFile.includes('static getDerivedStateFromError'));
      assert.ok(ebFile.includes('componentDidCatch'));
      assert.ok(ebFile.includes('handleReset'));
      assert.ok(ebFile.includes('handleReload'));
    });

    it('5.2 Confirms reusable form components (FormField, FormInput, FormSelect, FormTextarea, FormCheckbox) exist', () => {
      const components = [
        'FormField.jsx',
        'FormInput.jsx',
        'FormSelect.jsx',
        'FormTextarea.jsx',
        'FormCheckbox.jsx',
        'index.js'
      ];
      for (const comp of components) {
        assert.ok(
          fs.existsSync(path.resolve(`client/src/components/form/${comp}`)),
          `Form component ${comp} must exist`
        );
      }
    });

    it('5.3 Confirms custom hooks exist (useAuth, useTenant, useToast, useDebounce, useDisclosure, usePagination)', () => {
      const hooks = [
        'useAuth.js',
        'useTenant.js',
        'useToast.js',
        'useDebounce.js',
        'useDisclosure.js',
        'usePagination.js',
        'index.js'
      ];
      for (const hook of hooks) {
        assert.ok(
          fs.existsSync(path.resolve(`client/src/hooks/${hook}`)),
          `Custom hook ${hook} must exist`
        );
      }
    });

    it('5.4 Confirms LoadingSpinner and LoadingOverlay exist in UI components', () => {
      const spinnerFile = fs.readFileSync(
        path.resolve('client/src/components/ui/LoadingSpinner.jsx'),
        'utf8'
      );
      assert.ok(spinnerFile.includes('LoadingSpinner'));
      assert.ok(spinnerFile.includes('LoadingOverlay'));
    });
  });

  describe('6. Application Entry Point & Provider Hierarchy', () => {
    it('6.1 main.jsx wraps App with ErrorBoundary, Provider(Redux), QueryClientProvider, and ToastContainer', () => {
      const mainFile = fs.readFileSync(path.resolve('client/src/main.jsx'), 'utf8');
      assert.ok(mainFile.includes('<ErrorBoundary>'), 'ErrorBoundary at root');
      assert.ok(mainFile.includes('<Provider store={store}>'), 'Redux Provider configured');
      assert.ok(
        mainFile.includes('<QueryClientProvider client={queryClient}>'),
        'TanStack Query provider configured'
      );
      assert.ok(mainFile.includes('<ToastContainer />'), 'ToastContainer mounted at root');
    });

    it('6.2 App.jsx listens for session expiry events and fetches user profile', () => {
      const appFile = fs.readFileSync(path.resolve('client/src/App.jsx'), 'utf8');
      assert.ok(appFile.includes('opspilot:auth-expired'));
      assert.ok(appFile.includes('fetchCurrentUser'));
      assert.ok(appFile.includes('fetchMyOrganizations'));
    });
  });
});

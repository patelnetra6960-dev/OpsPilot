/**
 * OpsPilot Granular Permissions & RBAC Matrix
 * Defines all system capabilities and role-to-permission mappings.
 */

export const PERMISSIONS = Object.freeze({
  // Workforce Management
  WORKFORCE_READ: 'workforce:read',
  WORKFORCE_CREATE: 'workforce:create',
  WORKFORCE_UPDATE: 'workforce:update',
  WORKFORCE_DELETE: 'workforce:delete',

  // Customer Management
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',

  // Service Requests
  SERVICE_REQUESTS_READ: 'service_requests:read',
  SERVICE_REQUESTS_CREATE: 'service_requests:create',
  SERVICE_REQUESTS_UPDATE: 'service_requests:update',
  SERVICE_REQUESTS_DELETE: 'service_requests:delete',
  SERVICE_REQUESTS_READ_OWN: 'service_requests:read_own',

  // Work Orders & Dispatch
  WORK_ORDERS_READ: 'work_orders:read',
  WORK_ORDERS_CREATE: 'work_orders:create',
  WORK_ORDERS_UPDATE: 'work_orders:update',
  WORK_ORDERS_DELETE: 'work_orders:delete',
  WORK_ORDERS_READ_OWN: 'work_orders:read_own',

  // Projects & Tasks
  PROJECTS_READ: 'projects:read',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',
  TASKS_READ: 'tasks:read',
  TASKS_CREATE: 'tasks:create',
  TASKS_UPDATE: 'tasks:update',
  TASKS_DELETE: 'tasks:delete',

  // Inventory & Assets
  INVENTORY_READ: 'inventory:read',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_UPDATE: 'inventory:update',
  INVENTORY_DELETE: 'inventory:delete',
  ASSETS_READ: 'assets:read',
  ASSETS_CREATE: 'assets:create',
  ASSETS_UPDATE: 'assets:update',
  ASSETS_DELETE: 'assets:delete',

  // Expenses & Approvals
  EXPENSES_READ: 'expenses:read',
  EXPENSES_READ_OWN: 'expenses:read_own',
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_APPROVE: 'expenses:approve',
  EXPENSES_DELETE: 'expenses:delete',

  // Invoices & Billing
  INVOICES_READ: 'invoices:read',
  INVOICES_READ_OWN: 'invoices:read_own',
  INVOICES_CREATE: 'invoices:create',
  INVOICES_UPDATE: 'invoices:update',
  INVOICES_DELETE: 'invoices:delete',

  // Organization Administration
  ORG_SETTINGS_READ: 'org:settings:read',
  ORG_SETTINGS_UPDATE: 'org:settings:update',
  ORG_MEMBERS_READ: 'org:members:read',
  ORG_MEMBERS_MANAGE: 'org:members:manage',
  ORG_TRANSFER: 'org:transfer',

  // Analytics & Audit
  ANALYTICS_READ: 'analytics:read',
  AUDIT_READ: 'audit:read',

  // Storage
  STORAGE_UPLOAD: 'storage:upload',
  STORAGE_SIGNED_URL: 'storage:signed_url',
  STORAGE_DELETE: 'storage:delete'
});

/**
 * Standard Role-to-Permissions Mapping Matrix
 */
export const ROLE_PERMISSIONS = Object.freeze({
  superadmin: Object.values(PERMISSIONS), // Super admin possesses all capabilities

  owner: Object.values(PERMISSIONS), // Organization owner has full tenant domain control

  admin: [
    PERMISSIONS.WORKFORCE_READ,
    PERMISSIONS.WORKFORCE_CREATE,
    PERMISSIONS.WORKFORCE_UPDATE,
    PERMISSIONS.WORKFORCE_DELETE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.CUSTOMERS_DELETE,
    PERMISSIONS.SERVICE_REQUESTS_READ,
    PERMISSIONS.SERVICE_REQUESTS_CREATE,
    PERMISSIONS.SERVICE_REQUESTS_UPDATE,
    PERMISSIONS.SERVICE_REQUESTS_DELETE,
    PERMISSIONS.WORK_ORDERS_READ,
    PERMISSIONS.WORK_ORDERS_CREATE,
    PERMISSIONS.WORK_ORDERS_UPDATE,
    PERMISSIONS.WORK_ORDERS_DELETE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECTS_DELETE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.TASKS_DELETE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_DELETE,
    PERMISSIONS.ASSETS_READ,
    PERMISSIONS.ASSETS_CREATE,
    PERMISSIONS.ASSETS_UPDATE,
    PERMISSIONS.ASSETS_DELETE,
    PERMISSIONS.EXPENSES_READ,
    PERMISSIONS.EXPENSES_READ_OWN,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_APPROVE,
    PERMISSIONS.EXPENSES_DELETE,
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_UPDATE,
    PERMISSIONS.INVOICES_DELETE,
    PERMISSIONS.ORG_SETTINGS_READ,
    PERMISSIONS.ORG_SETTINGS_UPDATE,
    PERMISSIONS.ORG_MEMBERS_READ,
    PERMISSIONS.ORG_MEMBERS_MANAGE,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.STORAGE_UPLOAD,
    PERMISSIONS.STORAGE_SIGNED_URL,
    PERMISSIONS.STORAGE_DELETE
  ],

  manager: [
    PERMISSIONS.WORKFORCE_READ,
    PERMISSIONS.WORKFORCE_CREATE,
    PERMISSIONS.WORKFORCE_UPDATE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.SERVICE_REQUESTS_READ,
    PERMISSIONS.SERVICE_REQUESTS_CREATE,
    PERMISSIONS.SERVICE_REQUESTS_UPDATE,
    PERMISSIONS.WORK_ORDERS_READ,
    PERMISSIONS.WORK_ORDERS_CREATE,
    PERMISSIONS.WORK_ORDERS_UPDATE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.TASKS_DELETE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.ASSETS_READ,
    PERMISSIONS.ASSETS_UPDATE,
    PERMISSIONS.EXPENSES_READ,
    PERMISSIONS.EXPENSES_READ_OWN,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_APPROVE,
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_UPDATE,
    PERMISSIONS.ORG_MEMBERS_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.STORAGE_UPLOAD,
    PERMISSIONS.STORAGE_SIGNED_URL,
    PERMISSIONS.STORAGE_DELETE
  ],

  employee: [
    PERMISSIONS.WORKFORCE_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.SERVICE_REQUESTS_READ,
    PERMISSIONS.WORK_ORDERS_READ,
    PERMISSIONS.WORK_ORDERS_UPDATE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.ASSETS_READ,
    PERMISSIONS.EXPENSES_READ_OWN,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.STORAGE_UPLOAD,
    PERMISSIONS.STORAGE_SIGNED_URL
  ],

  customer: [
    PERMISSIONS.SERVICE_REQUESTS_READ_OWN,
    PERMISSIONS.SERVICE_REQUESTS_CREATE,
    PERMISSIONS.WORK_ORDERS_READ_OWN,
    PERMISSIONS.INVOICES_READ_OWN,
    PERMISSIONS.STORAGE_UPLOAD,
    PERMISSIONS.STORAGE_SIGNED_URL
  ]
});

/**
 * Checks whether a given role is granted a specific permission
 * @param {string} role - The role slug ('owner', 'admin', 'manager', 'employee', 'customer', 'superadmin')
 * @param {string} permission - The permission key to check
 * @returns {boolean}
 */
export const checkRolePermission = (role, permission) => {
  if (!role || !permission) return false;
  if (role === 'superadmin' || role === 'owner') return true;

  const permissions = ROLE_PERMISSIONS[role] || [];
  if (permissions.includes(permission)) return true;

  // Wildcard check: e.g. 'projects:*' permits 'projects:read'
  const [module] = permission.split(':');
  if (permissions.includes(`${module}:*`)) return true;

  return false;
};

export default {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  checkRolePermission
};

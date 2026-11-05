import { createCrudRouter } from './crudRouterFactory.js';
import inventoryController from '../controllers/inventory.controller.js';
import inventoryValidator from '../validators/inventory.validator.js';

export const inventoryRouter = createCrudRouter({
  controller: inventoryController,
  validator: inventoryValidator,
  roles: {
    read: ['owner', 'admin', 'manager', 'employee', 'member'],
    create: ['owner', 'admin', 'manager'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin'],
    action: ['owner', 'admin', 'manager']
  },
  extendRouter: (router, { requireTenantRole, validate, controller }) => {
    // 1. Telemetry Stats
    router.get(
      '/stats',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      controller.getStats
    );

    // 2. Low-Stock Threshold Alerts
    router.get(
      '/low-stock',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      controller.getLowStock
    );

    // 3. Organization Stock Transactions Audit Ledger
    router.get(
      '/transactions',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      controller.getTransactions
    );

    // 4. Single Item Stock Transactions Ledger
    router.get(
      '/:id/transactions',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      controller.getTransactions
    );

    // 5. Stock-In Transaction (Warehouse Receiving)
    router.post(
      '/:id/stock-in',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(inventoryValidator.stockIn),
      controller.stockIn
    );

    // 6. Stock-Out Transaction (Parts Dispatch / Consumption)
    router.post(
      '/:id/stock-out',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(inventoryValidator.stockOut),
      controller.stockOut
    );

    // 7. Stock Adjustment (Reconciliation / Cycle Count)
    router.post(
      '/:id/adjust',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(inventoryValidator.adjust),
      controller.adjustStock
    );
  }
});

export default inventoryRouter;

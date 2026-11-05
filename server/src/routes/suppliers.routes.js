import { createCrudRouter } from './crudRouterFactory.js';
import supplierController from '../controllers/supplier.controller.js';
import supplierValidator from '../validators/supplier.validator.js';

export const suppliersRouter = createCrudRouter({
  controller: supplierController,
  validator: supplierValidator,
  roles: {
    read: ['owner', 'admin', 'manager', 'employee', 'member'],
    create: ['owner', 'admin', 'manager'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin'],
    action: ['owner', 'admin', 'manager']
  },
  extendRouter: (router, { requireTenantRole, validate, controller }) => {
    // 1. Supplier Network Stats
    router.get(
      '/stats',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      controller.getStats
    );

    // 2. Supplier Purchase Orders
    router.get(
      '/:id/purchases',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      controller.getPurchases
    );

    // 3. Create Purchase Order for Supplier
    router.post(
      '/:id/purchases',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(supplierValidator.createPurchase),
      controller.createPurchase
    );

    // 4. Receive Purchase Order (with automatic inventory stock replenishment)
    router.post(
      '/purchases/:id/receive',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      controller.receivePurchase
    );
  }
});

export default suppliersRouter;

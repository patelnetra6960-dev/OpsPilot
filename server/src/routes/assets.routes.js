import { createCrudRouter } from './crudRouterFactory.js';
import assetController from '../controllers/asset.controller.js';
import assetValidator from '../validators/asset.validator.js';

export const assetsRouter = createCrudRouter({
  controller: assetController,
  validator: assetValidator,
  roles: {
    read: ['owner', 'admin', 'manager', 'employee', 'member'],
    create: ['owner', 'admin', 'manager'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin'],
    action: ['owner', 'admin', 'manager']
  },
  extendRouter: (router, { requireTenantRole, validate, controller }) => {
    // 1. Asset Fleet Telemetry Stats
    router.get(
      '/stats',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      controller.getStats
    );

    // 2. Assign Ownership & Location
    router.post(
      '/:id/assign',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(assetValidator.assign),
      controller.assign
    );

    // 3. Operational Status Transition
    router.post(
      '/:id/status',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(assetValidator.statusChange),
      controller.updateStatus
    );

    // 4. Record Maintenance Log
    router.post(
      '/:id/maintenance',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(assetValidator.maintenance),
      controller.maintenance
    );
  }
});

export default assetsRouter;

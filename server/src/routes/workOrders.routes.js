import { createCrudRouter } from './crudRouterFactory.js';
import workOrderController from '../controllers/workOrder.controller.js';
import workOrderValidator from '../validators/workOrder.validator.js';

export const workOrdersRouter = createCrudRouter({
  controller: workOrderController,
  validator: workOrderValidator,
  roles: {
    read: ['owner', 'admin', 'manager', 'employee', 'customer', 'member'],
    create: ['owner', 'admin', 'manager'],
    update: ['owner', 'admin', 'manager', 'employee'],
    delete: ['owner', 'admin'],
    action: ['owner', 'admin', 'manager']
  },
  extendRouter: (router, { requireTenantRole, validate, controller }) => {
    // 1. Assign Technician
    router.post(
      '/:id/assign',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(workOrderValidator.assign),
      controller.assign
    );

    // 2. Schedule Execution Window
    router.post(
      '/:id/schedule',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(workOrderValidator.schedule),
      controller.schedule
    );

    // 3. Status Transitions
    router.post(
      '/:id/status',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(workOrderValidator.status),
      controller.changeStatus
    );

    // 4. Checklist Management
    router.post(
      '/:id/checklists',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(workOrderValidator.addChecklist),
      controller.addChecklist
    );

    router.patch(
      '/:id/checklists/:itemId',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(workOrderValidator.updateChecklist),
      controller.updateChecklist
    );

    router.delete(
      '/:id/checklists/:itemId',
      requireTenantRole(['owner', 'admin', 'manager']),
      controller.deleteChecklist
    );

    // 5. Job Notes & Field Logs
    router.post(
      '/:id/notes',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(workOrderValidator.addNote),
      controller.addNote
    );

    // 6. Before & After Photographs
    router.post(
      '/:id/photos',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(workOrderValidator.addPhoto),
      controller.addPhoto
    );

    // 7. Complete Work Order
    router.post(
      '/:id/complete',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(workOrderValidator.complete),
      controller.complete
    );

    // 8. Customer Confirmation & Signature
    router.post(
      '/:id/confirm',
      requireTenantRole(['owner', 'admin', 'manager', 'customer']),
      validate(workOrderValidator.confirm),
      controller.confirm
    );

    // 9. Close Work Order (Manager Review)
    router.post(
      '/:id/close',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(workOrderValidator.close),
      controller.close
    );
  }
});

export default workOrdersRouter;

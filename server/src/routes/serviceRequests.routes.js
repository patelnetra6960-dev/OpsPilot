import { createCrudRouter } from './crudRouterFactory.js';
import serviceRequestController from '../controllers/serviceRequest.controller.js';
import serviceRequestValidator from '../validators/serviceRequest.validator.js';

export const serviceRequestsRouter = createCrudRouter({
  controller: serviceRequestController,
  validator: serviceRequestValidator,
  roles: {
    read: ['owner', 'admin', 'manager', 'employee', 'customer', 'member'],
    create: ['owner', 'admin', 'manager', 'employee', 'customer'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin'],
    action: ['owner', 'admin', 'manager']
  },
  extendRouter: (router, { requireTenantRole, validate, controller }) => {
    // 1. Manager Review
    router.post(
      '/:id/review',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(serviceRequestValidator.review),
      controller.review
    );

    // 2. Manager Approval
    router.post(
      '/:id/approve',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(serviceRequestValidator.approve),
      controller.approve
    );

    // 3. Manager Rejection
    router.post(
      '/:id/reject',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(serviceRequestValidator.reject),
      controller.reject
    );

    // 4. Attachments (Customer & Staff)
    router.post(
      '/:id/attachments',
      requireTenantRole(['owner', 'admin', 'manager', 'employee', 'customer']),
      validate(serviceRequestValidator.addAttachment),
      controller.addAttachment
    );

    // 5. Generate Work Order from Approved Request
    router.post(
      '/:id/convert-to-work-order',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(serviceRequestValidator.convert),
      controller.convertToWorkOrder
    );
  }
});

export default serviceRequestsRouter;

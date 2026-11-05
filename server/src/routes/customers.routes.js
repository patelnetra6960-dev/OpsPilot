import { createCrudRouter } from './crudRouterFactory.js';
import customerController from '../controllers/customer.controller.js';
import customerValidator, {
  addCustomerNoteSchema,
  updateFollowUpSchema
} from '../validators/customer.validator.js';

export const customersRouter = createCrudRouter({
  controller: customerController,
  validator: customerValidator,
  roles: {
    read: ['owner', 'admin', 'manager', 'employee', 'member'],
    create: ['owner', 'admin', 'manager'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin'],
    action: ['owner', 'admin', 'manager']
  },
  extendRouter: (router, { requireTenantRole, validate, controller }) => {
    // Internal Customer Notes
    router.get(
      '/:id/notes',
      requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
      controller.getNotes
    );
    router.post(
      '/:id/notes',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(addCustomerNoteSchema),
      controller.addNote
    );

    // Customer History Timeline
    router.get(
      '/:id/history',
      requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
      controller.getHistory
    );

    // Lead Stage & Follow-Up Management
    router.patch(
      '/:id/follow-up',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(updateFollowUpSchema),
      controller.updateFollowUp
    );
  }
});

export default customersRouter;

import { createCrudRouter } from './crudRouterFactory.js';
import customerController from '../controllers/customer.controller.js';
import customerValidator from '../validators/customer.validator.js';

export const customersRouter = createCrudRouter({
  controller: customerController,
  validator: customerValidator,
  roles: {
    read: ['owner', 'admin', 'manager', 'employee', 'member'],
    create: ['owner', 'admin', 'manager'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin'],
    action: ['owner', 'admin', 'manager']
  }
});

export default customersRouter;

import BaseController from './base.controller.js';
import customerService from '../services/customer.service.js';

export class CustomerController extends BaseController {
  constructor() {
    super(customerService, 'Customer');
  }
}

export const customerController = new CustomerController();
export default customerController;

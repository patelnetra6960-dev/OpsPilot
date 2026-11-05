import { BaseService } from './base.service.js';
import { supplierRepository } from '../repositories/supplier.repository.js';
import { auditService } from './audit.service.js';
import { ConflictError, ValidationError } from '../utils/errors.js';

export class SupplierService extends BaseService {
  constructor() {
    super(supplierRepository, 'Supplier');
  }

  async beforeCreate(payload, organizationId, _context = {}) {
    const code = payload.code?.trim().toUpperCase();
    if (!code) throw new ValidationError('Supplier code is required');

    // Check code uniqueness per tenant
    const existing = await this.repository.findByCode(code, organizationId);
    if (existing) {
      throw new ConflictError(`Supplier with code '${code}' already exists in this organization.`);
    }

    return {
      ...payload,
      code
    };
  }

  async afterCreate(created, organizationId, context = {}) {
    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'SUPPLIER_CREATED',
      entityType: 'SUPPLIER',
      entityId: created.id,
      metadata: { code: created.code, name: created.name }
    });

    return created;
  }

  async beforeUpdate(id, payload, organizationId, _context = {}) {
    if (payload.code) {
      const code = payload.code.trim().toUpperCase();
      const existing = await this.repository.findByCode(code, organizationId);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Another supplier with code '${code}' already exists.`);
      }
      payload.code = code;
    }

    return payload;
  }

  /**
   * Get purchase orders for supplier
   */
  async getPurchases(supplierId, organizationId) {
    return this.repository.getPurchases(supplierId, organizationId);
  }

  /**
   * Create purchase record for supplier
   */
  async createPurchase(supplierId, organizationId, purchaseData, context = {}) {
    const created = await this.repository.createPurchase(
      supplierId,
      organizationId,
      purchaseData,
      context
    );

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'PURCHASE_ORDER_CREATED',
      entityType: 'PURCHASE_ORDER',
      entityId: created.id,
      metadata: {
        po_number: created.po_number,
        supplier_id: supplierId,
        total_amount: created.total_amount
      }
    });

    return created;
  }

  /**
   * Receive purchase order and process automatic inventory stock-in
   */
  async receivePurchase(purchaseId, organizationId, context = {}) {
    const result = await this.repository.receivePurchase(purchaseId, organizationId, context);

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'PURCHASE_ORDER_RECEIVED',
      entityType: 'PURCHASE_ORDER',
      entityId: purchaseId,
      metadata: {
        po_number: result.purchaseOrder.po_number,
        items_count: (result.purchaseOrder.items || []).length
      }
    });

    return result;
  }

  /**
   * Aggregated supplier metrics
   */
  async getStats(organizationId) {
    return this.repository.getSupplierStats(organizationId);
  }
}

export const supplierService = new SupplierService();
export default supplierService;

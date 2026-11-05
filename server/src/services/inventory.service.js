import { BaseService } from './base.service.js';
import { inventoryRepository } from '../repositories/inventory.repository.js';
import { supplierRepository } from '../repositories/supplier.repository.js';
import { auditService } from './audit.service.js';
import { notificationService } from './notification.service.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import { ConflictError, ValidationError } from '../utils/errors.js';

export class InventoryService extends BaseService {
  constructor() {
    super(inventoryRepository, 'InventoryItem');
  }

  async beforeCreate(payload, organizationId, _context = {}) {
    const sku = payload.sku?.trim().toUpperCase();
    if (!sku) throw new ValidationError('SKU is required');

    // Check SKU uniqueness per organization tenant
    const existing = await this.repository.findBySku(sku, organizationId);
    if (existing) {
      throw new ConflictError(
        `Inventory item with SKU '${sku}' already exists in this organization.`
      );
    }

    const inStock = Number(payload.in_stock || 0);
    const reorderLevel = Number(payload.reorder_level != null ? payload.reorder_level : 5);
    const unitCost = Number(payload.unit_cost || 0);

    if (inStock < 0) {
      throw new ValidationError('Initial stock quantity cannot be negative.');
    }
    if (reorderLevel < 0) {
      throw new ValidationError('Reorder level cannot be negative.');
    }
    if (unitCost < 0) {
      throw new ValidationError('Unit cost cannot be negative.');
    }

    let status = 'in_stock';
    if (inStock <= 0) {
      status = 'out_of_stock';
    } else if (inStock <= reorderLevel) {
      status = 'low_stock';
    }

    let supplierName = payload.supplier_name || null;
    if (payload.supplier_id && !supplierName) {
      try {
        const sup = await supplierRepository.findById(payload.supplier_id, organizationId);
        if (sup) supplierName = sup.name;
      } catch {
        // Continue if supplier lookup fails
      }
    }

    return {
      ...payload,
      sku,
      in_stock: inStock,
      reorder_level: reorderLevel,
      unit_cost: unitCost,
      status,
      supplier_name: supplierName,
      version: 1
    };
  }

  async afterCreate(created, organizationId, context = {}) {
    // If created with initial non-zero stock, log initial intake baseline transaction
    if (Number(created.in_stock) > 0) {
      try {
        const now = new Date().toISOString();
        const txRecord = {
          id: `tx-init-${created.id}`,
          organization_id: organizationId,
          inventory_item_id: created.id,
          item_name: created.name,
          sku: created.sku,
          transaction_type: 'inbound',
          quantity: created.in_stock,
          previous_stock: 0,
          new_stock: created.in_stock,
          unit_price: created.unit_cost,
          reference_type: 'initial',
          reference_id: null,
          idempotency_key: `init-${created.id}`,
          reference_note: 'Initial inventory baseline registration',
          performed_by: context.user
            ? `${context.user.first_name || ''} ${context.user.last_name || ''}`.trim() ||
              context.user.email
            : 'System',
          created_at: now
        };

        if (env.isMockMode || !supabaseAdmin) {
          if (!mockDatabase.stock_transactions) {
            mockDatabase.stock_transactions = [];
          }
          mockDatabase.stock_transactions.unshift(txRecord);
        } else {
          await supabaseAdmin.from('stock_transactions').insert(txRecord);
        }
      } catch (err) {
        console.warn('Initial stock movement record notice:', err.message);
      }
    }

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'INVENTORY_ITEM_CREATED',
      entityType: 'INVENTORY_ITEM',
      entityId: created.id,
      metadata: { sku: created.sku, in_stock: created.in_stock, category: created.category }
    });

    return created;
  }

  async beforeUpdate(id, payload, organizationId, _context = {}) {
    if (payload.sku) {
      const sku = payload.sku.trim().toUpperCase();
      const existing = await this.repository.findBySku(sku, organizationId);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Another inventory item with SKU '${sku}' already exists.`);
      }
      payload.sku = sku;
    }

    return payload;
  }

  /**
   * Receive stock into warehouse (Stock-In)
   */
  async stockIn(itemId, organizationId, movementData, context = {}) {
    const result = await this.repository.executeStockMovement(
      itemId,
      organizationId,
      {
        ...movementData,
        transaction_type: 'inbound'
      },
      context
    );

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'INVENTORY_STOCK_IN',
      entityType: 'INVENTORY_ITEM',
      entityId: itemId,
      metadata: {
        sku: result.item.sku,
        quantity: movementData.quantity,
        new_stock: result.item.in_stock,
        reference_type: movementData.reference_type,
        reference_id: movementData.reference_id
      }
    });

    return result;
  }

  /**
   * Dispatch stock from warehouse (Stock-Out)
   */
  async stockOut(itemId, organizationId, movementData, context = {}) {
    const result = await this.repository.executeStockMovement(
      itemId,
      organizationId,
      {
        ...movementData,
        transaction_type: 'outbound'
      },
      context
    );

    // Low stock notification hook
    if (result.item.status === 'low_stock' || result.item.status === 'out_of_stock') {
      try {
        await notificationService.sendNotification({
          organizationId,
          userId: null, // Broadcast to inventory & operations managers
          title: `Low Stock Alert: ${result.item.name}`,
          message: `SKU '${result.item.sku}' has reached ${result.item.in_stock} units (minimum threshold: ${result.item.reorder_level}). Reordering recommended.`,
          type: result.item.status === 'out_of_stock' ? 'error' : 'warning',
          link: '/inventory'
        });
      } catch (err) {
        console.warn('Low stock notification dispatch notice:', err.message);
      }
    }

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'INVENTORY_STOCK_OUT',
      entityType: 'INVENTORY_ITEM',
      entityId: itemId,
      metadata: {
        sku: result.item.sku,
        quantity: movementData.quantity,
        new_stock: result.item.in_stock,
        reference_type: movementData.reference_type,
        reference_id: movementData.reference_id
      }
    });

    return result;
  }

  /**
   * Reconcile inventory stock discrepancies (Stock Adjustment)
   */
  async adjustStock(itemId, organizationId, adjustmentData, context = {}) {
    const result = await this.repository.executeStockMovement(
      itemId,
      organizationId,
      {
        ...adjustmentData,
        transaction_type: 'adjustment'
      },
      context
    );

    if (result.item.status === 'low_stock' || result.item.status === 'out_of_stock') {
      try {
        await notificationService.sendNotification({
          organizationId,
          userId: null,
          title: `Stock Adjustment Alert: ${result.item.name}`,
          message: `Stock adjusted to ${result.item.in_stock} units. Status is now ${result.item.status}. Reason: ${adjustmentData.reason}`,
          type: 'warning',
          link: '/inventory'
        });
      } catch (err) {
        console.warn('Adjustment notification dispatch notice:', err.message);
      }
    }

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'INVENTORY_STOCK_ADJUSTED',
      entityType: 'INVENTORY_ITEM',
      entityId: itemId,
      metadata: {
        sku: result.item.sku,
        new_stock: result.item.in_stock,
        reason: adjustmentData.reason
      }
    });

    return result;
  }

  /**
   * Get transaction history for an item or whole organization
   */
  async getTransactions(organizationId, options = {}) {
    return this.repository.getTransactions(organizationId, options);
  }

  /**
   * Get items currently at or below minimum threshold
   */
  async getLowStock(organizationId) {
    return this.repository.getLowStockItems(organizationId);
  }

  /**
   * Aggregated inventory metrics
   */
  async getStats(organizationId) {
    return this.repository.getInventoryStats(organizationId);
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;

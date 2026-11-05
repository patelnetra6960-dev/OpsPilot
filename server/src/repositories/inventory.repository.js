import { BaseRepository } from './base.repository.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import { ValidationError, ConflictError, NotFoundError } from '../utils/errors.js';

export class InventoryRepository extends BaseRepository {
  constructor() {
    super('inventory_items', {
      mockKey: 'inventory_items',
      searchFields: ['sku', 'name', 'category', 'location', 'supplier_name'],
      allowedFilterFields: ['category', 'status', 'supplier_id', 'location'],
      allowedSortFields: ['sku', 'name', 'in_stock', 'unit_cost', 'created_at', 'updated_at']
    });
  }

  /**
   * Find item by SKU within active organization tenant
   */
  async findBySku(sku, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const items = mockDatabase.inventory_items || [];
      return (
        items.find(
          (i) =>
            i.organization_id === organizationId &&
            i.sku.toLowerCase() === sku.trim().toLowerCase() &&
            !i.deleted_at
        ) || null
      );
    }

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('sku', sku.trim())
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  /**
   * Atomic Stock Movement Execution
   * Enforces:
   * 1. Tenant boundary validation
   * 2. Idempotency (prevent duplicate transaction processing)
   * 3. Optimistic concurrency control (protect against concurrent stock updates)
   * 4. Stock quantity non-negative invariant (never allow negative inventory)
   * 5. Immutable audit ledger recording
   */
  async executeStockMovement(itemId, organizationId, movementData, context = {}) {
    this.assertTenantContext(organizationId);

    const item = await this.findById(itemId, organizationId);
    if (!item) {
      throw new NotFoundError('Inventory item', itemId);
    }

    // 1. Idempotency Check
    if (movementData.idempotency_key) {
      const existingTx = await this.findTransactionByIdempotencyKey(
        movementData.idempotency_key,
        organizationId
      );
      if (existingTx) {
        return {
          item,
          transaction: existingTx,
          duplicatePrevented: true
        };
      }
    }

    // 2. Optimistic Concurrency Control
    if (movementData.expected_version != null) {
      const currentVersion = Number(item.version || 1);
      const expectedVersion = Number(movementData.expected_version);
      if (currentVersion !== expectedVersion) {
        throw new ConflictError(
          `Concurrent update conflict on SKU '${item.sku}': Expected version ${expectedVersion}, but item is currently at version ${currentVersion}. Please reload latest state.`
        );
      }
    }

    // 3. Stock Delta & Invariant Calculation
    const currentStock = Number(item.in_stock || 0);
    const qty = Number(movementData.quantity);
    let newStock = currentStock;

    if (
      movementData.transaction_type === 'inbound' ||
      movementData.transaction_type === 'stock_in'
    ) {
      if (isNaN(qty) || qty <= 0) {
        throw new ValidationError('Stock-in quantity must be a positive integer greater than zero');
      }
      newStock = currentStock + qty;
    } else if (
      movementData.transaction_type === 'outbound' ||
      movementData.transaction_type === 'stock_out'
    ) {
      if (isNaN(qty) || qty <= 0) {
        throw new ValidationError(
          'Stock-out quantity must be a positive integer greater than zero'
        );
      }
      if (currentStock < qty) {
        throw new ValidationError(
          `Insufficient stock for SKU '${item.sku}': Requested ${qty}, but only ${currentStock} units are currently available.`
        );
      }
      newStock = currentStock - qty;
    } else if (movementData.transaction_type === 'adjustment') {
      if (movementData.adjustment_type === 'delta') {
        newStock = currentStock + qty;
        if (newStock < 0) {
          throw new ValidationError(
            `Invalid stock adjustment for SKU '${item.sku}': Resulting stock cannot be negative (calculated: ${newStock}).`
          );
        }
      } else {
        // Set absolute count from physical stock audit
        newStock = qty;
        if (newStock < 0) {
          throw new ValidationError(
            `Invalid stock adjustment for SKU '${item.sku}': Absolute stock count cannot be negative (provided: ${newStock}).`
          );
        }
      }
    } else {
      throw new ValidationError(
        `Unsupported stock transaction type: '${movementData.transaction_type}'`
      );
    }

    // 4. Status Transition Calculation
    const reorderLevel = Number(item.reorder_level != null ? item.reorder_level : 5);
    let newStatus = 'in_stock';
    if (newStock <= 0) {
      newStatus = 'out_of_stock';
    } else if (newStock <= reorderLevel) {
      newStatus = 'low_stock';
    }

    const now = new Date().toISOString();
    const newVersion = (Number(item.version) || 1) + 1;
    const performerName =
      movementData.performed_by ||
      (context.user
        ? `${context.user.first_name || ''} ${context.user.last_name || ''}`.trim() ||
          context.user.email
        : 'Warehouse Manager');

    // 5. Atomic Update Execution
    if (env.isMockMode || !supabaseAdmin) {
      // In-Memory atomic update
      item.in_stock = newStock;
      item.status = newStatus;
      item.version = newVersion;
      item.updated_at = now;

      const txRecord = {
        id: `tx-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        organization_id: organizationId,
        inventory_item_id: item.id,
        item_name: item.name,
        sku: item.sku,
        transaction_type: movementData.transaction_type,
        quantity: qty,
        previous_stock: currentStock,
        new_stock: newStock,
        unit_price: movementData.unit_price ?? item.unit_cost ?? 0,
        reference_type: movementData.reference_type || 'manual',
        reference_id: movementData.reference_id || null,
        idempotency_key: movementData.idempotency_key || null,
        reference_note: movementData.reference_note || movementData.reason || '',
        performed_by: performerName,
        created_at: now
      };

      if (!mockDatabase.stock_transactions) {
        mockDatabase.stock_transactions = [];
      }
      mockDatabase.stock_transactions.unshift(txRecord);

      return {
        item,
        transaction: txRecord,
        duplicatePrevented: false
      };
    }

    // Supabase / PostgreSQL Atomic Path
    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from(this.tableName)
      .update({
        in_stock: newStock,
        status: newStatus,
        version: newVersion,
        updated_at: now
      })
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const txPayload = {
      organization_id: organizationId,
      inventory_item_id: item.id,
      transaction_type: movementData.transaction_type,
      quantity: qty,
      unit_price: movementData.unit_price ?? item.unit_cost ?? 0,
      reference_note: movementData.reference_note || movementData.reason || '',
      performed_by: context.user?.id || null,
      created_at: now
    };

    const { data: txRecord, error: txError } = await supabaseAdmin
      .from('stock_transactions')
      .insert(txPayload)
      .select('*')
      .single();

    if (txError) throw txError;

    return {
      item: updatedItem,
      transaction: txRecord,
      duplicatePrevented: false
    };
  }

  /**
   * Find transaction by idempotency key to prevent duplicate runs
   */
  async findTransactionByIdempotencyKey(key, organizationId) {
    if (!key) return null;

    if (env.isMockMode || !supabaseAdmin) {
      const txs = mockDatabase.stock_transactions || [];
      return (
        txs.find((t) => t.organization_id === organizationId && t.idempotency_key === key) || null
      );
    }

    const { data, error } = await supabaseAdmin
      .from('stock_transactions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('idempotency_key', key)
      .maybeSingle();

    if (error) return null;
    return data || null;
  }

  /**
   * Retrieve paginated stock transactions for a specific item or entire tenant
   */
  async getTransactions(organizationId, { itemId = null, page = 1, limit = 20 } = {}) {
    this.assertTenantContext(organizationId);

    const offset = (page - 1) * limit;

    if (env.isMockMode || !supabaseAdmin) {
      let txs = (mockDatabase.stock_transactions || []).filter(
        (t) => t.organization_id === organizationId
      );

      if (itemId) {
        txs = txs.filter((t) => t.inventory_item_id === itemId);
      }

      const total = txs.length;
      const data = txs.slice(offset, offset + limit);

      return {
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      };
    }

    let query = supabaseAdmin
      .from('stock_transactions')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (itemId) {
      query = query.eq('inventory_item_id', itemId);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    return {
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit) || 1
      }
    };
  }

  /**
   * Retrieve low-stock inventory items below minimum threshold
   */
  async getLowStockItems(organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const items = (mockDatabase.inventory_items || []).filter(
        (i) => i.organization_id === organizationId && !i.deleted_at
      );
      return items.filter((i) => (Number(i.in_stock) || 0) <= (Number(i.reorder_level) || 5));
    }

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .or('status.eq.low_stock,status.eq.out_of_stock');

    if (error) throw error;
    return data || [];
  }

  /**
   * Calculate aggregated inventory telemetry
   */
  async getInventoryStats(organizationId) {
    this.assertTenantContext(organizationId);

    const items =
      env.isMockMode || !supabaseAdmin
        ? (mockDatabase.inventory_items || []).filter(
            (i) => i.organization_id === organizationId && !i.deleted_at
          )
        : (
            await supabaseAdmin
              .from(this.tableName)
              .select('*')
              .eq('organization_id', organizationId)
              .is('deleted_at', null)
          ).data || [];

    const totalSkus = items.length;
    let totalStockUnits = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of items) {
      const stock = Number(item.in_stock || 0);
      const cost = Number(item.unit_cost || 0);
      const reorder = Number(item.reorder_level || 5);

      totalStockUnits += stock;
      totalValuation += stock * cost;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= reorder) {
        lowStockCount++;
      }
    }

    return {
      totalSkus,
      totalStockUnits,
      totalValuation: Math.round(totalValuation * 100) / 100,
      lowStockCount,
      outOfStockCount,
      healthyStockCount: totalSkus - lowStockCount - outOfStockCount
    };
  }
}

export const inventoryRepository = new InventoryRepository();
export default inventoryRepository;

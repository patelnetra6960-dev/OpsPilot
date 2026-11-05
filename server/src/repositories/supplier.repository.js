import { BaseRepository } from './base.repository.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { inventoryRepository } from './inventory.repository.js';

export class SupplierRepository extends BaseRepository {
  constructor() {
    super('suppliers', {
      mockKey: 'suppliers',
      searchFields: ['name', 'code', 'contact_name', 'email', 'phone', 'category'],
      allowedFilterFields: ['category', 'status', 'payment_terms'],
      allowedSortFields: ['name', 'code', 'created_at', 'updated_at', 'status']
    });
  }

  /**
   * Find supplier by unique vendor code in tenant
   */
  async findByCode(code, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const suppliers = mockDatabase.suppliers || [];
      return (
        suppliers.find(
          (s) =>
            s.organization_id === organizationId &&
            s.code.toLowerCase() === code.trim().toLowerCase() &&
            !s.deleted_at
        ) || null
      );
    }

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('code', code.trim())
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  /**
   * Retrieve purchase orders for a specific supplier
   */
  async getPurchases(supplierId, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const pos = mockDatabase.purchase_orders || [];
      return pos.filter(
        (p) => p.organization_id === organizationId && (!supplierId || p.supplier_id === supplierId)
      );
    }

    // In production database, fetch from purchase_orders or supplier metadata
    const query = supabaseAdmin
      .from('purchase_orders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (supplierId) {
      query.eq('supplier_id', supplierId);
    }

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  }

  /**
   * Create a purchase order record for supplier
   */
  async createPurchase(supplierId, organizationId, purchaseData, _context = {}) {
    this.assertTenantContext(organizationId);

    const supplier = await this.findById(supplierId, organizationId);
    if (!supplier) throw new NotFoundError('Supplier', supplierId);

    const poNumber =
      purchaseData.po_number ||
      `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    let calculatedTotal = 0;
    const items = (purchaseData.items || []).map((it) => {
      const lineTotal = Number(it.quantity) * Number(it.unit_price || 0);
      calculatedTotal += lineTotal;
      return {
        ...it,
        total: Math.round(lineTotal * 100) / 100
      };
    });

    const now = new Date().toISOString();
    const poRecord = {
      id: `po-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      organization_id: organizationId,
      po_number: poNumber,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      order_date: purchaseData.order_date || now.split('T')[0],
      status: 'ordered',
      total_amount: Math.round(calculatedTotal * 100) / 100,
      items,
      notes: purchaseData.notes || '',
      created_at: now,
      updated_at: now
    };

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.purchase_orders) {
        mockDatabase.purchase_orders = [];
      }
      mockDatabase.purchase_orders.unshift(poRecord);
      return poRecord;
    }

    const { data, error } = await supabaseAdmin
      .from('purchase_orders')
      .insert(poRecord)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Receive purchase order and automatically trigger stock-in movements for inventory items
   */
  async receivePurchase(purchaseId, organizationId, context = {}) {
    this.assertTenantContext(organizationId);

    let po = null;
    if (env.isMockMode || !supabaseAdmin) {
      const list = mockDatabase.purchase_orders || [];
      po = list.find((p) => p.id === purchaseId && p.organization_id === organizationId);
    } else {
      const { data } = await supabaseAdmin
        .from('purchase_orders')
        .select('*')
        .eq('id', purchaseId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      po = data;
    }

    if (!po) throw new NotFoundError('Purchase Order', purchaseId);
    if (po.status === 'received') {
      throw new ValidationError(`Purchase order '${po.po_number}' has already been received.`);
    }

    po.status = 'received';
    po.received_at = new Date().toISOString();
    po.updated_at = new Date().toISOString();

    const stockMovements = [];

    // Automatically increase stock in warehouse for all line items
    for (const item of po.items || []) {
      let targetItemId = item.item_id;

      if (!targetItemId && item.sku) {
        const found = await inventoryRepository.findBySku(item.sku, organizationId);
        if (found) targetItemId = found.id;
      }

      if (targetItemId) {
        try {
          const moveRes = await inventoryRepository.executeStockMovement(
            targetItemId,
            organizationId,
            {
              transaction_type: 'inbound',
              quantity: item.quantity,
              unit_price: item.unit_price,
              supplier_id: po.supplier_id,
              reference_type: 'purchase_order',
              reference_id: po.po_number,
              reference_note: `Received from ${po.supplier_name} via ${po.po_number}`,
              idempotency_key: `po-receive-${po.id}-${targetItemId}`
            },
            context
          );
          stockMovements.push(moveRes);
        } catch (e) {
          // Continue receiving remaining items if one fails
          console.warn(`Could not auto-receive SKU ${item.sku}:`, e.message);
        }
      }
    }

    return {
      purchaseOrder: po,
      receivedMovements: stockMovements
    };
  }

  /**
   * Supplier network aggregated metrics
   */
  async getSupplierStats(organizationId) {
    this.assertTenantContext(organizationId);

    const suppliers =
      env.isMockMode || !supabaseAdmin
        ? (mockDatabase.suppliers || []).filter(
            (s) => s.organization_id === organizationId && !s.deleted_at
          )
        : (
            await supabaseAdmin
              .from(this.tableName)
              .select('*')
              .eq('organization_id', organizationId)
              .is('deleted_at', null)
          ).data || [];

    const totalSuppliers = suppliers.length;
    let activeCount = 0;
    let preferredCount = 0;

    for (const s of suppliers) {
      if (s.status === 'active') activeCount++;
      if (s.status === 'preferred') preferredCount++;
    }

    const pos =
      env.isMockMode || !supabaseAdmin
        ? (mockDatabase.purchase_orders || []).filter((p) => p.organization_id === organizationId)
        : [];

    let totalSpend = 0;
    for (const p of pos) {
      if (p.status === 'received' || p.status === 'ordered') {
        totalSpend += Number(p.total_amount || 0);
      }
    }

    return {
      totalSuppliers,
      activeCount,
      preferredCount,
      totalPurchaseOrders: pos.length,
      totalSpend: Math.round(totalSpend * 100) / 100
    };
  }
}

export const supplierRepository = new SupplierRepository();
export default supplierRepository;

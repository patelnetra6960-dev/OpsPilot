import { supabaseAdmin, getUserSupabaseClient, mockDatabase } from '../config/supabase.js';
import { withTenantScope, withPagination, handleSupabaseError } from '../utils/supabaseHelpers.js';
import { TenantIsolationError } from '../utils/errors.js';
import env from '../config/env.js';

/**
 * Enterprise Base Repository Pattern for OpsPilot Business Modules.
 * Enforces multi-tenant isolation, soft-deletion semantics, dynamic filtering,
 * full-text search, multi-column sorting, and strict pagination boundaries.
 */
export class BaseRepository {
  /**
   * @param {string} tableName - PostgreSQL table name
   * @param {string|object} [mockKeyOrOptions] - Mock data store key or options configuration
   */
  constructor(tableName, mockKeyOrOptions = null) {
    this.tableName = tableName;
    if (typeof mockKeyOrOptions === 'string') {
      this.mockKey = mockKeyOrOptions;
      this.options = {};
    } else {
      this.options = mockKeyOrOptions || {};
      this.mockKey = this.options.mockKey || tableName;
    }

    this.searchFields = this.options.searchFields || [
      'name',
      'title',
      'code',
      'email',
      'description'
    ];
    this.allowedFilterFields = this.options.allowedFilterFields || [
      'status',
      'department_id',
      'customer_id',
      'priority',
      'urgency'
    ];
    this.allowedSortFields = this.options.allowedSortFields || [
      'created_at',
      'updated_at',
      'id',
      'name',
      'status',
      'title'
    ];
    this.isOrganizationOwned = this.options.isOrganizationOwned !== false;
  }

  /**
   * Verifies that organizationId is provided for tenant-scoped operations.
   * Prevents any business module from executing cross-tenant queries.
   */
  assertTenantContext(organizationId) {
    if (this.isOrganizationOwned && !organizationId) {
      throw new TenantIsolationError(
        `Fatal Security Violation: organizationId is strictly required for repository '${this.tableName}'`
      );
    }
  }

  /**
   * Resolves the appropriate Supabase client.
   * If userToken is provided, returns user-scoped client (RLS enforced).
   * Otherwise returns admin client for system operations.
   */
  getClient(userToken = null) {
    if (userToken) {
      const userClient = getUserSupabaseClient(userToken);
      if (userClient) return userClient;
    }
    return supabaseAdmin;
  }

  /**
   * Find record by ID within organization tenant
   */
  async findById(id, organizationId, options = {}, userToken = null) {
    this.assertTenantContext(organizationId);
    const includeDeleted = Boolean(options.includeDeleted);

    if (env.isMockMode || !supabaseAdmin) {
      const list = mockDatabase[this.mockKey] || [];
      const item = list.find((r) => r.id === id);

      if (!item) return null;

      // Anti-cross-tenant boundary check
      if (
        this.isOrganizationOwned &&
        item.organization_id &&
        item.organization_id !== organizationId &&
        item.id !== organizationId
      ) {
        throw new TenantIsolationError(
          `Cross-tenant breach prevented on repository '${this.tableName}' for resource ID '${id}'`
        );
      }

      if (!includeDeleted && item.deleted_at) {
        return null;
      }

      return item;
    }

    const client = this.getClient(userToken);
    let query = client.from(this.tableName).select('*').eq('id', id);

    if (organizationId && this.isOrganizationOwned) {
      query = withTenantScope(query, organizationId);
    }

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw handleSupabaseError(error);
    }
    return data;
  }

  /**
   * Find all active records within tenant with pagination, sorting, search, and dynamic filtering
   */
  async findMany(organizationId, options = {}, userToken = null) {
    this.assertTenantContext(organizationId);

    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';
    const search = typeof options.search === 'string' ? options.search.trim() : null;
    const includeDeleted = Boolean(options.includeDeleted);
    const filters = { ...(options.filters || {}) };

    // Merge status filter if provided at top level
    if (options.status && !filters.status) {
      filters.status = options.status;
    }

    if (env.isMockMode || !supabaseAdmin) {
      let list = mockDatabase[this.mockKey] || [];

      // 1. Tenant boundary filtering
      if (this.isOrganizationOwned && organizationId) {
        list = list.filter(
          (item) => item.organization_id === organizationId || item.id === organizationId
        );
      }

      // 2. Soft deletion filtering
      if (!includeDeleted) {
        list = list.filter((item) => !item.deleted_at);
      }

      // 3. Dynamic criteria filtering
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null && v !== '') {
          list = list.filter((item) => String(item[k]) === String(v));
        }
      }

      // 4. Date range filters
      if (options.from_date) {
        list = list.filter((item) => item.created_at && item.created_at >= options.from_date);
      }
      if (options.to_date) {
        list = list.filter((item) => item.created_at && item.created_at <= options.to_date);
      }

      // 5. Search filtering across configured search fields
      if (search && search.length > 0) {
        const queryLower = search.toLowerCase();
        list = list.filter((item) =>
          this.searchFields.some((field) => {
            const val = item[field];
            return val && String(val).toLowerCase().includes(queryLower);
          })
        );
      }

      // 6. Sorting
      list = [...list].sort((a, b) => {
        const valA = a[sortBy] ?? '';
        const valB = b[sortBy] ?? '';
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      // 7. Pagination
      const total = list.length;
      const start = (page - 1) * limit;
      const data = list.slice(start, start + limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNextPage: start + limit < total,
          hasPrevPage: page > 1
        }
      };
    }

    const client = this.getClient(userToken);
    let query = client.from(this.tableName).select('*', { count: 'exact' });

    if (this.isOrganizationOwned && organizationId) {
      query = withTenantScope(query, organizationId);
    }

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // Dynamic criteria filtering
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') {
        query = query.eq(k, v);
      }
    }

    // Date range filtering
    if (options.from_date) {
      query = query.gte('created_at', options.from_date);
    }
    if (options.to_date) {
      query = query.lte('created_at', options.to_date);
    }

    // Multi-column full-text ilike search
    if (search && this.searchFields.length > 0) {
      const orClause = this.searchFields.map((field) => `${field}.ilike.%${search}%`).join(',');
      query = query.or(orClause);
    }

    // Sorting and Pagination
    query = withPagination(query, { page, limit, sortBy, sortOrder });

    const { data, count, error } = await query;
    if (error) throw handleSupabaseError(error);

    const totalCount = count || 0;
    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Create new record in tenant
   */
  async create(payload, organizationId, userToken = null) {
    this.assertTenantContext(organizationId);

    // Guaranteed tenant scoping: Inject organization_id and protect against spoofing
    const securePayload = {
      ...payload,
      ...(this.isOrganizationOwned && organizationId ? { organization_id: organizationId } : {})
    };

    if (env.isMockMode || !supabaseAdmin) {
      const newRecord = {
        id: securePayload.id || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...securePayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (!mockDatabase[this.mockKey]) {
        mockDatabase[this.mockKey] = [];
      }
      mockDatabase[this.mockKey].push(newRecord);
      return newRecord;
    }

    const client = this.getClient(userToken);
    const { data, error } = await client
      .from(this.tableName)
      .insert(securePayload)
      .select()
      .single();
    if (error) throw handleSupabaseError(error);
    return data;
  }

  /**
   * Update existing record in tenant
   */
  async update(id, organizationId, updates, userToken = null) {
    this.assertTenantContext(organizationId);

    // Guard against organization reassignment tampering and mass assignment of protected fields
    const sanitizedUpdates = { ...updates };
    delete sanitizedUpdates.organization_id;
    delete sanitizedUpdates.id;
    delete sanitizedUpdates.created_at;
    delete sanitizedUpdates.is_superadmin;

    if (env.isMockMode || !supabaseAdmin) {
      const list = mockDatabase[this.mockKey] || [];
      const item = list.find((r) => r.id === id);

      if (!item) return null;

      if (
        this.isOrganizationOwned &&
        item.organization_id &&
        item.organization_id !== organizationId
      ) {
        throw new TenantIsolationError(
          `Cross-tenant breach prevented on update in '${this.tableName}'`
        );
      }

      Object.assign(item, sanitizedUpdates, { updated_at: new Date().toISOString() });
      return item;
    }

    const client = this.getClient(userToken);
    let query = client
      .from(this.tableName)
      .update({ ...sanitizedUpdates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (this.isOrganizationOwned && organizationId) {
      query = withTenantScope(query, organizationId);
    }

    const { data, error } = await query.select().single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw handleSupabaseError(error);
    }
    return data;
  }

  /**
   * Soft-delete record in tenant
   */
  async softDelete(id, organizationId, userToken = null) {
    return this.update(id, organizationId, { deleted_at: new Date().toISOString() }, userToken);
  }

  /**
   * Restore soft-deleted record in tenant
   */
  async restore(id, organizationId, userToken = null) {
    return this.update(id, organizationId, { deleted_at: null }, userToken);
  }

  /**
   * Hard-delete (permanent) record in tenant
   */
  async deletePermanent(id, organizationId, userToken = null) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const list = mockDatabase[this.mockKey] || [];
      const idx = list.findIndex(
        (item) => item.id === id && (!organizationId || item.organization_id === organizationId)
      );
      if (idx === -1) return false;
      list.splice(idx, 1);
      return true;
    }

    const client = this.getClient(userToken);
    let query = client.from(this.tableName).delete().eq('id', id);

    if (this.isOrganizationOwned && organizationId) {
      query = withTenantScope(query, organizationId);
    }

    const { error } = await query;
    if (error) throw handleSupabaseError(error);
    return true;
  }
}

export default BaseRepository;

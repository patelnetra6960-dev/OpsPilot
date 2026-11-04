import { supabaseAdmin, getUserSupabaseClient, mockDatabase } from '../config/supabase.js';
import { withTenantScope, withPagination, handleSupabaseError } from '../utils/supabaseHelpers.js';
import env from '../config/env.js';

/**
 * Base Repository Pattern for Supabase PostgreSQL Tables
 * Supports both user-scoped JWT operations (evaluating RLS)
 * and privileged admin operations with tenant boundary filtering.
 */
export class BaseRepository {
  constructor(tableName, mockKey = null) {
    this.tableName = tableName;
    this.mockKey = mockKey || tableName;
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
  async findById(id, organizationId, userToken = null) {
    if (env.isMockMode || !supabaseAdmin) {
      const list = mockDatabase[this.mockKey] || [];
      return (
        list.find(
          (item) =>
            item.id === id &&
            (!organizationId ||
              item.organization_id === organizationId ||
              item.id === organizationId) &&
            !item.deleted_at
        ) || null
      );
    }

    const client = this.getClient(userToken);
    let query = client.from(this.tableName).select('*').eq('id', id);

    if (organizationId) {
      query = withTenantScope(query, organizationId);
    }

    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw handleSupabaseError(error);
    }
    return data;
  }

  /**
   * Find all active records within tenant with pagination and sorting
   */
  async findMany(organizationId, options = {}, userToken = null) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      filters = {}
    } = options;

    if (env.isMockMode || !supabaseAdmin) {
      let list = mockDatabase[this.mockKey] || [];
      if (organizationId) {
        list = list.filter(
          (item) =>
            (item.organization_id === organizationId || item.id === organizationId) &&
            !item.deleted_at
        );
      }
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined) {
          list = list.filter((item) => item[k] === v);
        }
      }
      const total = list.length;
      const start = (page - 1) * limit;
      const data = list.slice(start, start + limit);
      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: start + limit < total,
          hasPrevPage: page > 1
        }
      };
    }

    const client = this.getClient(userToken);
    let query = client.from(this.tableName).select('*', { count: 'exact' });

    if (organizationId) {
      query = withTenantScope(query, organizationId);
    }

    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined) {
        query = query.eq(k, v);
      }
    }

    query = withPagination(query, { page, limit, sortBy, sortOrder });

    const { data, count, error } = await query;
    if (error) throw handleSupabaseError(error);

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNextPage: page * limit < (count || 0),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Create new record in tenant
   */
  async create(payload, userToken = null) {
    if (env.isMockMode || !supabaseAdmin) {
      const newRecord = {
        id: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...payload,
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
    const { data, error } = await client.from(this.tableName).insert(payload).select().single();
    if (error) throw handleSupabaseError(error);
    return data;
  }

  /**
   * Update existing record in tenant
   */
  async update(id, organizationId, updates, userToken = null) {
    if (env.isMockMode || !supabaseAdmin) {
      const list = mockDatabase[this.mockKey] || [];
      const idx = list.findIndex(
        (item) => item.id === id && (!organizationId || item.organization_id === organizationId)
      );
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
      return list[idx];
    }

    const client = this.getClient(userToken);
    let query = client
      .from(this.tableName)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (organizationId) {
      query = withTenantScope(query, organizationId);
    }

    const { data, error } = await query.select().single();
    if (error) throw handleSupabaseError(error);
    return data;
  }

  /**
   * Soft-delete record in tenant
   */
  async softDelete(id, organizationId, userToken = null) {
    return this.update(id, organizationId, { deleted_at: new Date().toISOString() }, userToken);
  }
}

export default BaseRepository;

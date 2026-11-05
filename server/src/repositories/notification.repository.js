import BaseRepository from './base.repository.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications', {
      mockKey: 'notifications',
      allowedFilterFields: ['user_id', 'is_read', 'type'],
      allowedSortFields: ['created_at', 'read_at', 'title'],
      searchFields: ['title', 'message', 'type']
    });
  }

  /**
   * Find paginated notifications scoped to user and organization
   */
  async findForUser(userId, organizationId, options = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));

    if (env.isMockMode || !supabaseAdmin) {
      let items = (mockDatabase.notifications || []).filter(
        (n) => n.organization_id === organizationId && n.user_id === userId
      );

      if (options.is_read !== undefined && options.is_read !== '') {
        const isReadBool = String(options.is_read) === 'true';
        items = items.filter((n) => Boolean(n.is_read) === isReadBool);
      }

      if (options.type) {
        items = items.filter((n) => n.type === options.type);
      }

      // Sort newest first
      items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginatedData = items.slice(startIndex, startIndex + limit);

      return {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total: totalItems,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    }

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (options.is_read !== undefined && options.is_read !== '') {
      query = query.eq('is_read', String(options.is_read) === 'true');
    }

    if (options.type) {
      query = query.eq('type', options.type);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const total = count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total,
        totalItems: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * Get unread notification counter for user
   */
  async getUnreadCount(userId, organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      const items = (mockDatabase.notifications || []).filter(
        (n) => n.organization_id === organizationId && n.user_id === userId && !n.is_read
      );
      return items.length;
    }

    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(id, userId, organizationId) {
    const now = new Date().toISOString();

    if (env.isMockMode || !supabaseAdmin) {
      const item = (mockDatabase.notifications || []).find(
        (n) => n.id === id && n.organization_id === organizationId && n.user_id === userId
      );
      if (!item) return null;
      item.is_read = true;
      item.read_at = now;
      return item;
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Mark all unread notifications as read for a user
   */
  async markAllAsRead(userId, organizationId) {
    const now = new Date().toISOString();

    if (env.isMockMode || !supabaseAdmin) {
      let updatedCount = 0;
      (mockDatabase.notifications || []).forEach((n) => {
        if (n.organization_id === organizationId && n.user_id === userId && !n.is_read) {
          n.is_read = true;
          n.read_at = now;
          updatedCount++;
        }
      });
      return { success: true, updatedCount };
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) throw error;
    return { success: true, updatedCount: data?.length || 0 };
  }

  /**
   * Delete notification
   */
  async deleteForUser(id, userId, organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      const idx = (mockDatabase.notifications || []).findIndex(
        (n) => n.id === id && n.organization_id === organizationId && n.user_id === userId
      );
      if (idx === -1) return false;
      mockDatabase.notifications.splice(idx, 1);
      return true;
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }
}

export const notificationRepository = new NotificationRepository();

import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

export class NotificationService {
  /**
   * Dispatch a notification to a specific user within an organization
   */
  async sendNotification({
    organizationId,
    userId,
    title,
    message,
    type = 'info',
    actionUrl = null
  }) {
    if (!organizationId) {
      logger.warn('sendNotification called without organizationId, skipping');
      return null;
    }

    const notificationRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organization_id: organizationId,
      user_id: userId,
      title,
      message,
      type, // 'info' | 'success' | 'warning' | 'error' | 'dispatch' | 'alert'
      action_url: actionUrl,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString()
    };

    logger.info(`[NOTIFICATION] ${type.toUpperCase()}: ${title} -> User: ${userId || 'All'}`);

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.notifications) mockDatabase.notifications = [];
      mockDatabase.notifications.push(notificationRecord);
      return notificationRecord;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          title,
          message,
          type,
          action_url: actionUrl
        })
        .select()
        .single();

      if (error) {
        logger.warn(`Failed to persist notification to database: ${error.message}`);
        return notificationRecord;
      }
      return data;
    } catch (err) {
      logger.warn(`Notification dispatch error: ${err.message}`);
      return notificationRecord;
    }
  }

  /**
   * Get notifications for active user
   */
  async getUserNotifications(userId, organizationId) {
    if (env.isMockMode || !supabaseAdmin) {
      const list = mockDatabase.notifications || [];
      return list
        .filter(
          (n) =>
            n.organization_id === organizationId && (!userId || n.user_id === userId || !n.user_id)
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId, organizationId, _userId) {
    const readAt = new Date().toISOString();

    if (env.isMockMode || !supabaseAdmin) {
      const list = mockDatabase.notifications || [];
      const item = list.find(
        (n) => n.id === notificationId && n.organization_id === organizationId
      );
      if (item) {
        item.is_read = true;
        item.read_at = readAt;
      }
      return item;
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: readAt })
      .eq('id', notificationId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const notificationService = new NotificationService();
export default notificationService;

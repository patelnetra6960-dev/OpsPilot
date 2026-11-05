import { notificationService } from '../services/notification.service.js';
import { sendPaginated, sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class NotificationController {
  getUserContext(req) {
    return {
      userId: req.user?.id,
      organizationId: req.tenant.id
    };
  }

  /**
   * List paginated notifications for the authenticated user
   */
  listNotifications = asyncHandler(async (req, res) => {
    const { userId, organizationId } = this.getUserContext(req);
    const result = await notificationService.listNotifications(userId, organizationId, req.query);
    return sendPaginated(
      res,
      result.data,
      result.pagination,
      'Notifications retrieved successfully'
    );
  });

  /**
   * Get unread notification counter for badge
   */
  getUnreadCount = asyncHandler(async (req, res) => {
    const { userId, organizationId } = this.getUserContext(req);
    const result = await notificationService.getUnreadCount(userId, organizationId);
    return sendSuccess(res, result, 'Unread notification count retrieved');
  });

  /**
   * Mark single notification as read
   */
  markAsRead = asyncHandler(async (req, res) => {
    const { userId, organizationId } = this.getUserContext(req);
    const { id } = req.params;
    const result = await notificationService.markAsRead(id, userId, organizationId);
    return sendSuccess(res, result, 'Notification marked as read');
  });

  /**
   * Mark all notifications as read for current user
   */
  markAllAsRead = asyncHandler(async (req, res) => {
    const { userId, organizationId } = this.getUserContext(req);
    const result = await notificationService.markAllAsRead(userId, organizationId);
    return sendSuccess(res, result, 'All notifications marked as read');
  });

  /**
   * Delete a notification
   */
  deleteNotification = asyncHandler(async (req, res) => {
    const { userId, organizationId } = this.getUserContext(req);
    const { id } = req.params;
    const result = await notificationService.deleteNotification(id, userId, organizationId);
    return sendSuccess(res, result, 'Notification deleted successfully');
  });
}

export const notificationController = new NotificationController();
export default notificationController;

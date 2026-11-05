import { createCrudRouter } from './crudRouterFactory.js';
import taskController from '../controllers/task.controller.js';
import taskValidator, {
  taskStatusTransitionSchema,
  assignTaskSchema,
  createTaskCommentSchema,
  createTaskAttachmentSchema
} from '../validators/task.validator.js';

export const tasksRouter = createCrudRouter({
  controller: taskController,
  validator: taskValidator,
  roles: {
    read: ['owner', 'admin', 'manager', 'employee', 'member'],
    create: ['owner', 'admin', 'manager', 'employee'],
    update: ['owner', 'admin', 'manager', 'employee'],
    delete: ['owner', 'admin', 'manager'],
    action: ['owner', 'admin', 'manager', 'employee']
  },
  extendRouter: (router, { requireTenantRole, validate, controller }) => {
    // Kanban drag-and-drop status transition with server-side validation
    router.patch(
      '/:id/status',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(taskStatusTransitionSchema),
      controller.transitionStatus
    );

    // Task Assignments
    router.get(
      '/:id/assignments',
      requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
      controller.getAssignments
    );
    router.post(
      '/:id/assignments',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(assignTaskSchema),
      controller.assignMember
    );

    // Task Comments
    router.get(
      '/:id/comments',
      requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
      controller.getComments
    );
    router.post(
      '/:id/comments',
      requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
      validate(createTaskCommentSchema),
      controller.addComment
    );

    // Task Attachments
    router.get(
      '/:id/attachments',
      requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
      controller.getAttachments
    );
    router.post(
      '/:id/attachments',
      requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
      validate(createTaskAttachmentSchema),
      controller.addAttachment
    );
  }
});

export default tasksRouter;

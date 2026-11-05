import { createCrudRouter } from './crudRouterFactory.js';
import projectController from '../controllers/project.controller.js';
import projectValidator, {
  addProjectMemberSchema,
  createMilestoneSchema,
  updateMilestoneSchema
} from '../validators/project.validator.js';

export const projectsRouter = createCrudRouter({
  controller: projectController,
  validator: projectValidator,
  roles: {
    read: ['owner', 'admin', 'manager', 'employee', 'member'],
    create: ['owner', 'admin', 'manager'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin'],
    action: ['owner', 'admin', 'manager']
  },
  extendRouter: (router, { requireTenantRole, validate, controller }) => {
    // Project Members
    router.get(
      '/:id/members',
      requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
      controller.getMembers
    );
    router.post(
      '/:id/members',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(addProjectMemberSchema),
      controller.addMember
    );
    router.delete(
      '/:id/members/:memberId',
      requireTenantRole(['owner', 'admin', 'manager']),
      controller.removeMember
    );

    // Project Milestones
    router.get(
      '/:id/milestones',
      requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
      controller.getMilestones
    );
    router.post(
      '/:id/milestones',
      requireTenantRole(['owner', 'admin', 'manager']),
      validate(createMilestoneSchema),
      controller.addMilestone
    );
    router.patch(
      '/:id/milestones/:milestoneId',
      requireTenantRole(['owner', 'admin', 'manager', 'employee']),
      validate(updateMilestoneSchema),
      controller.updateMilestone
    );
  }
});

export default projectsRouter;

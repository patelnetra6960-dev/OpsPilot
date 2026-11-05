import BaseRepository from './base.repository.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export class TaskRepository extends BaseRepository {
  constructor() {
    super('tasks', {
      mockKey: 'tasks',
      searchFields: ['title', 'task_code', 'description', 'category'],
      allowedFilterFields: ['priority', 'column_name', 'project_id', 'assigned_to', 'category'],
      allowedSortFields: [
        'created_at',
        'updated_at',
        'due_date',
        'priority',
        'column_name',
        'title'
      ]
    });
  }

  /**
   * Transition task status column (Kanban movement)
   */
  async transitionStatus(taskId, organizationId, newColumn) {
    this.assertTenantContext(organizationId);

    const validColumns = ['todo', 'in_progress', 'review', 'completed'];
    if (!validColumns.includes(newColumn)) {
      const err = new Error(
        `Invalid column transition: '${newColumn}'. Allowed: ${validColumns.join(', ')}`
      );
      err.status = 400;
      throw err;
    }

    if (env.isMockMode || !supabaseAdmin) {
      const task = (mockDatabase.tasks || []).find(
        (t) => t.id === taskId && t.organization_id === organizationId && !t.deleted_at
      );

      if (!task) {
        const err = new Error('Task not found');
        err.status = 404;
        throw err;
      }

      task.column_name = newColumn;
      task.column = newColumn; // prototype compat
      task.updated_at = new Date().toISOString();
      return task;
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({ column_name: newColumn, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Find task assignments
   */
  async findAssignments(taskId, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const assignments = (mockDatabase.task_assignments || []).filter(
        (a) => a.task_id === taskId && a.organization_id === organizationId
      );

      return assignments.map((a) => {
        const wf = (mockDatabase.workforce || []).find((w) => w.id === a.workforce_member_id);
        return {
          ...a,
          workforce: wf || null
        };
      });
    }

    const { data, error } = await supabaseAdmin
      .from('task_assignments')
      .select('*, workforce:workforce_members(*)')
      .eq('task_id', taskId)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Assign workforce member to task
   */
  async assignMember(taskId, organizationId, workforce_member_id) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.task_assignments) mockDatabase.task_assignments = [];

      const existing = mockDatabase.task_assignments.find(
        (a) =>
          a.task_id === taskId &&
          a.workforce_member_id === workforce_member_id &&
          a.organization_id === organizationId
      );

      if (existing) return existing;

      const newAssignment = {
        id: `ta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        organization_id: organizationId,
        task_id: taskId,
        workforce_member_id,
        assigned_at: new Date().toISOString()
      };

      mockDatabase.task_assignments.push(newAssignment);

      // Also sync task.assigned_to
      const task = (mockDatabase.tasks || []).find((t) => t.id === taskId);
      if (task) task.assigned_to = workforce_member_id;

      return newAssignment;
    }

    const { data, error } = await supabaseAdmin
      .from('task_assignments')
      .insert({
        organization_id: organizationId,
        task_id: taskId,
        workforce_member_id
      })
      .select()
      .single();

    if (error) throw error;

    // Update primary assigned_to on tasks table
    await supabaseAdmin
      .from('tasks')
      .update({ assigned_to: workforce_member_id, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('organization_id', organizationId);

    return data;
  }

  /**
   * Find comments for task
   */
  async findComments(taskId, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const comments = (mockDatabase.task_comments || []).filter(
        (c) => c.task_id === taskId && c.organization_id === organizationId
      );

      return comments.map((c) => {
        const user = (mockDatabase.users || []).find((u) => u.id === c.user_id);
        return {
          ...c,
          author: user || { full_name: 'Team Member', email: 'user@acme.com' }
        };
      });
    }

    const { data, error } = await supabaseAdmin
      .from('task_comments')
      .select('*, author:user_profiles(*)')
      .eq('task_id', taskId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Add comment to task
   */
  async addComment(taskId, organizationId, { user_id, comment_text }) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.task_comments) mockDatabase.task_comments = [];

      const user = (mockDatabase.users || []).find((u) => u.id === user_id);

      const newComment = {
        id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        organization_id: organizationId,
        task_id: taskId,
        user_id,
        comment_text,
        author: user || { full_name: 'Team Member', email: 'user@acme.com' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDatabase.task_comments.push(newComment);

      // Increment comments_count if present on task
      const task = (mockDatabase.tasks || []).find((t) => t.id === taskId);
      if (task) {
        task.commentsCount = (task.commentsCount || 0) + 1;
      }

      return newComment;
    }

    const { data, error } = await supabaseAdmin
      .from('task_comments')
      .insert({
        organization_id: organizationId,
        task_id: taskId,
        user_id,
        comment_text
      })
      .select('*, author:user_profiles(*)')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Find attachments for task
   */
  async findAttachments(taskId, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      return (mockDatabase.task_attachments || []).filter(
        (a) => a.task_id === taskId && a.organization_id === organizationId
      );
    }

    const { data, error } = await supabaseAdmin
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Add attachment to task
   */
  async addAttachment(taskId, organizationId, attachmentData) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.task_attachments) mockDatabase.task_attachments = [];

      const newAttachment = {
        id: `ta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        organization_id: organizationId,
        task_id: taskId,
        file_name: attachmentData.file_name,
        file_url: attachmentData.file_url,
        file_size: attachmentData.file_size || 1024,
        mime_type: attachmentData.mime_type || 'application/pdf',
        uploaded_by: attachmentData.uploaded_by || null,
        created_at: new Date().toISOString()
      };

      mockDatabase.task_attachments.push(newAttachment);
      return newAttachment;
    }

    const { data, error } = await supabaseAdmin
      .from('task_attachments')
      .insert({
        organization_id: organizationId,
        task_id: taskId,
        ...attachmentData
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const taskRepository = new TaskRepository();
export default taskRepository;

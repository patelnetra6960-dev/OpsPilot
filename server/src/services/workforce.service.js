import workforceRepository from '../repositories/workforce.repository.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';

export const workforceService = {
  /**
   * Get workforce directory with search, filtering, sorting, and pagination
   */
  async getWorkforce(tenantId, options = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      department,
      department_id,
      status,
      employment_type,
      manager_id,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    if (env.isMockMode || !supabaseAdmin) {
      let members = (mockDatabase.workforce || []).filter(
        (w) => w.organization_id === tenantId && !w.deleted_at
      );

      // Filtering
      if (department) {
        members = members.filter(
          (m) => (m.department || '').toLowerCase() === department.toLowerCase()
        );
      }
      if (department_id) {
        members = members.filter((m) => m.department_id === department_id);
      }
      if (status) {
        members = members.filter((m) => (m.status || '').toLowerCase() === status.toLowerCase());
      }
      if (employment_type) {
        members = members.filter(
          (m) => (m.employment_type || '').toLowerCase() === employment_type.toLowerCase()
        );
      }
      if (manager_id) {
        members = members.filter((m) => m.manager_id === manager_id);
      }

      // Search across first_name, last_name, email, employee_code, designation
      if (search) {
        const query = search.toLowerCase();
        members = members.filter(
          (m) =>
            (m.first_name || '').toLowerCase().includes(query) ||
            (m.last_name || '').toLowerCase().includes(query) ||
            (m.email || '').toLowerCase().includes(query) ||
            (m.employee_code || '').toLowerCase().includes(query) ||
            (m.designation || '').toLowerCase().includes(query)
        );
      }

      // Sorting
      members.sort((a, b) => {
        let valA = a[sortBy] ?? '';
        let valB = b[sortBy] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      // Pagination
      const total = members.length;
      const start = (page - 1) * limit;
      const data = members.slice(start, start + limit);

      return {
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: start + limit < total,
          hasPrevPage: page > 1
        }
      };
    }

    // Production Supabase Query
    let query = supabaseAdmin
      .from('workforce_members')
      .select('*', { count: 'exact' })
      .eq('organization_id', tenantId)
      .is('deleted_at', null);

    if (department) query = query.eq('department', department);
    if (department_id) query = query.eq('department_id', department_id);
    if (status) query = query.eq('status', status);
    if (employment_type) query = query.eq('employment_type', employment_type);
    if (manager_id) query = query.eq('manager_id', manager_id);

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%,designation.ilike.%${search}%`
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNextPage: page * limit < (count || 0),
        hasPrevPage: page > 1
      }
    };
  },

  /**
   * Get employee details by ID
   */
  async getMemberById(tenantId, memberId) {
    if (env.isMockMode || !supabaseAdmin) {
      const member = (mockDatabase.workforce || []).find(
        (w) => w.id === memberId && w.organization_id === tenantId && !w.deleted_at
      );

      if (!member) {
        const err = new Error('Workforce member not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      // Resolve department
      const department =
        (mockDatabase.departments || []).find((d) => d.id === member.department_id) || null;

      // Resolve manager
      const manager = member.manager_id
        ? (mockDatabase.workforce || []).find((w) => w.id === member.manager_id) || null
        : null;

      // Resolve membership role if linked to user
      const membership = member.user_id
        ? (mockDatabase.memberships || []).find(
            (m) => m.organization_id === tenantId && m.user_id === member.user_id
          )
        : null;

      return {
        ...member,
        departmentDetails: department,
        managerDetails: manager
          ? {
              id: manager.id,
              name: `${manager.first_name} ${manager.last_name}`,
              designation: manager.designation
            }
          : null,
        role: membership?.role || 'employee'
      };
    }

    const { data: member, error } = await supabaseAdmin
      .from('workforce_members')
      .select('*')
      .eq('id', memberId)
      .eq('organization_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error || !member) {
      const err = new Error('Workforce member not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return member;
  },

  /**
   * Create a new workforce member (Transactional)
   */
  async createMember(tenantId, memberData, _requesterRole = 'manager') {
    const cleanEmail = memberData.email.trim().toLowerCase();

    if (env.isMockMode || !supabaseAdmin) {
      // Check employee_code uniqueness within tenant
      const existingCode = (mockDatabase.workforce || []).find(
        (w) =>
          w.organization_id === tenantId &&
          w.employee_code.toLowerCase() === memberData.employee_code.toLowerCase() &&
          !w.deleted_at
      );
      if (existingCode) {
        const err = new Error(`Employee code '${memberData.employee_code}' already in use`);
        err.status = 409;
        err.code = 'CONFLICT_EMPLOYEE_CODE';
        throw err;
      }

      // Check email uniqueness within tenant
      const existingEmail = (mockDatabase.workforce || []).find(
        (w) =>
          w.organization_id === tenantId && w.email.toLowerCase() === cleanEmail && !w.deleted_at
      );
      if (existingEmail) {
        const err = new Error(`Workforce member with email '${cleanEmail}' already exists`);
        err.status = 409;
        err.code = 'CONFLICT_EMAIL';
        throw err;
      }

      // Validate department_id if provided
      if (memberData.department_id) {
        const dept = (mockDatabase.departments || []).find(
          (d) => d.id === memberData.department_id && d.organization_id === tenantId
        );
        if (!dept) {
          const err = new Error(
            `Department '${memberData.department_id}' not found in this organization`
          );
          err.status = 400;
          err.code = 'INVALID_DEPARTMENT';
          throw err;
        }
      }

      // Validate manager_id if provided
      if (memberData.manager_id) {
        const mgr = (mockDatabase.workforce || []).find(
          (w) => w.id === memberData.manager_id && w.organization_id === tenantId && !w.deleted_at
        );
        if (!mgr) {
          const err = new Error(
            `Manager '${memberData.manager_id}' not found in this organization`
          );
          err.status = 400;
          err.code = 'INVALID_MANAGER';
          throw err;
        }
      }

      const newMember = {
        id: `wm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        organization_id: tenantId,
        employee_code: memberData.employee_code,
        first_name: memberData.first_name,
        last_name: memberData.last_name,
        email: cleanEmail,
        phone: memberData.phone || null,
        department_id: memberData.department_id || null,
        department: memberData.department || 'Operations',
        designation: memberData.designation || 'Associate',
        employment_type: memberData.employment_type || 'full_time',
        status: memberData.status || 'active',
        hourly_rate: memberData.hourly_rate ?? 0,
        skills: memberData.skills || [],
        manager_id: memberData.manager_id || null,
        user_id: memberData.user_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!mockDatabase.workforce) mockDatabase.workforce = [];
      mockDatabase.workforce.push(newMember);

      // Multi-step sync: if user_id or role is specified, provision membership
      if (memberData.user_id && memberData.role) {
        const existingMem = (mockDatabase.memberships || []).find(
          (m) => m.organization_id === tenantId && m.user_id === memberData.user_id
        );
        if (!existingMem) {
          mockDatabase.memberships.push({
            id: `mem-${Date.now()}`,
            organization_id: tenantId,
            user_id: memberData.user_id,
            role: memberData.role || 'employee',
            status: 'active',
            created_at: new Date().toISOString()
          });
        }
      }

      return newMember;
    }

    // Production: Supabase Insert
    const { data, error } = await supabaseAdmin
      .from('workforce_members')
      .insert({
        organization_id: tenantId,
        employee_code: memberData.employee_code,
        first_name: memberData.first_name,
        last_name: memberData.last_name,
        email: cleanEmail,
        phone: memberData.phone,
        department_id: memberData.department_id,
        department: memberData.department,
        designation: memberData.designation,
        employment_type: memberData.employment_type,
        status: memberData.status || 'active',
        hourly_rate: memberData.hourly_rate,
        skills: memberData.skills,
        manager_id: memberData.manager_id,
        user_id: memberData.user_id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const err = new Error('Employee code or email already in use');
        err.status = 409;
        err.code = 'CONFLICT_DUPLICATE_WORKFORCE';
        throw err;
      }
      throw error;
    }

    return data;
  },

  /**
   * Update employee general details
   */
  async updateMember(tenantId, memberId, updates) {
    const allowed = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'designation',
      'employment_type',
      'status',
      'hourly_rate',
      'skills',
      'metadata'
    ];

    const sanitized = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }

    if (env.isMockMode || !supabaseAdmin) {
      const idx = (mockDatabase.workforce || []).findIndex(
        (w) => w.id === memberId && w.organization_id === tenantId && !w.deleted_at
      );

      if (idx === -1) {
        const err = new Error('Workforce member not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      mockDatabase.workforce[idx] = {
        ...mockDatabase.workforce[idx],
        ...sanitized,
        updated_at: new Date().toISOString()
      };

      return mockDatabase.workforce[idx];
    }

    const { data, error } = await supabaseAdmin
      .from('workforce_members')
      .update({ ...sanitized, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('organization_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Assign employee to a department
   */
  async assignDepartment(tenantId, memberId, { department_id, department }) {
    if (env.isMockMode || !supabaseAdmin) {
      const member = (mockDatabase.workforce || []).find(
        (w) => w.id === memberId && w.organization_id === tenantId && !w.deleted_at
      );

      if (!member) {
        const err = new Error('Workforce member not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      // Verify department exists in tenant
      const dept = (mockDatabase.departments || []).find(
        (d) => d.id === department_id && d.organization_id === tenantId
      );

      member.department_id = department_id;
      member.department = dept ? dept.name : department || member.department;
      member.updated_at = new Date().toISOString();
      return member;
    }

    const { data, error } = await supabaseAdmin
      .from('workforce_members')
      .update({
        department_id,
        ...(department ? { department } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('organization_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Assign manager to employee (Prevents self-management cycle)
   */
  async assignManager(tenantId, memberId, { manager_id }) {
    if (manager_id === memberId) {
      const err = new Error(
        'Self-management cycle prevented: An employee cannot be their own manager'
      );
      err.status = 400;
      err.code = 'INVALID_MANAGER_CYCLE';
      throw err;
    }

    if (env.isMockMode || !supabaseAdmin) {
      const member = (mockDatabase.workforce || []).find(
        (w) => w.id === memberId && w.organization_id === tenantId && !w.deleted_at
      );

      if (!member) {
        const err = new Error('Workforce member not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (manager_id) {
        const manager = (mockDatabase.workforce || []).find(
          (w) => w.id === manager_id && w.organization_id === tenantId && !w.deleted_at
        );
        if (!manager) {
          const err = new Error(`Manager '${manager_id}' not found in this organization`);
          err.status = 400;
          err.code = 'INVALID_MANAGER';
          throw err;
        }
      }

      member.manager_id = manager_id;
      member.updated_at = new Date().toISOString();
      return member;
    }

    const { data, error } = await supabaseAdmin
      .from('workforce_members')
      .update({ manager_id, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('organization_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Change permitted role for an employee's linked membership
   */
  async changeRole(tenantId, memberId, { role, requesterRole, requesterUserId }) {
    if (!['owner', 'admin'].includes(requesterRole)) {
      const err = new Error(
        'Forbidden: Only organization owners and admins can alter permitted roles'
      );
      err.status = 403;
      err.code = 'INSUFFICIENT_ROLE_PERMISSIONS';
      throw err;
    }

    let userId = null;

    if (env.isMockMode || !supabaseAdmin) {
      const member = (mockDatabase.workforce || []).find(
        (w) => w.id === memberId && w.organization_id === tenantId && !w.deleted_at
      );

      if (!member) {
        const err = new Error('Workforce member not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      userId = member.user_id;

      if (!userId) {
        // Attempt match by email
        const user = (mockDatabase.users || []).find((u) => u.email === member.email);
        userId = user?.id || null;
      }

      if (!userId) {
        const err = new Error('Cannot assign role: Employee has no linked user account');
        err.status = 400;
        err.code = 'USER_NOT_LINKED';
        throw err;
      }

      // Anti-Privilege Escalation
      if (userId === requesterUserId) {
        const err = new Error('Privilege Escalation Blocked: You cannot modify your own role');
        err.status = 403;
        err.code = 'FORBIDDEN_SELF_ROLE_ELEVATION';
        throw err;
      }

      if (role === 'owner' && requesterRole !== 'owner') {
        const err = new Error('Forbidden: Admins cannot promote members to organization owner');
        err.status = 403;
        err.code = 'FORBIDDEN_CANNOT_ASSIGN_OWNER';
        throw err;
      }

      let mem = (mockDatabase.memberships || []).find(
        (m) => m.organization_id === tenantId && m.user_id === userId
      );

      if (!mem) {
        mem = {
          id: `mem-${Date.now()}`,
          organization_id: tenantId,
          user_id: userId,
          role,
          status: 'active',
          created_at: new Date().toISOString()
        };
        mockDatabase.memberships.push(mem);
      } else {
        mem.role = role;
        mem.updated_at = new Date().toISOString();
      }

      return {
        memberId,
        userId,
        newRole: role
      };
    }

    // Production: Supabase Role Change
    const { data: member } = await supabaseAdmin
      .from('workforce_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('organization_id', tenantId)
      .single();

    if (!member?.user_id) {
      const err = new Error('Cannot assign role: Employee has no linked user account');
      err.status = 400;
      err.code = 'USER_NOT_LINKED';
      throw err;
    }

    if (member.user_id === requesterUserId) {
      const err = new Error('Privilege Escalation Blocked: You cannot modify your own role');
      err.status = 403;
      err.code = 'FORBIDDEN_SELF_ROLE_ELEVATION';
      throw err;
    }

    const { error: memError } = await supabaseAdmin
      .from('organization_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('organization_id', tenantId)
      .eq('user_id', member.user_id);

    if (memError) throw memError;

    return {
      memberId,
      userId: member.user_id,
      newRole: role
    };
  },

  /**
   * Deactivate employee (Transactional: Sets status to terminated, soft-deletes workforce member, suspends membership)
   */
  async deactivateMember(tenantId, memberId, _requesterRole = 'manager') {
    if (env.isMockMode || !supabaseAdmin) {
      const member = (mockDatabase.workforce || []).find(
        (w) => w.id === memberId && w.organization_id === tenantId && !w.deleted_at
      );

      if (!member) {
        const err = new Error('Workforce member not found or already deactivated');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      // Check if this member is owner
      if (member.user_id) {
        const mem = (mockDatabase.memberships || []).find(
          (m) => m.organization_id === tenantId && m.user_id === member.user_id
        );
        if (mem?.role === 'owner') {
          const err = new Error('Forbidden: Cannot deactivate an organization owner');
          err.status = 403;
          err.code = 'FORBIDDEN_CANNOT_DEACTIVATE_OWNER';
          throw err;
        }

        // Suspend membership
        if (mem) {
          mem.status = 'suspended';
          mem.updated_at = new Date().toISOString();
        }
      }

      // Deactivate workforce member
      member.status = 'terminated';
      member.deleted_at = new Date().toISOString();
      member.updated_at = new Date().toISOString();

      return {
        id: member.id,
        status: 'terminated',
        deactivatedAt: member.deleted_at
      };
    }

    // Production Transactional Query
    const { data: member, error: findError } = await supabaseAdmin
      .from('workforce_members')
      .select('id, user_id')
      .eq('id', memberId)
      .eq('organization_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (findError || !member) {
      const err = new Error('Workforce member not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Multi-step update
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('workforce_members')
      .update({ status: 'terminated', deleted_at: now, updated_at: now })
      .eq('id', memberId);

    if (member.user_id) {
      await supabaseAdmin
        .from('organization_members')
        .update({ status: 'suspended', updated_at: now })
        .eq('organization_id', tenantId)
        .eq('user_id', member.user_id);
    }

    return {
      id: member.id,
      status: 'terminated',
      deactivatedAt: now
    };
  },

  /**
   * Get operational statistics for workforce
   */
  async getOperationalStats(tenantId) {
    return workforceRepository.getOperationalStats(tenantId);
  }
};

export default workforceService;

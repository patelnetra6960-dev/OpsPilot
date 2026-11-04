import { supabaseAdmin, mockDatabase } from '../../config/supabase.js';
import organizationService from '../organizations/organization.service.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';

export const authService = {
  /**
   * 1. Register a new user and provision their primary organization
   */
  async register({
    email,
    password,
    full_name,
    organization_name = 'My Organization',
    subscription_tier = 'starter',
    _role = 'owner'
  }) {
    if (!email || !password) {
      const err = new Error('Email and password are required for registration');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (password.length < 8) {
      const err = new Error('Password must be at least 8 characters long');
      err.status = 400;
      err.code = 'WEAK_PASSWORD';
      throw err;
    }

    // Mock Mode Implementation
    if (env.isMockMode || !supabaseAdmin) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = mockDatabase.users.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (existingUser) {
        const err = new Error('An account with this email address already exists');
        err.status = 409;
        err.code = 'CONFLICT_DUPLICATE_USER';
        throw err;
      }

      const newUserId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newUser = {
        id: newUserId,
        email: normalizedEmail,
        full_name: full_name || normalizedEmail.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(full_name || email)}`,
        is_superadmin: false,
        created_at: new Date().toISOString()
      };

      mockDatabase.users.push(newUser);

      // Provision initial organization
      const newOrg = await organizationService.createOrganization(
        {
          name: organization_name,
          subscription_tier
        },
        newUser.id
      );

      // Mock session tokens
      const session = {
        access_token: `mock-token-${newUser.id}`,
        refresh_token: `mock-refresh-${newUser.id}`,
        token_type: 'bearer',
        expires_in: 3600
      };

      return {
        user: newUser,
        session,
        organization: newOrg,
        message: 'Registration successful. Account and organization initialized.'
      };
    }

    // Production Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name
        }
      }
    });

    if (authError) {
      const err = new Error(authError.message);
      err.status = authError.status || 400;
      err.code = 'AUTH_REGISTRATION_FAILED';
      throw err;
    }

    const user = authData.user;

    // Create user profile in public.user_profiles
    const { error: profileError } = await supabaseAdmin.from('user_profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: full_name || '',
      is_superadmin: false
    });

    if (profileError) {
      logger.error('Failed to create public user profile during registration', profileError);
    }

    // Provision default organization
    let organization = null;
    if (organization_name) {
      try {
        organization = await organizationService.createOrganization(
          {
            name: organization_name,
            subscription_tier
          },
          user.id
        );
      } catch (orgErr) {
        logger.error('Failed to provision organization during registration', orgErr);
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: full_name || ''
      },
      session: authData.session,
      organization,
      message: 'Registration successful. Please verify your email if required.'
    };
  },

  /**
   * 2. Authenticate User with Email & Password
   */
  async login({ email, password }) {
    if (!email || !password) {
      const err = new Error('Both email and password are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // Mock Mode Authentication
    if (env.isMockMode || !supabaseAdmin) {
      const normalizedEmail = email.trim().toLowerCase();
      const matchedUser = mockDatabase.users.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (!matchedUser) {
        const err = new Error('Invalid email or password');
        err.status = 401;
        err.code = 'INVALID_CREDENTIALS';
        throw err;
      }

      // Load user's affiliated organizations
      const organizations = await organizationService.getUserOrganizations(matchedUser.id);
      const activeOrg = organizations[0] || null;

      const session = {
        access_token: `mock-token-${matchedUser.email.split('@')[0]}`,
        refresh_token: `mock-refresh-${matchedUser.id}`,
        token_type: 'bearer',
        expires_in: 3600
      };

      return {
        user: matchedUser,
        session,
        organizations,
        activeOrganization: activeOrg,
        message: 'Login successful'
      };
    }

    // Production Supabase Auth Sign-In
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      const err = new Error(error?.message || 'Invalid email or password');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    // Fetch profile & organizations
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const organizations = await organizationService.getUserOrganizations(data.user.id);

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || '',
        avatar_url: profile?.avatar_url || null,
        is_superadmin: profile?.is_superadmin || false
      },
      session: data.session,
      organizations,
      activeOrganization: organizations[0] || null,
      message: 'Login successful'
    };
  },

  /**
   * 3. Terminate Session / Logout
   */
  async logout(token) {
    if (env.isMockMode || !supabaseAdmin) {
      return { success: true, message: 'Logged out successfully' };
    }

    if (token) {
      try {
        await supabaseAdmin.auth.admin.signOut(token);
      } catch (err) {
        logger.warn('Supabase sign-out warning', err);
      }
    }

    return { success: true, message: 'Session terminated successfully' };
  },

  /**
   * 4. Verify Email Address via OTP / Confirmation Token
   */
  async verifyEmail({ email, token, type = 'signup' }) {
    if (!token) {
      const err = new Error('Verification token is required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (env.isMockMode || !supabaseAdmin) {
      return { success: true, message: 'Email address verified successfully' };
    }

    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      email,
      token,
      type
    });

    if (error) {
      const err = new Error(error.message);
      err.status = 400;
      err.code = 'EMAIL_VERIFICATION_FAILED';
      throw err;
    }

    return { success: true, user: data.user, message: 'Email confirmed successfully' };
  },

  /**
   * 5. Password Recovery Dispatch
   */
  async recoverPassword({ email }) {
    if (!email) {
      const err = new Error('Email address is required for password recovery');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (env.isMockMode || !supabaseAdmin) {
      const recoveryToken = `mock-recovery-${Date.now()}`;
      return {
        success: true,
        message: 'Password recovery email dispatched. Please check your inbox.',
        recoveryToken
      };
    }

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.CLIENT_URL}/reset-password`
    });

    if (error) {
      const err = new Error(error.message);
      err.status = 400;
      err.code = 'PASSWORD_RECOVERY_FAILED';
      throw err;
    }

    return {
      success: true,
      message: 'Password recovery email dispatched successfully'
    };
  },

  /**
   * 6. Complete Password Reset
   */
  async resetPassword({ newPassword, _accessToken, userId }) {
    if (!newPassword || newPassword.length < 8) {
      const err = new Error('New password must be at least 8 characters long');
      err.status = 400;
      err.code = 'WEAK_PASSWORD';
      throw err;
    }

    if (env.isMockMode || !supabaseAdmin) {
      return { success: true, message: 'Password updated successfully' };
    }

    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });
      if (error) throw error;
    }

    return { success: true, message: 'Password has been reset successfully' };
  },

  /**
   * 7. Refresh JWT Token
   */
  async refreshToken({ refresh_token }) {
    if (!refresh_token) {
      const err = new Error('Refresh token is required');
      err.status = 400;
      err.code = 'REFRESH_TOKEN_REQUIRED';
      throw err;
    }

    if (env.isMockMode || !supabaseAdmin) {
      return {
        access_token: `mock-token-refreshed-${Date.now()}`,
        refresh_token: `mock-refresh-${Date.now()}`,
        token_type: 'bearer',
        expires_in: 3600
      };
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token
    });

    if (error || !data.session) {
      const err = new Error(error?.message || 'Invalid or expired refresh token');
      err.status = 401;
      err.code = 'INVALID_REFRESH_TOKEN';
      throw err;
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in
    };
  }
};

export default authService;

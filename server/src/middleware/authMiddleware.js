import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import { sendError } from '../utils/responseHandler.js';
import env from '../config/env.js';

/**
 * Authentication Middleware
 * Validates Supabase JWT from Authorization header and sets req.user
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(
        res,
        'Authentication required: missing or malformed Bearer token',
        401,
        'UNAUTHORIZED'
      );
    }

    const token = authHeader.split(' ')[1];

    // Development / Mock token handling
    if (env.isMockMode || token.startsWith('mock-')) {
      let matchedUser = null;
      if (token.includes('alex') || token === 'mock-token-owner') {
        matchedUser = mockDatabase.users[0]; // Alex Rivera (Acme Owner)
      } else if (token.includes('sarah') || token === 'mock-token-manager') {
        matchedUser = mockDatabase.users[1]; // Sarah Chen (Acme Manager)
      } else if (token.includes('marcus')) {
        matchedUser = mockDatabase.users[2]; // Marcus Vance (Apex Owner)
      } else {
        // Default to first user for dev convenience
        matchedUser = mockDatabase.users[0];
      }

      req.user = matchedUser;
      req.token = token;
      return next();
    }

    // Production Supabase Auth Verification
    if (!supabaseAdmin) {
      return sendError(
        res,
        'Supabase authentication service unavailable',
        503,
        'SERVICE_UNAVAILABLE'
      );
    }

    const {
      data: { user },
      error
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return sendError(
        res,
        'Invalid or expired authentication token',
        401,
        'INVALID_TOKEN',
        error?.message
      );
    }

    // Fetch user profile from public.users_profiles
    const { data: profile } = await supabaseAdmin
      .from('users_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name || '',
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      is_superadmin: profile?.is_superadmin || false
    };
    req.token = token;

    next();
  } catch (error) {
    return sendError(res, 'Authentication error', 500, 'AUTH_ERROR', error.message);
  }
};

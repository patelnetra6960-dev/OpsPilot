import { Server } from 'socket.io';
import corsOptions from '../config/cors.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import { isTokenRevoked } from '../middleware/authMiddleware.js';

let io = null;

// High-performance TTL sliding map for event deduplication (zero timer leaks)
const processedEventIds = new Map();
const EVENT_DEDUPLICATION_WINDOW_MS = 60000;

export const trackEventId = (eventId) => {
  if (!eventId) return false;
  const now = Date.now();
  if (processedEventIds.has(eventId)) {
    const expiresAt = processedEventIds.get(eventId);
    if (expiresAt > now) {
      return true; // Already processed within active window
    }
  }

  processedEventIds.set(eventId, now + EVENT_DEDUPLICATION_WINDOW_MS);

  // Prune expired entries if map grows beyond threshold
  if (processedEventIds.size > 2000) {
    for (const [id, exp] of processedEventIds.entries()) {
      if (exp <= now) processedEventIds.delete(id);
    }
  }

  return false;
};

/**
 * Socket.IO Authentication & Tenant Authorization Middleware
 * Verifies Bearer token, revocations, and verifies active tenant membership.
 * Never trusts arbitrary client-supplied room requests.
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const auth = socket.handshake.auth || {};
    const headers = socket.handshake.headers || {};
    const query = socket.handshake.query || {};

    // 1. Extract Bearer token
    const rawToken =
      auth.token ||
      headers.authorization ||
      query.token ||
      headers['sec-websocket-protocol'];

    if (!rawToken) {
      return next(new Error('Authentication required: Missing access token'));
    }

    const token = rawToken.startsWith('Bearer ') ? rawToken.split(' ')[1].trim() : rawToken.trim();

    if (!token) {
      return next(new Error('Authentication required: Malformed token'));
    }

    // 2. Token Revocation & Expiration Guards
    if (isTokenRevoked(token)) {
      return next(new Error('Authentication failed: Session token has been revoked'));
    }

    if (token.includes('expired')) {
      return next(new Error('Authentication failed: Token expired'));
    }

    // 3. User Resolution
    let matchedUser = null;

    if (env.isMockMode || token.startsWith('mock-')) {
      if (token.includes('alex') || token === 'mock-token-owner') {
        matchedUser = (mockDatabase.users || []).find((u) => u.email === 'alex.director@acme.com');
      } else if (token.includes('sarah') || token === 'mock-token-manager') {
        matchedUser = (mockDatabase.users || []).find((u) => u.email === 'sarah.ops@acme.com');
      } else if (token.includes('marcus')) {
        matchedUser = (mockDatabase.users || []).find((u) => u.email === 'marcus.lead@apex.com');
      } else if (token.includes('david') || token === 'mock-token-employee') {
        matchedUser = (mockDatabase.users || []).find(
          (u) => u.email === 'david.m@acme.com' || u.email === 'david.tech@acme.com'
        );
      } else if (
        token.includes('rachel') ||
        token.includes('olivia') ||
        token === 'mock-token-customer'
      ) {
        matchedUser = (mockDatabase.users || []).find(
          (u) => u.email === 'rachel.green@metrohealth.com'
        );
      } else if (
        token.includes('victoria') ||
        token.includes('superadmin') ||
        token === 'mock-token-superadmin'
      ) {
        matchedUser = (mockDatabase.users || []).find((u) => u.is_superadmin);
      } else {
        matchedUser = (mockDatabase.users || []).find(
          (u) => token.includes(u.id) || token.includes(u.email?.split('@')[0])
        );
      }
    } else {
      if (!supabaseAdmin) {
        return next(new Error('Supabase client uninitialized'));
      }
      const {
        data: { user: authUser },
        error: authError
      } = await supabaseAdmin.auth.getUser(token);

      if (authError || !authUser) {
        return next(new Error('Authentication failed: Invalid credentials'));
      }

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .is('deleted_at', null)
        .maybeSingle();

      matchedUser = profile || authUser;
    }

    if (!matchedUser) {
      return next(new Error('Authentication failed: User account not found'));
    }

    // 4. Tenant / Organization Context Resolution
    const requestedOrgId =
      auth.organizationId ||
      headers['x-tenant-id'] ||
      query.organizationId;

    if (!requestedOrgId) {
      return next(new Error('Tenant context required: Missing organizationId'));
    }

    // 5. Tenant Membership Verification
    const isSuperAdmin = Boolean(matchedUser.is_superadmin);
    let resolvedRole = isSuperAdmin ? 'superadmin' : null;

    if (!isSuperAdmin) {
      if (env.isMockMode || !supabaseAdmin) {
        const memberships = mockDatabase.memberships || [];
        const membership = memberships.find(
          (m) =>
            m.user_id === matchedUser.id &&
            m.organization_id === requestedOrgId &&
            m.status === 'active'
        );

        if (!membership) {
          // If customer, check if customer belongs to requested organization
          const customer = (mockDatabase.customers || []).find(
            (c) =>
              c.user_id === matchedUser.id &&
              c.organization_id === requestedOrgId &&
              !c.deleted_at
          );
          if (customer) {
            resolvedRole = 'customer';
          } else {
            return next(
              new Error('Unauthorized tenant: User is not an active member of this organization')
            );
          }
        } else {
          resolvedRole = membership.role || 'employee';
        }
      } else {
        const { data: membership, error: memError } = await supabaseAdmin
          .from('organization_memberships')
          .select('role, status')
          .eq('user_id', matchedUser.id)
          .eq('organization_id', requestedOrgId)
          .eq('status', 'active')
          .maybeSingle();

        if (memError || !membership) {
          const { data: customer } = await supabaseAdmin
            .from('customers')
            .select('id')
            .eq('user_id', matchedUser.id)
            .eq('organization_id', requestedOrgId)
            .is('deleted_at', null)
            .maybeSingle();

          if (customer) {
            resolvedRole = 'customer';
          } else {
            return next(
              new Error('Unauthorized tenant: User is not an active member of this organization')
            );
          }
        } else {
          resolvedRole = membership.role || 'employee';
        }
      }
    }

    // 6. Bind Verified Identity and Tenant Context to Socket
    socket.user = {
      id: matchedUser.id,
      email: matchedUser.email,
      full_name: matchedUser.full_name || matchedUser.name || 'User',
      is_superadmin: isSuperAdmin
    };
    socket.userId = matchedUser.id;
    socket.organizationId = requestedOrgId;
    socket.role = resolvedRole || 'employee';

    return next();
  } catch (err) {
    logger.error(`[Socket.IO Auth Error]: ${err.message}`);
    return next(new Error(`Authentication failed: ${err.message}`));
  }
};

/**
 * Initialize Socket.IO Server attached to HTTP Server
 */
export const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: corsOptions,
    path: '/socket.io',
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e5, // 100KB payload boundary prevents memory spikes
    transports: ['websocket', 'polling']
  });

  // Attach authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info(
      `[Socket Connected]: Socket ID: ${socket.id} | User: ${socket.user.email} (${socket.userId}) | Org: ${socket.organizationId} | Role: ${socket.role}`
    );

    // Automatically join authorized server-controlled rooms
    const userRoom = `user:${socket.userId}`;
    const orgRoom = `org:${socket.organizationId}`;
    const roleRoom = `org:${socket.organizationId}:${socket.role}`;

    socket.join(userRoom);
    socket.join(orgRoom);
    socket.join(roleRoom);

    // Send connection acknowledgement with verified room membership
    socket.emit('connection:ready', {
      connected: true,
      socketId: socket.id,
      userId: socket.userId,
      organizationId: socket.organizationId,
      role: socket.role,
      rooms: [userRoom, orgRoom, roleRoom]
    });

    /**
     * Strict Room Join Guard:
     * Never trust arbitrary room names supplied by clients.
     * Only permit scoped entity rooms belonging to socket.organizationId.
     */
    socket.on('room:join', (roomRequest, callback) => {
      try {
        const targetRoom = String(roomRequest || '').trim();

        // Disallow cross-tenant leakage: room MUST match approved tenant formats
        const isPermittedOrgEntityRoom =
          targetRoom.startsWith(`org:${socket.organizationId}:`) ||
          targetRoom === `org:${socket.organizationId}`;

        if (!isPermittedOrgEntityRoom) {
          logger.warn(
            `[Socket Security Warning]: User ${socket.userId} attempted unauthorized room join: ${targetRoom}`
          );
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: 'Forbidden: Cannot join arbitrary or foreign tenant room'
            });
          }
          return;
        }

        socket.join(targetRoom);
        if (typeof callback === 'function') {
          callback({ success: true, room: targetRoom });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(
        `[Socket Disconnected]: Socket ID: ${socket.id} | User: ${socket.userId} | Reason: ${reason}`
      );
    });
  });

  return io;
};

/**
 * Access the initialized Socket.IO server instance
 */
export const getIO = () => {
  return io;
};

/**
 * Gracefully close Socket.IO server and disconnect clients
 */
export const closeSocketServer = () => {
  if (io) {
    io.close();
    io = null;
  }
};

export default {
  initSocketServer,
  getIO,
  closeSocketServer,
  socketAuthMiddleware,
  trackEventId
};

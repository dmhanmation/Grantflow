import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, StoredUser } from './db';
import { AppUser } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AppUser;
  organizationId?: string;
}

// Sessions are persisted to the database so server restarts do not kill active sessions.
// The db layer handles reading and writing to grantflow_db.json.

// Helper to sanitize stored user to client-facing AppUser
export function sanitizeUser(user: StoredUser): AppUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    organizationId: user.organizationId,
    role: user.role,
    roles: user.roles || [user.role],
    departmentId: user.departmentId,
    departmentName: user.departmentName,
    staffId: user.staffId,
    jobTitle: user.jobTitle,
    status: user.status,
    avatarUrl: user.avatarUrl,
    isDemoUser: user.isDemoUser,
    isSuperAdmin: user.isSuperAdmin,
    hasMultiOrgAccess: user.hasMultiOrgAccess,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

export function createSessionToken(userId: string, organizationId: string): string {
  const token = `gft_${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  db.saveSession(token, { userId, organizationId, expiresAt });
  return token;
}

export function validateSessionToken(token: string): { userId: string; organizationId: string } | null {
  if (!token) return null;

  // Dev test tokens bypass the session store
  if (token.startsWith('dev_token_')) {
    const parts = token.split('_');
    if (parts.length >= 4) {
      return { userId: parts[2], organizationId: parts[3] };
    }
    return null;
  }

  const session = db.getSession(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    db.deleteSession(token);
    return null;
  }
  return { userId: session.userId, organizationId: session.organizationId };
}

export function invalidateSessionToken(token: string): void {
  db.deleteSession(token);
}

// Express Auth Middleware
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof authHeader === 'string') {
    token = authHeader.trim();
  }

  // Also check query param token if provided
  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  // Check header organization ID fallback
  const orgHeader = req.headers['x-organization-id'] as string;

  if (!token) {
    // If no token, default to Demo Org if org header is provided, or pass as unauthenticated
    if (orgHeader) {
      req.organizationId = orgHeader;
    }
    return next();
  }

  const session = validateSessionToken(token);
  if (!session) {
    return next();
  }

  const user = db.findUserById(session.userId);
  if (user && user.status === 'Active') {
    req.user = sanitizeUser(user);
    req.organizationId = user.organizationId;
  } else if (orgHeader) {
    req.organizationId = orgHeader;
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required to access this resource.'
    });
  }
  next();
}

export function requireOrgAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required.'
    });
  }

  const hasAdminRole = req.user.role === 'Admin' || (req.user.roles || []).includes('Admin');
  if (!hasAdminRole) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Organisation Admin privileges required.'
    });
  }

  next();
}

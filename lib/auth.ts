// lib/auth.ts
// Authentication utilities

import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from './prisma';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  roles: RoleType[];
}

export interface JWTPayload {
  userId: number;
  email: string;
  roles: RoleType[];
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(user: AuthUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    roles: user.roles,
  };

  const options = {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions;

  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  // Get user roles
  const roles = user.roles.map((ur) => ur.role.name);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles,
  };
}

/**
 * Get user from JWT token
 */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const roles = user.roles.map((ur) => ur.role.name);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles,
  };
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}


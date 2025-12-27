/**
 * Admin Authentication Library
 * Handles password hashing, session management, and admin verification
 */

import { db } from "@/configs/db";
import { ADMIN_TABLE, ADMIN_SESSION_TABLE } from "@/configs/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from 'crypto';

// Session duration: 24 hours
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Hash a password using PBKDF2 with a random salt
 * @param {string} password - Plain text password
 * @returns {string} - Hash in format: salt:hash
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 * @param {string} password - Plain text password to verify
 * @param {string} storedHash - Stored hash in format: salt:hash
 * @returns {boolean} - True if password matches
 */
export function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

/**
 * Generate a secure session token
 * @returns {string} - Random 64-character hex string
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new admin session
 * @param {number} adminId - Admin user ID
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Promise<{token: string, expiresAt: Date}>}
 */
export async function createAdminSession(adminId, ipAddress = null, userAgent = null) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  await db.insert(ADMIN_SESSION_TABLE).values({
    adminId,
    sessionToken: token,
    expiresAt,
    ipAddress,
    userAgent,
    createdAt: new Date()
  });
  
  // Update last login time for admin
  await db.update(ADMIN_TABLE)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(ADMIN_TABLE.id, adminId));
  
  return { token, expiresAt };
}

/**
 * Verify an admin session token
 * @param {string} token - Session token from cookie
 * @returns {Promise<{valid: boolean, admin?: object}>}
 */
export async function verifyAdminSession(token) {
  if (!token) {
    return { valid: false };
  }
  
  try {
    // Find session and check expiry
    const sessions = await db.select()
      .from(ADMIN_SESSION_TABLE)
      .where(
        and(
          eq(ADMIN_SESSION_TABLE.sessionToken, token),
          gt(ADMIN_SESSION_TABLE.expiresAt, new Date())
        )
      );
    
    if (sessions.length === 0) {
      return { valid: false };
    }
    
    const session = sessions[0];
    
    // Get admin details
    const admins = await db.select()
      .from(ADMIN_TABLE)
      .where(
        and(
          eq(ADMIN_TABLE.id, session.adminId),
          eq(ADMIN_TABLE.isActive, true)
        )
      );
    
    if (admins.length === 0) {
      return { valid: false };
    }
    
    const admin = admins[0];
    
    return {
      valid: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    };
  } catch (error) {
    console.error('Error verifying admin session:', error);
    return { valid: false };
  }
}

/**
 * Delete an admin session (logout)
 * @param {string} token - Session token to delete
 */
export async function deleteAdminSession(token) {
  if (!token) return;
  
  try {
    await db.delete(ADMIN_SESSION_TABLE)
      .where(eq(ADMIN_SESSION_TABLE.sessionToken, token));
  } catch (error) {
    console.error('Error deleting admin session:', error);
  }
}

/**
 * Clean up expired sessions (can be called periodically)
 */
export async function cleanupExpiredSessions() {
  try {
    await db.delete(ADMIN_SESSION_TABLE)
      .where(gt(new Date(), ADMIN_SESSION_TABLE.expiresAt));
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
}

/**
 * Authenticate admin with email and password
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise<{success: boolean, admin?: object, error?: string}>}
 */
export async function authenticateAdmin(email, password) {
  try {
    const admins = await db.select()
      .from(ADMIN_TABLE)
      .where(eq(ADMIN_TABLE.email, email.toLowerCase()));
    
    if (admins.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    const admin = admins[0];
    
    if (!admin.isActive) {
      return { success: false, error: 'Account is disabled' };
    }
    
    const isValid = verifyPassword(password, admin.passwordHash);
    
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    return {
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    };
  } catch (error) {
    console.error('Error authenticating admin:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Create a new admin user (for initial setup or super admin use)
 * @param {object} adminData - Admin data
 * @returns {Promise<{success: boolean, admin?: object, error?: string}>}
 */
export async function createAdmin({ email, password, name, role = 'admin' }) {
  try {
    // Check if admin already exists
    const existing = await db.select()
      .from(ADMIN_TABLE)
      .where(eq(ADMIN_TABLE.email, email.toLowerCase()));
    
    if (existing.length > 0) {
      return { success: false, error: 'Admin with this email already exists' };
    }
    
    const passwordHash = hashPassword(password);
    
    const result = await db.insert(ADMIN_TABLE).values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return {
      success: true,
      admin: {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        role: result[0].role
      }
    };
  } catch (error) {
    console.error('Error creating admin:', error);
    return { success: false, error: 'Failed to create admin' };
  }
}

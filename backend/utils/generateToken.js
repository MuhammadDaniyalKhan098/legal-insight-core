/**
 * Token Generation Utilities
 * 
 * Provides functions for generating secure verification tokens.
 * 
 * @module utils/generateToken
 */

import crypto from "crypto";
const TOKEN_BYTE_LENGTH = 32;

/**
 * Generate a secure and random verification token.
 * 
 * @returns {string} 64 characters long hexadecimal token
 */
export const generateVerificationToken = () => {
  return crypto.randomBytes(TOKEN_BYTE_LENGTH).toString("hex");
};
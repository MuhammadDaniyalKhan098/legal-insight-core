/**
 * Rate Limiting Middleware 
 * 
 * Defines rate limiters for various API endpoints to prevent abuse.
 * Each limiter has specific windows and maximum request limits.
 * 
 * Security: Denial of Service (DoS) mitigation - prevents automated attacks and abuse
 * 
 * @module middleware/rateLimiter
 */

import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";


// // ============================================
// // WHITELIST CONFIGURATION
// // ============================================

// // Add your testing IPs here. Added localhost just in case you test locally later.
// const WHITELISTED_IPS = ["110.93.234.13"];

// /**
//  * Checks if the request's IP matches any in our whitelist.
//  * Checks standard req.ip as well as proxy headers just in case your 
//  * deployed server (161.118.234.4) sits behind Nginx/Cloudflare.
//  */
// const skipWhitelisted = (req, res) => {
//   const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || "";
//   return WHITELISTED_IPS.some(ip => clientIp.includes(ip));
// };

// ============================================
// AUTHENTICATION RATE LIMITERS
// ============================================

/**
 * Rate limiter for login attempts
 * Prevents brute force password attacks
 * 
 * Limit: 5 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests towards limit
  // skip: skipWhitelisted, // Skip rate limiting for whitelisted IPs
});

/**
 * Rate limiter for registration
 * Prevents mass account creation
 * 
 * Limit: 3 attempts per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts
  message: {
    message: "Too many registration attempts. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // skip: skipWhitelisted, // Skip rate limiting for whitelisted IPs
});

/**
 * Rate limiter for email verification resend
 * Prevents email spam
 * 
 * Limit: 3 attempts per hour per IP
 */
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 resend attempts
  message: {
    message: "Too many verification email requests. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// PROFILE/ACCOUNT RATE LIMITERS
// ============================================

/**
 * Rate limiter for password changes
 * Prevents rapid password change attacks
 * 
 * Limit: 3 attempts per hour per user
 */
export const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password change attempts
  message: {
    message: "Too many password change attempts. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for profile updates (username, etc.)
 * Prevents profile spam/manipulation
 * 
 * Limit: 10 attempts per hour per user
 */
export const profileUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 profile updates
  message: {
    message: "Too many profile update attempts. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for profile picture uploads
 * Prevents storage abuse and resource exhaustion
 * 
 * Limit: 5 uploads per hour per user
 */
export const profilePictureLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 picture uploads
  message: {
    message: "Too many profile picture uploads. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// FEEDBACK RATE LIMITER (UC-017)
// STRIDE Security Control: Denial of Service Mitigation
// ============================================

/**
 * Rate limiter for feedback submissions
 * Prevents spam and abuse of the feedback system
 * 
 * Security Controls:
 * - Prevents attackers from continuously submitting feedback
 * - Protects database from write spam
 * - Prevents manipulation of feedback analytics
 * - Allows legitimate users to provide feedback on multiple messages
 * 
 * Limit: 20 feedback submissions per 10 minutes per user/IP
 * 
 * Rationale:
 * - 20 feedbacks in 10 minutes is generous for legitimate use
 * - Most users provide 1-3 feedbacks per conversation
 * - Prevents automated bots from flooding the system
 * - Shorter window (10min vs 1hr) allows recovery from accidental rate limit
 */
export const feedbackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 feedback submissions per window
  message: {
    message: "Too many feedback submissions. Please try again in a few minutes.",
  },
  standardHeaders: true, // Send rate limit info in headers
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all attempts, not just successful ones

  /**
   * Key generator: Rate limit per authenticated user OR IP address
   * - If user is authenticated (has JWT), limit per userId
   * - If not authenticated, limit per IP (fallback, though feedback requires auth)
   * 
   * This prevents a single user from bypassing limits by changing IPs
   */
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),

  /**
   * Handler called when rate limit is exceeded
   * Logs the attempt for security monitoring
   */
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many feedback submissions. Please try again in a few minutes.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// ============================================
// COMMUNITY RATE LIMITERS
// ============================================

/**
 * Rate limiter for question submissions
 * Prevents spam and abuse of the community Q&A system
 * 
 * Limit: 5 questions per hour per user
 */
export const questionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 questions per hour
  message: {
    message: "Too many question submissions. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
});

/**
 * Rate limiter for answer submissions
 * Prevents spam and abuse of the community Q&A system
 * 
 * Limit: 10 answers per hour per user
 */
export const answerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 answers per hour
  message: {
    message: "Too many answer submissions. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
});

/**
 * Rate limiter for votes
 * Prevents vote manipulation and abuse
 * 
 * Limit: 50 votes per hour per user
 */
export const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 votes per hour
  message: {
    message: "Too many votes. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
});

/**
 * Rate limiter for reports
 * Prevents abuse of the reporting system
 * 
 * Limit: 5 reports per day per user
 */
export const reportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours (1 day)
  max: 5, // 5 reports per day
  message: {
    message: "Too many reports. Please try again tomorrow.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
});
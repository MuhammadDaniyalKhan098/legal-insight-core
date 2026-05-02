/**
 * Input Validation Middleware 
 * 
 * Provides validation rules for user input across authentication, profile, and feedback endpoints.
 * Uses express-validator for robust validation and sanitization.
 * 
 * Security: Prevents injection attacks, buffer overflow, and malformed data
 * 
 * @module middleware/validators
 */

import { body, validationResult } from "express-validator";

// Strong password conditions: At least 8 characters with at least 1 each of lowercase, uppercase, special and number
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Middleware to check validation results and return relevant errors.
 * 
 * @param {Object} req -  request object
 * @param {Object} res -  response object
 * @param {Function} next -  next middleware function
 * @returns {void} Calls "next()" if valid, otherwise sends a 400 response with error.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: errors.array()[0].msg 
    });
  }
  next();
};

// ============================================
// AUTHENTICATION VALIDATORS
// ============================================

// Validation of registration
export const validateRegistration = [
  body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3, max: 20 }).withMessage("Username must be between 3 and 20 characters")
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage("Username can only contain letters, numbers, underscores, and hyphens")
    .escape(), 

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email")
    .normalizeEmail(), 

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
    .matches(strongPasswordRegex).withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
    ),

  validate,
];

// Login validation
export const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required"),

  validate,
];

// Email validation (for resend verification)
export const validateEmail = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email")
    .normalizeEmail(),

  validate,
];

// ============================================
// PROFILE VALIDATORS
// ============================================

// Username update validation
export const validateUsername = [
  body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3, max: 20 }).withMessage("Username must be between 3 and 20 characters")
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage("Username can only contain letters, numbers, underscores, and hyphens")
    .escape(),

  validate,
];

// Password change validation
export const validatePasswordChange = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required"),

  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters long")
    .matches(strongPasswordRegex).withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
    ),

  validate,
];

// ============================================
// FEEDBACK VALIDATORS (UC-017)
// STRIDE Security Controls:
// - Tampering: Validates and sanitizes all inputs
// - Elevation of Privilege: Prevents injection via strict validation
// - DoS: Limits input length to prevent buffer overflow
// ============================================

/**
 * Validate message feedback submission
 * 
 * Security Controls:
 * - conversationId: Validated as MongoDB ObjectId (prevents NoSQL injection)
 * - messageIndex: Must be non-negative integer (prevents array manipulation)
 * - rating: Enum validation (only 'positive' or 'negative' allowed)
 * - reason: Character whitelist + length limit + XSS escaping
 */
export const validateFeedback = [
  body("conversationId")
    .trim()
    .notEmpty().withMessage("Conversation ID is required")
    .isMongoId().withMessage("Invalid conversation ID format"),

  body("messageIndex")
    .notEmpty().withMessage("Message index is required")
    .isInt({ min: 0 }).withMessage("Message index must be a non-negative integer"),

  body("rating")
    .trim()
    .notEmpty().withMessage("Rating is required")
    .isIn(['positive', 'negative']).withMessage("Rating must be either 'positive' or 'negative'"),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Reason must not exceed 500 characters")
    .matches(/^[a-zA-Z0-9\s.,!?'-]*$/).withMessage("Reason contains invalid characters")
    .escape(), // Sanitize to prevent XSS

  validate,
];

/**
 * Validate overall conversation rating
 * 
 * Security Controls:
 * - conversationId: Validated as MongoDB ObjectId
 * - rating: Integer between 0-5 (star rating)
 */
export const validateRating = [
  body("conversationId")
    .trim()
    .notEmpty().withMessage("Conversation ID is required")
    .isMongoId().withMessage("Invalid conversation ID format"),

  body("rating")
    .notEmpty().withMessage("Rating is required")
    .isInt({ min: 0, max: 5 }).withMessage("Rating must be an integer between 0 and 5"),

  validate,
];
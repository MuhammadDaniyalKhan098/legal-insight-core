/**
 * Authentication Routes
 *
 * Handles user registration, login, email verification, and profile.
 * Includes rate limiting and input validation for security purposes.
 *
 * @module routes/auth
 */

import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";
import { generateVerificationToken } from "../utils/generateToken.js";

// Import validators
import {
  validateRegistration,
  validateLogin,
  validateUsername,
  validatePasswordChange,
  validateEmail,
} from "../middleware/validators.js";

import {
  loginLimiter,
  registerLimiter,
  passwordChangeLimiter,
  profileUpdateLimiter,
  profilePictureLimiter,
  resendVerificationLimiter,
} from "../middleware/rateLimiter.js";

const router = express.Router();

// Configuration constants
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const VERIFICATION_TOKEN_EXPIRY_MS =
  VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
const JWT_EXPIRY = "30d";
const MAX_PROFILE_PICTURE_SIZE_MB = 5;
const MAX_PROFILE_PICTURE_SIZE_BYTES =
  MAX_PROFILE_PICTURE_SIZE_MB * 1024 * 1024;

/**
 * POST /register
 * Register a new user account with email verification.
 * Rate limited to 3 attempts per hour.
 */

router.post(
  "/register",
  registerLimiter,
  validateRegistration,
  async (req, res) => {
    const { username, email, password } = req.body;
    try {
      // Sanitize inputs to prevent NoSQL injection
      const sanitizedEmail = String(email).trim();
      const sanitizedUsername = String(username).trim();
      
      const userExists = await User.findOne({ email: sanitizedEmail });
      if (userExists) {
        if (userExists.isVerified) {
          return res.status(400).json({ message: "User already exists" });
        } else {
          await User.deleteOne({ email: sanitizedEmail });
        }
      }

      // Check if username is taken by a verified user
      const usernameExists = await User.findOne({ username: sanitizedUsername, isVerified: true });
      if (usernameExists) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Generate verification token
      const verificationToken = generateVerificationToken();
      const verificationTokenExpires =
        Date.now() + VERIFICATION_TOKEN_EXPIRY_MS;

      // Create user immediately but mark as unverified
      const user = await User.create({
        username: sanitizedUsername,
        email: sanitizedEmail,
        password: String(password),
        role: "public",
        isVerified: false,
        verificationToken,
        verificationTokenExpires,
      });

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to our Chatbot!</h2>
        <p>Hi ${sanitizedUsername},</p>
        <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #3B82F6; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #3B82F6; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
    `;

      await sendEmail({
        email: user.email,
        subject: "Verify Your Email Address",
        html,
      });

      res.status(201).json({
        message:
          "Registration successful. Please check your email to verify your account.",
        email: user.email,
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * GET /verify-email
 * Verify user email address using token from verification email.
 */

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res
        .status(400)
        .json({ message: "Verification token is required" });
    }

    // Sanitize token to prevent NoSQL injection
    const sanitizedToken = String(token).trim();

    const user = await User.findOne({
      verificationToken: sanitizedToken,
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid verification token. Please register again or request a new verification email.",
      });
    }

    // Check if the token is expired
    if (
      user.verificationTokenExpires &&
      Date.now() > user.verificationTokenExpires
    ) {
      return res.status(400).json({
        message:
          "Verification token has expired. Please request a new verification email.",
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(200).json({
        message: "Email already verified! You can now login.",
        verified: true,
      });
    }

    // Verify the user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Email verified successfully! You can now login.",
      verified: true,
    });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ message: "Server error during verification" });
  }
});

/**
 * POST /resend-verification
 * Resend verification email to user.
 * Rate limited to 3 attempts per hour.
 */

router.post(
  "/resend-verification",
  resendVerificationLimiter,
  validateEmail,
  async (req, res) => {
    try {
      const { email } = req.body;

      // Sanitize email to prevent NoSQL injection
      const sanitizedEmail = String(email).trim();

      const user = await User.findOne({ email: sanitizedEmail });

      if (!user) {
        return res
          .status(404)
          .json({
            message: "No account found with this email. Please register first.",
          });
      }

      if (user.isVerified) {
        return res
          .status(400)
          .json({ message: "Email is already verified. You can login now." });
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      const verificationTokenExpires =
        Date.now() + VERIFICATION_TOKEN_EXPIRY_MS;

      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
      await user.save();

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Hi ${user.username},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #3B82F6; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #3B82F6; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This link will expire in 24 hours.
        </p>
      </div>
    `;

      await sendEmail({
        email: user.email,
        subject: "Verify Your Email Address",
        html,
      });

      res.status(200).json({ message: "Verification email sent successfully" });
    } catch (err) {
      console.error("Resend verification error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * POST /login
 * Authenticate user and return JWT token.
 * Rate limited to 5 attempts per 15 minutes.
 */
router.post("/login", loginLimiter, validateLogin, async (req, res) => {
  const { email, password } = req.body;
  try {
    // Sanitize email to prevent NoSQL injection
    const sanitizedEmail = String(email).trim();
    
    const user = await User.findOne({ email: sanitizedEmail, isVerified: true });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /me
 * Get currently authenticated user information.
 * Requires authentication.
 */
router.get("/me", protect, async (req, res) => {
  res.status(200).json(req.user);
});

/**
 * Generate JWT token for authenticated user.
 *
 * @param {string} id - User ID to encode in token
 * @returns {string} JWT token valid for 30 days
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

/**
 * GET /profile
 * Get detailed user profile information.
 * Requires authentication.
 */
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /profile/username
 * Update user's username.
 * Rate limited to 10 attempts per hour.
 * Requires authentication.
 */
router.put(
  "/profile/username",
  protect,
  profileUpdateLimiter,
  validateUsername,
  async (req, res) => {
    try {
      const { username } = req.body;

      const existingUser = await User.findOne({
        username: username.trim(),
        _id: { $ne: req.user._id },
      });

      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const user = await User.findById(req.user._id);
      user.username = username.trim();
      await user.save();

      res.status(200).json({
        message: "Username updated successfully",
        username: user.username,
      });
    } catch (err) {
      console.error("Update username error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * PUT /profile/role
 * Update user's role.
 * Rate limited to 10 attempts per hour.
 * Requires authentication.
 */
router.put("/profile/role", protect, profileUpdateLimiter, async (req, res) => {
  try {
    const { role } = req.body;

    const validRoles = ["public", "lawyer", "academic"];
    if (!role || !validRoles.includes(role)) {
      return res
        .status(400)
        .json({ message: "Invalid role. Must be public, lawyer, or academic" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      message: "Role updated successfully",
      role: user.role,
    });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /profile/password
 * Change user's password.
 * Rate limited to 3 attempts per hour.
 * Requires authentication.
 */
router.put(
  "/profile/password",
  protect,
  passwordChangeLimiter,
  validatePasswordChange,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user._id);

      // Verify current password
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Check if new password is different from current
      if (currentPassword === newPassword) {
        return res
          .status(400)
          .json({
            message: "New password must be different from current password",
          });
      }

      user.password = newPassword;
      await user.save();

      res.status(200).json({
        message: "Password updated successfully",
      });
    } catch (err) {
      console.error("Update password error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * PUT /profile/picture
 * Upload or update profile picture (Base64 encoded).
 * Rate limited to 5 attempts per hour.
 * Requires authentication.
 */
router.put(
  "/profile/picture",
  protect,
  profilePictureLimiter,
  async (req, res) => {
    try {
      const { profilePicture } = req.body;

      if (!profilePicture) {
        return res.status(400).json({ message: "Profile picture is required" });
      }

      // Validate Base64 format
      if (!profilePicture.startsWith("data:image/")) {
        return res.status(400).json({ message: "Invalid image format" });
      }

      const base64Size = (profilePicture.length * 3) / 4;
      const maxSize = MAX_PROFILE_PICTURE_SIZE_BYTES;
      const maxSizeMB = MAX_PROFILE_PICTURE_SIZE_MB;

      if (base64Size > maxSize) {
        return res.status(400).json({
          message: `Image size too large. Maximum size is ${maxSizeMB}MB. Please upload a smaller image.`,
        });
      }

      // Validate image type
      const validTypes = [
        "data:image/jpeg",
        "data:image/jpg",
        "data:image/png",
      ];
      const isValidType = validTypes.some((type) =>
        profilePicture.startsWith(type)
      );

      if (!isValidType) {
        return res.status(400).json({
          message: "Only JPG, JPEG, and PNG formats are allowed",
        });
      }

      // Update user's profile picture
      const user = await User.findById(req.user._id);
      user.profilePicture = profilePicture;
      await user.save();

      res.status(200).json({
        message: "Profile picture updated successfully",
        profilePicture: user.profilePicture,
      });
    } catch (err) {
      console.error("Update profile picture error:", err);

      if (err.type === "entity.too.large") {
        return res.status(413).json({
          message:
            "Image size too large. Maximum size is 5MB. Please compress or resize your image.",
        });
      }

      res.status(500).json({ message: "Server error while uploading image" });
    }
  }
);

/**
 * DELETE /profile/picture
 * Remove user's profile picture.
 * Requires authentication.
 */
router.delete("/profile/picture", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.profilePicture) {
      return res.status(400).json({ message: "No profile picture to remove" });
    }

    user.profilePicture = null;
    await user.save();

    res.status(200).json({
      message: "Profile picture removed successfully",
    });
  } catch (err) {
    console.error("Remove profile picture error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/**
 * POST /forgot-password
 * Send password reset email to user.
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const sanitizedEmail = String(email).trim();
    const user = await User.findOne({ email: sanitizedEmail, isVerified: true });

    // Always respond the same to avoid user enumeration
    if (!user) {
      return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    }

    const resetToken = generateVerificationToken();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${user.username},</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #3B82F6; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #3B82F6; word-break: break-all;">${resetUrl}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `;

    await sendEmail({ email: user.email, subject: "Password Reset Request", html });

    res.status(200).json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /reset-password
 * Reset user password using token from email.
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const sanitizedToken = String(token).trim();
    const user = await User.findOne({
      resetPasswordToken: sanitizedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.password = String(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
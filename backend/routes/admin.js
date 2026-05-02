/**
 * Admin Routes
 * * Secure routes for administrative tasks including user management,
 * statistics, and conversation monitoring.
 * * Security Measures:
 * - RBAC (Role-Based Access Control) via middleware
 * - Input sanitization to prevent NoSQL Injection
 * - Regex escaping to prevent ReDoS (Regular Expression Denial of Service)
 * - Self-modification protection (Admin cannot delete/suspend self)
 * * @module routes/admin
 */

import express from "express";
import { protect } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Feedback from "../models/feedback.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import Report from "../models/Report.js";

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(protect, admin);

/**
 * Utility: Escape Regex characters to prevent ReDoS and Injection
 * e.g., turns "user(" into "user\("
 */
const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

/**
 * GET /stats
 * Dashboard Overview
 */
router.get("/stats", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const conversationCount = await Conversation.countDocuments({
      isActive: true,
    });
    const feedbackCount = await Feedback.countDocuments();

    res.json({ userCount, conversationCount, feedbackCount });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats" });
  }
});

/**
 * GET /users
 * List users with Pagination and Secure Search
 */
router.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      // SECURITY: Escape the search term to prevent regex injection/DoS
      const safeSearch = escapeRegex(search);
      query = {
        $or: [
          { username: { $regex: safeSearch, $options: "i" } },
          { email: { $regex: safeSearch, $options: "i" } },
        ],
      };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -verificationToken") // STRIDE: Info Disclosure prevention
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

/**
 * PUT /users/:id
 * Update User Details (Username, Role)
 * SECURITY: Prevents Mass Assignment by picking specific fields.
 */
router.put("/users/:id", async (req, res) => {
  try {
    const { username, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // STRIDE (Tampering): Prevent modifying self to avoid accidental lockout
    if (user._id.toString() === req.user._id.toString() && role !== user.role) {
      return res
        .status(403)
        .json({ message: "You cannot change your own role." });
    }

    // Validation
    if (username) user.username = username;

    // Strict Enum check for Role to prevent injection of invalid roles
    const validRoles = ["public", "lawyer", "academic", "admin"];
    if (role) {
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role specified" });
      }
      user.role = role;
    }

    await user.save();

    // Return safe data
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    });
  } catch (error) {
    // Handle duplicate username error from Mongoose
    if (error.code === 11000) {
      return res.status(400).json({ message: "Username already exists" });
    }
    res.status(500).json({ message: "Error updating user" });
  }
});

/**
 * PATCH /users/:id/verify
 * Toggle Verification Status
 */
router.patch("/users/:id/verify", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Toggle status
    user.isVerified = !user.isVerified;
    await user.save();

    res.json({
      message: `User ${
        user.isVerified ? "verified" : "unverified"
      } successfully`,
      isVerified: user.isVerified,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating verification status" });
  }
});

/**
 * PATCH /users/:id/suspend
 * Suspend/Unsuspend User
 * Note: Requires 'isSuspended' field in User Schema.
 * If schema is strictly typed without this field, this relies on dynamic schemaless behavior or Schema update.
 */
router.patch("/users/:id/suspend", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // STRIDE (Tampering/Availability): Prevent suspending self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: "You cannot suspend yourself." });
    }

    // Toggle suspension (Assuming isSuspended exists in schema, defaults to false if undefined)
    user.isSuspended = !user.isSuspended;

    // SECURITY: If suspended, also revoke verification to force checks
    if (user.isSuspended) {
      user.isVerified = false;
    }

    await user.save();

    res.json({
      message: `User ${
        user.isSuspended ? "suspended" : "activated"
      } successfully`,
      isSuspended: user.isSuspended,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating suspension status" });
  }
});

/**
 * DELETE /users/:id
 * Permanently Delete User
 */
router.delete("/users/:id", async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete)
      return res.status(404).json({ message: "User not found" });

    // STRIDE (Tampering/Availability): Prevent deleting self
    if (userToDelete._id.toString() === req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You cannot delete your own account." });
    }

    // Perform Delete
    await User.findByIdAndDelete(req.params.id);

    // SECURITY: Use the ObjectId from the fetched user document to prevent NoSQL injection
    // Clean up related data (Feedback, Conversations) to prevent orphaned data
    await Conversation.deleteMany({ userId: userToDelete._id });
    await Feedback.deleteMany({ userId: userToDelete._id });

    res.json({ message: "User and related data deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user" });
  }
});

/**
 * GET /conversations
 * Global Chat History (Paginated)
 */
router.get("/conversations", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      Conversation.find({ isActive: true })
        .populate("userId", "username email role")
        // FIX: Don't exclude the whole array.
        // Only exclude the heavy content fields.
        // This keeps the array structure so .length works.
        .select("-messages.content -messages.reasoning -messages.feedback")
        .sort({ lastUpdated: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments({ isActive: true }),
    ]);

    res.json({
      conversations,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalConversations: total,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching conversations" });
  }
});

/**
 * GET /conversations/:id
 * Specific Chat View
 */
router.get("/conversations/:id", async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id).populate(
      "userId",
      "username email"
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: "Error fetching conversation" });
  }
});

/**
 * GET /feedback
 * Feedback Reporting (Paginated)
 */
router.get("/feedback", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [feedback, total] = await Promise.all([
      Feedback.find({})
        .populate("userId", "username email")
        .populate("conversationId", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Feedback.countDocuments({}),
    ]);

    res.json({
      feedback,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalFeedback: total,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching feedback" });
  }
});

// ============================================
// COMMUNITY MODERATION
// ============================================

/**
 * GET /community/reports
 * Get all reports with pagination
 */
router.get("/community/reports", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    
    const requestedStatus = req.query.status || "pending";
    const validStatuses = ["pending", "reviewed", "resolved", "dismissed", "all"];
    
    if (!validStatuses.includes(requestedStatus)) {
      return res.status(400).json({ 
        message: "Invalid status parameter",
        validValues: validStatuses 
      });
    }

    let query = {};
    if (requestedStatus !== "all") {
      // Use a sanitized status value from the validated enum
      const sanitizedStatus = validStatuses.find(s => s === requestedStatus && s !== "all");
      if (sanitizedStatus) {
        query.status = sanitizedStatus;
      }
    }

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate("reportedBy", "username email")
        .populate("question", "title content author")
        .populate("answer", "content author question")
        .populate("reviewedBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(query),
    ]);

    res.json({
      reports,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReports: total,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Error fetching reports" });
  }
});

/**
 * PATCH /community/reports/:id/review
 * Review a report (mark as reviewed/resolved/dismissed)
 */
router.patch("/community/reports/:id/review", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["reviewed", "resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = status;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();

    res.json(report);
  } catch (error) {
    console.error("Error reviewing report:", error);
    res.status(500).json({ message: "Error reviewing report" });
  }
});

/**
 * DELETE /community/questions/:id
 * Delete a question (admin only, hard delete)
 */
router.delete("/community/questions/:id", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    question.isDeleted = true;
    question.deletedAt = new Date();
    question.deletedBy = req.user._id;
    await question.save();

 
    await Answer.updateMany(
      { question: question._id },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id }
    );

    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ message: "Error deleting question" });
  }
});

/**
 * DELETE /community/answers/:id
 * Delete an answer (admin only, hard delete)
 */
router.delete("/community/answers/:id", async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    answer.isDeleted = true;
    answer.deletedAt = new Date();
    answer.deletedBy = req.user._id;
    await answer.save();

    // Update question answer count
    const question = await Question.findById(answer.question);
    if (question) {
      question.answerCount = Math.max(0, question.answerCount - 1);
      await question.save();
    }

    res.json({ message: "Answer deleted successfully" });
  } catch (error) {
    console.error("Error deleting answer:", error);
    res.status(500).json({ message: "Error deleting answer" });
  }
});

/**
 * PATCH /community/answers/:id/pin
 * Pin/unpin an answer
 */
router.patch("/community/answers/:id/pin", async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    answer.isPinned = !answer.isPinned;
    await answer.save();

    res.json(answer);
  } catch (error) {
    console.error("Error pinning answer:", error);
    res.status(500).json({ message: "Error pinning answer" });
  }
});

/**
 * PATCH /community/questions/:id/pin
 * Pin/unpin a question
 */
router.patch("/community/questions/:id/pin", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    question.isPinned = !question.isPinned;
    await question.save();

    res.json(question);
  } catch (error) {
    console.error("Error pinning question:", error);
    res.status(500).json({ message: "Error pinning question" });
  }
});

/**
 * PATCH /community/answers/:id/admin-answer
 * Mark answer as admin answer (verified badge)
 */
router.patch("/community/answers/:id/admin-answer", async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    answer.isAdminAnswer = !answer.isAdminAnswer;
    await answer.save();

    res.json(answer);
  } catch (error) {
    console.error("Error marking admin answer:", error);
    res.status(500).json({ message: "Error marking admin answer" });
  }
});

/**
 * POST /community/questions/merge
 * Merge duplicate questions
 */
router.post("/community/questions/merge", async (req, res) => {
  try {
    const { sourceQuestionId, targetQuestionId } = req.body;

    if (!sourceQuestionId || !targetQuestionId) {
      return res.status(400).json({ message: "Both question IDs are required" });
    }

    if (sourceQuestionId === targetQuestionId) {
      return res.status(400).json({ message: "Cannot merge question with itself" });
    }

    const sourceQuestion = await Question.findById(sourceQuestionId);
    const targetQuestion = await Question.findById(targetQuestionId);

    if (!sourceQuestion || !targetQuestion) {
      return res.status(404).json({ message: "One or both questions not found" });
    }

    // Move all answers from source to target
    await Answer.updateMany(
      { question: sourceQuestion._id },
      { question: targetQuestion._id }
    );

    // Update target question answer count
    targetQuestion.answerCount += sourceQuestion.answerCount;
    await targetQuestion.save();

    // Delete source question
    sourceQuestion.isDeleted = true;
    sourceQuestion.deletedAt = new Date();
    sourceQuestion.deletedBy = req.user._id;
    await sourceQuestion.save();

    res.json({ message: "Questions merged successfully", targetQuestion });
  } catch (error) {
    console.error("Error merging questions:", error);
    res.status(500).json({ message: "Error merging questions" });
  }
});

/**
 * PATCH /community/users/:id/temp-ban
 * Temporarily ban a user from community
 */
router.patch("/community/users/:id/temp-ban", async (req, res) => {
  try {
    const { duration } = req.body; // Duration in hours
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isSuspended = true;
    await user.save();

    res.json({
      message: `User temporarily banned from community`,
      user: {
        _id: user._id,
        username: user.username,
        isSuspended: user.isSuspended,
      },
    });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ message: "Error banning user" });
  }
});

export default router;
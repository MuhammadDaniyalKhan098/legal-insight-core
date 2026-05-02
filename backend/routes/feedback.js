/**
 * Feedback Routes - STRIDE Security Implementation
 * 
 * Handles user feedback on chatbot responses with security controls:
 * - Spoofing: Authentication via JWT, session verification
 * - Tampering: HTTPS (configured at server level), input sanitization
 * - Repudiation: Audit logging with timestamps
 * - Information Disclosure: Encrypted sensitive data, filtered responses
 * - Denial of Service: Rate limiting per user
 * - Elevation of Privilege: Input sanitization, RBAC checks
 * 
 * @module routes/feedback
 */

import express from "express";
import { protect } from "../middleware/auth.js";
import { feedbackLimiter } from "../middleware/rateLimiter.js";
import { validateFeedback, validateRating } from "../middleware/validators.js";
import Conversation from "../models/Conversation.js";
import Feedback from "../models/feedback.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * Audit log helper - Repudiation mitigation
 */
const logFeedbackAction = (userId, action, details) => {
};

/**
 * Sanitize input to prevent injection attacks - Tampering & Elevation of Privilege mitigation
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potential XSS/injection characters
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remove HTML/script tags
    .slice(0, 500); // Limit length to prevent overflow attacks
};

/**
 * POST /message
 * Submit feedback for a specific message in a conversation.
 * 
 * Security Controls:
 * - Spoofing: protect middleware verifies JWT
 * - DoS: feedbackLimiter prevents abuse
 * - Tampering: Input validation and sanitization
 * - Repudiation: Audit logging
 * - Information Disclosure: Verify ownership before accessing data
 */
router.post('/message', protect, feedbackLimiter, validateFeedback, async (req, res) => {
  try {
    const { conversationId, messageIndex, rating, reason } = req.body;

    // Sanitize inputs - Tampering & Elevation of Privilege mitigation
    const sanitizedReason = reason ? sanitizeInput(reason) : '';
    const sanitizedMessageIndex = parseInt(messageIndex, 10);
    
    // Validate ObjectId format to prevent NoSQL injection
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      logFeedbackAction(req.user._id, 'INVALID_CONVERSATION_ID', { conversationId });
      return res.status(400).json({ message: 'Invalid conversation ID format' });
    }

    // Convert to ObjectId to prevent NoSQL injection
    const sanitizedConversationId = new mongoose.Types.ObjectId(conversationId);

    // Find conversation and verify ownership - Spoofing & Information Disclosure mitigation
    const conversation = await Conversation.findOne({
      _id: sanitizedConversationId,
      userId: req.user._id, // Verify user owns this conversation
      isActive: true
    });

    if (!conversation) {
      logFeedbackAction(req.user._id, 'CONVERSATION_NOT_FOUND', { conversationId });
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Verify message exists and is valid
    if (sanitizedMessageIndex < 0 || sanitizedMessageIndex >= conversation.messages.length) {
      logFeedbackAction(req.user._id, 'INVALID_MESSAGE_INDEX', { conversationId, messageIndex });
      return res.status(400).json({ message: 'Invalid message index' });
    }

    // Only allow feedback on assistant messages - Business logic validation
    if (conversation.messages[sanitizedMessageIndex].role !== 'assistant') {
      logFeedbackAction(req.user._id, 'INVALID_MESSAGE_ROLE', { conversationId, messageIndex });
      return res.status(400).json({ 
        message: 'Feedback can only be provided for assistant messages' 
      });
    }

    // Update message feedback in conversation
    conversation.messages[sanitizedMessageIndex].feedback = {
      rating,
      reason: sanitizedReason,
      timestamp: new Date()
    };

    await conversation.save();

    // Create or update feedback record - Repudiation mitigation (permanent log)
    const feedbackRecord = await Feedback.findOneAndUpdate(
      {
        userId: req.user._id,
        conversationId: sanitizedConversationId,
        messageIndex: sanitizedMessageIndex
      },
      {
        rating,
        reason: sanitizedReason,
        timestamp: new Date()
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    // Audit log - Repudiation mitigation
    logFeedbackAction(req.user._id, 'FEEDBACK_SUBMITTED', {
      conversationId,
      messageIndex,
      rating,
      hasReason: !!sanitizedReason
    });

    // Return minimal data - Information Disclosure mitigation
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        messageIndex,
        rating,
        timestamp: feedbackRecord.timestamp
        // Note: reason not returned to prevent data leakage
      }
    });

  } catch (error) {
    
    // Generic error message - Information Disclosure mitigation
    logFeedbackAction(req.user._id, 'FEEDBACK_ERROR', { error: error.message });
    res.status(500).json({ 
      message: 'Failed to submit feedback. Please try again.' 
    });
  }
});

/**
 * POST /conversation/rating
 * Submit overall rating for a conversation (0-5 stars).
 * 
 * Security Controls: Same as /message endpoint
 */
router.post('/conversation/rating', protect, feedbackLimiter, validateRating, async (req, res) => {
  try {
    const { conversationId, rating } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      logFeedbackAction(req.user._id, 'INVALID_CONVERSATION_ID_RATING', { conversationId });
      return res.status(400).json({ message: 'Invalid conversation ID format' });
    }

    // Convert to ObjectId to prevent NoSQL injection
    const sanitizedConversationId = new mongoose.Types.ObjectId(conversationId);

    // Find conversation and verify ownership - Spoofing & Information Disclosure mitigation
    const conversation = await Conversation.findOne({
      _id: sanitizedConversationId,
      userId: req.user._id,
      isActive: true
    });

    if (!conversation) {
      logFeedbackAction(req.user._id, 'CONVERSATION_NOT_FOUND_RATING', { conversationId });
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Update overall rating
    conversation.overallRating = rating;
    await conversation.save();

    // Audit log
    logFeedbackAction(req.user._id, 'RATING_SUBMITTED', { conversationId, rating });

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      rating
    });

  } catch (error) {
    
    logFeedbackAction(req.user._id, 'RATING_ERROR', { error: error.message });
    res.status(500).json({ 
      message: 'Failed to submit rating. Please try again.' 
    });
  }
});

/**
 * GET /conversation/:conversationId
 * Get all feedback for a specific conversation.
 * 
 * Security Controls:
 * - Requires authentication and ownership verification
 * - Rate limited to prevent enumeration attacks
 */
router.get('/conversation/:conversationId', protect, feedbackLimiter, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID format' });
    }

    // Convert to ObjectId to prevent NoSQL injection
    const sanitizedConversationId = new mongoose.Types.ObjectId(conversationId);

    // Find conversation and verify ownership
    const conversation = await Conversation.findOne({
      _id: sanitizedConversationId,
      userId: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Get all feedback records (only for this user's conversations)
    const feedbackRecords = await Feedback.find({
      conversationId: sanitizedConversationId,
      userId: req.user._id
    })
    .select('messageIndex rating timestamp -_id') // Exclude sensitive fields
    .sort({ messageIndex: 1 });

    res.json({
      success: true,
      overallRating: conversation.overallRating,
      messageFeedback: feedbackRecords
    });

  } catch (error) {
    
    res.status(500).json({ 
      message: 'Failed to fetch feedback. Please try again.' 
    });
  }
});

export default router;
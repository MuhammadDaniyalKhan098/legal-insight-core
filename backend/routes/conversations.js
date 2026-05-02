/**
 * Conversation Routes
 * 
 * Handles CRUD operations for user chat conversations.
 * Includes listing, retrieving, updating, and deleting conversations.
 * 
 * @module routes/conversations
 */

import express from "express";
import { protect } from "../middleware/auth.js";
import Conversation from "../models/Conversation.js";

const router = express.Router();

/**
 * GET /
 * Get list of user's conversations sorted by last update.
 * Returns only active conversations with overall rating.
 * Requires authentication.
 */

router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      userId: req.user._id,
      isActive: true
    }).sort({ lastUpdated: -1 }).select('title lastUpdated overallRating');

    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch conversations', error: error.message });
  }
});

/**
 * GET /:id
 * Get specific conversation with full message history including feedback.
 * Requires authentication and ownership verification.
 */

router.get('/:id', protect, async (req, res) => {
  try {
    // Sanitize ID to prevent NoSQL injection
    const sanitizedId = String(req.params.id).trim();

    const conversation = await Conversation.findOne({
      _id: sanitizedId,
      userId: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        messages: conversation.messages,
        overallRating: conversation.overallRating,
        lastUpdated: conversation.lastUpdated
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch conversation', error: error.message });
  }
});

/**
 * PATCH /:id
 * Update conversation title (rename conversation).
 * Requires authentication and ownership verification.
 */

router.patch('/:id', protect, async (req, res) => {
  try {
    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (title.trim().length > 100) {
      return res.status(400).json({ message: 'Title must not exceed 100 characters' });
    }

    // Sanitize ID to prevent NoSQL injection
    const sanitizedId = String(req.params.id).trim();

    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: sanitizedId,
        userId: req.user._id,
        isActive: true
      },
      {
        title: title.trim()
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json({
      success: true,
      message: 'Conversation renamed successfully',
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        lastUpdated: conversation.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error renaming conversation:', error);
    res.status(500).json({ message: 'Failed to rename conversation', error: error.message });
  }
});

/**
 * DELETE /:id
 * Soft delete conversation by marking as inactive.
 * Requires authentication and ownership verification.
 */

router.delete('/:id', protect, async (req, res) => {
  try {
    // Sanitize ID to prevent NoSQL injection
    const sanitizedId = String(req.params.id).trim();

    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: sanitizedId,
        userId: req.user._id
      },
      { isActive: false },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete conversation', error: error.message });
  }
});

export default router;
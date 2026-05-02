/**
 * Community Routes
 * 
 * Handles all community Q&A forum endpoints including:
 * - Questions (CRUD, voting, sorting, filtering)
 * - Answers (CRUD, voting)
 * - Tags (extraction, filtering)
 * - Mentions (extraction, notifications)
 * - Notifications (read/unread, fetching)
 * - Reports (submission)
 * 
 * @module routes/community
 */

import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/auth.js";
import {
  questionLimiter,
  answerLimiter,
  voteLimiter,
  reportLimiter,
} from "../middleware/rateLimiter.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import Vote from "../models/Vote.js";
import Tag from "../models/Tag.js";
import Mention from "../models/Mention.js";
import Notification from "../models/Notification.js";
import Report from "../models/Report.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * Utility: Extract hashtags from text
 */
const extractHashtags = (text) => {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  if (!matches) return [];
  return matches.map((tag) => tag.substring(1).toLowerCase());
};

/**
 * Utility: Extract mentions from text
 */
const extractMentions = (text) => {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  if (!matches) return [];
  return matches.map((mention) => mention.substring(1));
};

/**
 * Utility: Create notification
 */
const createNotification = async (user, type, title, message, link, question, answer, fromUser) => {
  try {
    await Notification.create({
      user,
      type,
      title,
      message,
      link,
      question,
      answer,
      fromUser,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

/**
 * Utility: Validate vote type
 */
const validateVoteType = (rawVoteType) => {
  if (!rawVoteType || typeof rawVoteType !== 'string') {
    return { valid: false, error: "Vote type is required and must be a string" };
  }

  const validVoteTypes = ["upvote", "downvote"];
  if (!validVoteTypes.includes(rawVoteType)) {
    return { valid: false, error: "Invalid vote type. Must be 'upvote' or 'downvote'" };
  }

  const sanitizedVoteType = validVoteTypes.find(v => v === rawVoteType);
  return { valid: true, voteType: sanitizedVoteType };
};

/**
 * Utility: Handle vote logic
 */
const handleVoteLogic = async (existingVote, voteType, targetDocument) => {
  let finalUserVote = null;

  if (existingVote) {
    if (existingVote.voteType === voteType) {
      // Same vote, remove it
      await Vote.findByIdAndDelete(existingVote._id);
      targetDocument.totalVotes += voteType === "upvote" ? -1 : 1;
      finalUserVote = null;
    } else {
      // Different vote, change it
      existingVote.voteType = voteType;
      await existingVote.save();
      targetDocument.totalVotes += voteType === "upvote" ? 2 : -2;
      finalUserVote = voteType;
    }
  } else {
    // Create new vote
    targetDocument.totalVotes += voteType === "upvote" ? 1 : -1;
    finalUserVote = voteType;
  }

  return finalUserVote;
};

/**
 * Utility: Validate reason for report
 */
const validateReason = (reason) => {
  if (!reason || typeof reason !== 'string') {
    return { valid: false, error: "Reason is required and must be a string" };
  }

  const validReasons = ["misinformation", "harassment", "spam", "other"];
  if (!validReasons.includes(reason)) {
    return { valid: false, error: "Invalid reason. Must be one of: misinformation, harassment, spam, other" };
  }

  const sanitizedReason = validReasons.find(r => r === reason);
  return { valid: true, reason: sanitizedReason };
};

/**
 * Utility: Validate and fetch question
 */
const validateQuestion = async (questionId) => {
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    return { valid: false, error: "Invalid question ID format" };
  }

  const question = await Question.findById(questionId);
  if (!question || question.isDeleted) {
    return { valid: false, error: "Question not found", statusCode: 404 };
  }

  return { valid: true, id: question._id };
};

/**
 * Utility: Validate and fetch answer
 */
const validateAnswer = async (answerId) => {
  if (!mongoose.Types.ObjectId.isValid(answerId)) {
    return { valid: false, error: "Invalid answer ID format" };
  }

  const answer = await Answer.findById(answerId);
  if (!answer || answer.isDeleted) {
    return { valid: false, error: "Answer not found", statusCode: 404 };
  }

  return { valid: true, id: answer._id };
};

/**
 * Utility: Validate description
 */
const validateDescription = (description) => {
  if (!description) {
    return { valid: true, description: null };
  }

  if (typeof description !== 'string') {
    return { valid: false, error: "Description must be a string" };
  }

  if (description.trim().length > 1000) {
    return { valid: false, error: "Description must be less than 1000 characters" };
  }

  return { valid: true, description: description.trim() };
};

// ============================================
// QUESTIONS
// ============================================

/**
 * GET /questions
 * Get questions with sorting and filtering
 * Query params: sort (top|newest|unanswered), tag, page, limit
 */
router.get("/questions", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "top";
    const tag = req.query.tag;

    let query = { isDeleted: false };
    let sortOption = {};

    // Filter by tag
    if (tag) {
      const tagDoc = await Tag.findOne({ name: tag.toLowerCase() });
      if (tagDoc) {
        query.tags = tagDoc._id;
      } else {
        // Tag doesn't exist, return empty results
        return res.json({
          questions: [],
          currentPage: page,
          totalPages: 0,
          totalQuestions: 0,
        });
      }
    }

    // Sorting
    if (sort === "newest") {
      sortOption = { createdAt: -1 };
    } else if (sort === "unanswered") {
      query.answerCount = 0;
      sortOption = { createdAt: -1 };
    } else {
      // Default: top (by total votes)
      sortOption = { totalVotes: -1, createdAt: -1 };
    }

    const [questions, total] = await Promise.all([
      Question.find(query)
        .populate("author", "username role profilePicture")
        .populate("tags", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Question.countDocuments(query),
    ]);

    // Get user votes if authenticated
    let userVotes = {};
    if (req.user) {
      const questionIds = questions.map((q) => q._id);
      const votes = await Vote.find({
        user: req.user._id,
        question: { $in: questionIds },
      });
      votes.forEach((vote) => {
        userVotes[vote.question.toString()] = vote.voteType;
      });
    }

    res.json({
      questions,
      userVotes,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalQuestions: total,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ message: "Error fetching questions" });
  }
});

/**
 * GET /questions/:id
 * Get a single question with answers
 */
router.get("/questions/:id", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate("author", "username role profilePicture")
      .populate("tags", "name");

    if (!question || question.isDeleted) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Get answers sorted by votes and admin answers first
    const answers = await Answer.find({
      question: question._id,
      isDeleted: false,
    })
      .populate("author", "username role profilePicture")
      .sort({ isAdminAnswer: -1, isPinned: -1, totalVotes: -1, createdAt: -1 });

    // Get user's vote on question if authenticated
    let userVote = null;
    if (req.user) {
      const vote = await Vote.findOne({
        user: req.user._id,
        question: question._id,
      });
      userVote = vote ? vote.voteType : null;
    }

    // Get user's votes on answers if authenticated
    let answerVotes = {};
    if (req.user) {
      const votes = await Vote.find({
        user: req.user._id,
        answer: { $in: answers.map((a) => a._id) },
      });
      votes.forEach((vote) => {
        answerVotes[vote.answer.toString()] = vote.voteType;
      });
    }

    res.json({
      question,
      answers,
      userVote,
      answerVotes,
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({ message: "Error fetching question" });
  }
});

/**
 * POST /questions
 * Create a new question
 * Requires authentication
 */
router.post("/questions", protect, questionLimiter, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    // Extract hashtags
    const hashtags = extractHashtags(content);
    const tagIds = [];

    // Create or find tags
    for (const tagName of hashtags) {
      let tag = await Tag.findOne({ name: tagName });
      if (!tag) {
        tag = await Tag.create({ name: tagName, questionCount: 0 });
      }
      tagIds.push(tag._id);
    }

    // Create question
    const question = await Question.create({
      title: title.trim(),
      content: content.trim(),
      author: req.user._id,
      tags: tagIds,
    });

    // Update tag question counts
    await Tag.updateMany(
      { _id: { $in: tagIds } },
      { $inc: { questionCount: 1 } }
    );

    // Extract mentions and create notifications
    const mentions = extractMentions(content);
    for (const username of mentions) {
      const mentionedUser = await User.findOne({ username });
      if (mentionedUser && mentionedUser._id.toString() !== req.user._id.toString()) {
        await Mention.create({
          mentionedUser: mentionedUser._id,
          question: question._id,
          mentionedBy: req.user._id,
        });

        await createNotification(
          mentionedUser._id,
          "mention",
          "You were mentioned in a question",
          `${req.user.username} mentioned you in: ${title}`,
          `/community/question/${question._id}`,
          question._id,
          null,
          req.user._id
        );
      }
    }

    const populatedQuestion = await Question.findById(question._id)
      .populate("author", "username role profilePicture")
      .populate("tags", "name");

    res.status(201).json(populatedQuestion);
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ message: "Error creating question" });
  }
});

/**
 * PUT /questions/:id
 * Update a question (only by author)
 */
router.put("/questions/:id", protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question || question.isDeleted) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this question" });
    }

    const { title, content } = req.body;

    if (title) question.title = title.trim();
    if (content) {
      question.content = content.trim();

      // Re-extract hashtags
      const hashtags = extractHashtags(content);
      const oldTagIds = question.tags.map((t) => t.toString());
      const tagIds = [];

      for (const tagName of hashtags) {
        let tag = await Tag.findOne({ name: tagName });
        if (!tag) {
          tag = await Tag.create({ name: tagName, questionCount: 0 });
        }
        tagIds.push(tag._id);
      }

      // Update tag counts
      const newTagIds = tagIds.map((t) => t.toString());
      const removedTags = oldTagIds.filter((t) => !newTagIds.includes(t));
      const addedTags = newTagIds.filter((t) => !oldTagIds.includes(t));

      await Tag.updateMany(
        { _id: { $in: removedTags } },
        { $inc: { questionCount: -1 } }
      );
      await Tag.updateMany(
        { _id: { $in: addedTags } },
        { $inc: { questionCount: 1 } }
      );

      question.tags = tagIds;
    }

    await question.save();

    const populatedQuestion = await Question.findById(question._id)
      .populate("author", "username role profilePicture")
      .populate("tags", "name");

    res.json(populatedQuestion);
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ message: "Error updating question" });
  }
});

/**
 * DELETE /questions/:id
 * Delete a question (soft delete, only by author)
 */
router.delete("/questions/:id", protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question || question.isDeleted) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this question" });
    }

    question.isDeleted = true;
    question.deletedAt = new Date();
    question.deletedBy = req.user._id;
    await question.save();

    // Decrement tag counts
    await Tag.updateMany(
      { _id: { $in: question.tags } },
      { $inc: { questionCount: -1 } }
    );

    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ message: "Error deleting question" });
  }
});

// ============================================
// ANSWERS
// ============================================

/**
 * POST /questions/:id/answers
 * Create an answer to a question
 */
router.post("/questions/:id/answers", protect, answerLimiter, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question || question.isDeleted) {
      return res.status(404).json({ message: "Question not found" });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    // Create answer
    const answer = await Answer.create({
      content: content.trim(),
      author: req.user._id,
      question: question._id,
    });

    // Update question answer count
    question.answerCount += 1;
    await question.save();

    // Extract mentions and create notifications
    const mentions = extractMentions(content);
    for (const username of mentions) {
      const mentionedUser = await User.findOne({ username });
      if (mentionedUser && mentionedUser._id.toString() !== req.user._id.toString()) {
        await Mention.create({
          mentionedUser: mentionedUser._id,
          answer: answer._id,
          mentionedBy: req.user._id,
        });

        await createNotification(
          mentionedUser._id,
          "mention",
          "You were mentioned in an answer",
          `${req.user.username} mentioned you in an answer`,
          `/community/question/${question._id}`,
          question._id,
          answer._id,
          req.user._id
        );
      }
    }

    // Notify question author (if not the same user)
    if (question.author.toString() !== req.user._id.toString()) {
      await createNotification(
        question.author,
        "answer",
        "New answer to your question",
        `${req.user.username} answered your question: ${question.title}`,
        `/community/question/${question._id}`,
        question._id,
        answer._id,
        req.user._id
      );
    }

    const populatedAnswer = await Answer.findById(answer._id)
      .populate("author", "username role profilePicture");

    res.status(201).json(populatedAnswer);
  } catch (error) {
    console.error("Error creating answer:", error);
    res.status(500).json({ message: "Error creating answer" });
  }
});

/**
 * PUT /answers/:id
 * Update an answer (only by author)
 */
router.put("/answers/:id", protect, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer || answer.isDeleted) {
      return res.status(404).json({ message: "Answer not found" });
    }

    if (answer.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this answer" });
    }

    const { content } = req.body;

    if (content) {
      answer.content = content.trim();
      await answer.save();
    }

    const populatedAnswer = await Answer.findById(answer._id)
      .populate("author", "username role profilePicture");

    res.json(populatedAnswer);
  } catch (error) {
    console.error("Error updating answer:", error);
    res.status(500).json({ message: "Error updating answer" });
  }
});

/**
 * DELETE /answers/:id
 * Delete an answer (soft delete, only by author)
 */
router.delete("/answers/:id", protect, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer || answer.isDeleted) {
      return res.status(404).json({ message: "Answer not found" });
    }

    if (answer.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this answer" });
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

// ============================================
// VOTING
// ============================================

/**
 * POST /questions/:id/vote
 * Vote on a question (upvote or downvote)
 */
router.post("/questions/:id/vote", protect, voteLimiter, async (req, res) => {
  try {
    const { voteType: rawVoteType } = req.body;

    // Validate vote type
    const voteValidation = validateVoteType(rawVoteType);
    if (!voteValidation.valid) {
      return res.status(400).json({ message: voteValidation.error });
    }
    const voteType = voteValidation.voteType;

    // Validate question ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid question ID format" });
    }

    const question = await Question.findById(req.params.id);
    if (!question || question.isDeleted) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Check for existing vote
    const existingVote = await Vote.findOne({
      user: req.user._id,
      question: question._id,
    });

    // Handle vote logic
    const finalUserVote = await handleVoteLogic(existingVote, voteType, question);

    // Create new vote if needed
    if (!existingVote) {
      await Vote.create({
        user: req.user._id,
        question: question._id,
        voteType: voteType,
      });
    }

    await question.save();

    res.json({
      totalVotes: question.totalVotes,
      userVote: finalUserVote,
    });
  } catch (error) {
    console.error("Error voting on question:", error);
    res.status(500).json({ message: "Error voting on question" });
  }
});

/**
 * POST /answers/:id/vote
 * Vote on an answer (upvote or downvote)
 */
router.post("/answers/:id/vote", protect, voteLimiter, async (req, res) => {
  try {
    const { voteType: rawVoteType } = req.body;

    // Validate vote type
    const voteValidation = validateVoteType(rawVoteType);
    if (!voteValidation.valid) {
      return res.status(400).json({ message: voteValidation.error });
    }
    const voteType = voteValidation.voteType;

    // Validate answer ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid answer ID format" });
    }

    const answer = await Answer.findById(req.params.id);
    if (!answer || answer.isDeleted) {
      return res.status(404).json({ message: "Answer not found" });
    }

    // Check for existing vote
    const existingVote = await Vote.findOne({
      user: req.user._id,
      answer: answer._id,
    });

    // Handle vote logic
    const finalUserVote = await handleVoteLogic(existingVote, voteType, answer);

    // Create new vote if needed
    if (!existingVote) {
      await Vote.create({
        user: req.user._id,
        answer: answer._id,
        voteType: voteType,
      });
    }

    await answer.save();

    res.json({
      totalVotes: answer.totalVotes,
      userVote: finalUserVote,
    });
  } catch (error) {
    console.error("Error voting on answer:", error);
    res.status(500).json({ message: "Error voting on answer" });
  }
});

// ============================================
// TAGS
// ============================================

/**
 * GET /tags
 * Get all tags with question counts
 */
router.get("/tags", async (req, res) => {
  try {
    const tags = await Tag.find().sort({ questionCount: -1, name: 1 });
    res.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ message: "Error fetching tags" });
  }
});

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * GET /notifications
 * Get user's notifications
 */
router.get("/notifications", protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .populate("fromUser", "username")
        .populate("question", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ user: req.user._id }),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    res.json({
      notifications,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

/**
 * GET /notifications/unread-count
 * Get unread notification count
 */
router.get("/notifications/unread-count", protect, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });
    res.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Error fetching unread count" });
  }
});

/**
 * PATCH /notifications/:id/read
 * Mark notification as read
 */
router.patch("/notifications/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Error marking notification as read" });
  }
});

/**
 * PATCH /notifications/read-all
 * Mark all notifications as read
 */
router.patch("/notifications/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Error marking all notifications as read" });
  }
});

// ============================================
// REPORTS
// ============================================

/**
 * POST /reports
 * Report a question or answer
 */
router.post("/reports", protect, reportLimiter, async (req, res) => {
  try {
    const { questionId, answerId, reason, description } = req.body;

    // Validate reason
    const reasonValidation = validateReason(reason);
    if (!reasonValidation.valid) {
      return res.status(400).json({ message: reasonValidation.error });
    }
    const sanitizedReason = reasonValidation.reason;

    // Validate that exactly one ID is provided
    if (!questionId && !answerId) {
      return res.status(400).json({ 
        message: "Either questionId or answerId is required" 
      });
    }

    if (questionId && answerId) {
      return res.status(400).json({ 
        message: "Cannot report both question and answer" 
      });
    }

    // Validate question if provided
    let sanitizedQuestionId = null;
    if (questionId) {
      const questionValidation = await validateQuestion(questionId);
      if (!questionValidation.valid) {
        const statusCode = questionValidation.statusCode || 400;
        return res.status(statusCode).json({ message: questionValidation.error });
      }
      sanitizedQuestionId = questionValidation.id;
    }

    // Validate answer if provided
    let sanitizedAnswerId = null;
    if (answerId) {
      const answerValidation = await validateAnswer(answerId);
      if (!answerValidation.valid) {
        const statusCode = answerValidation.statusCode || 400;
        return res.status(statusCode).json({ message: answerValidation.error });
      }
      sanitizedAnswerId = answerValidation.id;
    }

    // Validate description
    const descriptionValidation = validateDescription(description);
    if (!descriptionValidation.valid) {
      return res.status(400).json({ message: descriptionValidation.error });
    }
    const sanitizedDescription = descriptionValidation.description;

    // Create report
    const report = await Report.create({
      reportedBy: req.user._id,
      question: sanitizedQuestionId,
      answer: sanitizedAnswerId,
      reason: sanitizedReason,
      description: sanitizedDescription,
    });

    res.status(201).json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Error creating report" });
  }
});

export default router;
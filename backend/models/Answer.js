/**
 * Answer Model
 * 
 * Defines the schema for answers to community questions.
 * Includes content, author, question reference, votes, and admin verification.
 * 
 * @module models/Answer
 */

import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
    isAdminAnswer: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
answerSchema.index({ question: 1, totalVotes: -1, createdAt: -1 });
answerSchema.index({ author: 1, createdAt: -1 });
answerSchema.index({ isAdminAnswer: -1, isPinned: -1 });

const Answer = mongoose.model("Answer", answerSchema);

export default Answer;

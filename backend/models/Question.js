/**
 * Question Model
 * 
 * Defines the schema for community questions.
 * Includes title, content, author, tags, votes, and metadata.
 * 
 * @module models/Question
 */

import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
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
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
    totalVotes: {
      type: Number,
      default: 0,
    },
    answerCount: {
      type: Number,
      default: 0,
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
questionSchema.index({ author: 1, createdAt: -1 });
questionSchema.index({ totalVotes: -1, createdAt: -1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ isDeleted: 1, isPinned: -1 });

const Question = mongoose.model("Question", questionSchema);

export default Question;

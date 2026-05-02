/**
 * Mention Model
 * 
 * Defines the schema for @username mentions in questions and answers.
 * Used to trigger notifications and track mentions.
 * 
 * @module models/Mention
 */

import mongoose from "mongoose";

const mentionSchema = new mongoose.Schema(
  {
    mentionedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      default: null,
    },
    answer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Answer",
      default: null,
    },
    mentionedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
mentionSchema.index({ mentionedUser: 1, createdAt: -1 });
mentionSchema.index({ question: 1 });
mentionSchema.index({ answer: 1 });

const Mention = mongoose.model("Mention", mentionSchema);

export default Mention;

/**
 * Vote Model
 * * Defines the schema for votes on questions and answers.
 * Ensures one vote per user per item (question or answer).
 * * @module models/Vote
 */

import mongoose from "mongoose";

const voteSchema = new mongoose.Schema(
  {
    user: {
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
    voteType: {
      type: String,
      enum: ["upvote", "downvote"],
      required: true,
    },
  },
  { timestamps: true }
);

voteSchema.index(
  { user: 1, question: 1 },
  { 
    unique: true, 
    partialFilterExpression: { question: { $type: "objectId" } } 
  }
);

voteSchema.index(
  { user: 1, answer: 1 },
  { 
    unique: true, 
    partialFilterExpression: { answer: { $type: "objectId" } } 
  }
);

// Ensure either question or answer is provided, but not both
voteSchema.pre("validate", function (next) {
  if (!this.question && !this.answer) {
    return next(new Error("Either question or answer must be provided"));
  }
  if (this.question && this.answer) {
    return next(new Error("Cannot vote on both question and answer simultaneously"));
  }
  next();
});

const Vote = mongoose.model("Vote", voteSchema);

export default Vote;
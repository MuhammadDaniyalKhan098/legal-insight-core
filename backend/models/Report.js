/**
 * Report Model
 * 
 * Defines the schema for user reports on questions and answers.
 * Used for moderation and safety.
 * 
 * @module models/Report
 */

import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
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
    reason: {
      type: String,
      enum: ["misinformation", "harassment", "spam", "other"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ question: 1 });
reportSchema.index({ answer: 1 });

// Ensure either question or answer is provided
reportSchema.pre("validate", function (next) {
  if (!this.question && !this.answer) {
    return next(new Error("Either question or answer must be provided"));
  }
  if (this.question && this.answer) {
    return next(new Error("Cannot report both question and answer simultaneously"));
  }
  next();
});

const Report = mongoose.model("Report", reportSchema);

export default Report;

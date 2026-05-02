/**
 * Tag Model
 * 
 * Defines the schema for hashtags/tags used in questions.
 * Auto-extracted from question content or manually added.
 * 
 * @module models/Tag
 */

import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
    },
    questionCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
// tagSchema.index({ name: 1 });
tagSchema.index({ questionCount: -1 });

const Tag = mongoose.model("Tag", tagSchema);

export default Tag;

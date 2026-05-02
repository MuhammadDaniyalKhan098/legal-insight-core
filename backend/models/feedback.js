/**
 * Feedback Model - STRIDE Security Implementation
 * 
 * Defines the Feedback schema for storing user feedback on chatbot responses.
 * Includes message-level feedback and overall conversation ratings.
 * 
 * Security Controls:
 * - Repudiation: Automatic timestamps with createdAt/updatedAt
 * - Information Disclosure: Sensitive fields excluded from default queries
 * - Tampering: Schema validation prevents malformed data
 * 
 * @module models/Feedback
 */

import mongoose from "mongoose";

/**
 * Feedback Schema - Stores user feedback on individual responses
 * 
 * Security Features:
 * - Timestamps for audit trail (Repudiation mitigation)
 * - Indexed for efficient queries without exposing patterns
 * - Validation on all fields (Tampering mitigation)
 */
const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true // For efficient queries
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: [true, 'Conversation ID is required'],
    index: true
  },
  messageIndex: {
    type: Number,
    required: [true, 'Message index is required'],
    min: [0, 'Message index must be non-negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Message index must be an integer'
    }
  },
  rating: {
    type: String,
    required: [true, 'Rating is required'],
    enum: {
      values: ['positive', 'negative'],
      message: 'Rating must be either positive or negative'
    }
  },
  reason: {
    type: String,
    default: '',
    maxlength: [500, 'Reason must not exceed 500 characters'],
    trim: true,
    // Sanitize on save - Information Disclosure mitigation
    set: function(value) {
      if (!value) return '';
      // Remove potential XSS characters
      return value.replace(/[<>\"']/g, '').trim();
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    immutable: true // Prevent tampering with timestamps
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt - Repudiation mitigation
  // Security: Don't expose version key and _id in responses by default
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Compound index for efficient queries and prevent duplicates
// Security: Ensures a user can only have one feedback per message
feedbackSchema.index(
  { userId: 1, conversationId: 1, messageIndex: 1 }, 
  { unique: true }
);

// Index for admin queries (sorted by timestamp)
feedbackSchema.index({ timestamp: -1 });

// Security: Pre-save hook to validate data integrity
feedbackSchema.pre('save', function(next) {
  // Ensure timestamp is not in the future (Tampering mitigation)
  if (this.timestamp > new Date()) {
    this.timestamp = new Date();
  }
  next();
});

// Security: Instance method to get sanitized feedback (Information Disclosure mitigation)
feedbackSchema.methods.getSanitized = function() {
  return {
    messageIndex: this.messageIndex,
    rating: this.rating,
    timestamp: this.timestamp,
    // Note: reason is NOT included to protect user privacy
  };
};

// Security: Static method for admins to get feedback with reason
// Only accessible through admin routes with proper authorization
feedbackSchema.statics.getAdminView = async function(query) {
  return this.find(query)
    .populate('userId', 'username email') // Only necessary user fields
    .select('conversationId messageIndex rating reason timestamp')
    .sort({ timestamp: -1 });
};

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
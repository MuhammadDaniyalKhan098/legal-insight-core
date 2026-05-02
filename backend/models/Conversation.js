/**
 * Conversation Model
 * * Defines schemas for chat conversations and messages.
 * Includes methods for the generation of a title and automatic timestamp updates.
 * * @module models/Conversation
 */

import mongoose from "mongoose";

// Message Schema - Represents individual messages within a conversation.
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant']
  },
  content: {
    type: String,
    required: true
  },

  // --- ADD THESE NEW FIELDS ---
  isDraft: { type: Boolean, default: false },
  fileName: { type: String },
  fileData: { type: String }, // Stores the Base64 string
  // ----------------------------
  
  // --- Attachments Field ---
  attachments: [{
    fileName: String,
    fileType: String,
    filePath: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  // --- Reasoning Field ---
  reasoning: {
    intent: String,
    route: String,
    sub_queries: [String],
    comparison_terms: [String],
    database_targets: String,
    // Start: Added to allow flexible reasoning data if schema changes
    sources: Array, 
    doc_count: Number
    // End
  },
  // --- NEW: LLM Evaluation Metrics ---
  evaluation: {
    factuality: { type: Number, default: 0 }, // Score 0-10
    coherence: { type: Number, default: 0 },  // Score 0-10
    accuracy: { type: Number, default: 0 },   // Score 0-10
    fluency: { type: Number, default: 0 },    // Score 0-10
    explanation: { type: String, default: "" } // Brief justification from the judge
  },
  // -----------------------------------
  timestamp: {
    type: Date,
    default: Date.now
  },
  feedback: {
    rating: {
      type: String,
      enum: ['positive', 'negative'],
      default: null
    },
    reason: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: null
    }
  }
});

// Conversation Schema - Stores chat conversations with associated messages and metadata.
const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'New Chat'
  },
  messages: [messageSchema],
  overallRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
    description: 'Overall rating for the conversation (0-5 stars)'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Update lastUpdated when messages are added - Pre-save middleware to update lastUpdated timestamp.
conversationSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

/**
 * Generate conversation title from first user message.
 * Truncates to 50 characters or first sentence, whichever of the two is shorter.
 * * @returns {string} The generated title for the conversation
 */

conversationSchema.methods.generateTitle = function() {
  const firstUserMessage = this.messages.find(msg => msg.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim();
    // Fallback title: first sentence or 50 chars, used if AI call fails
    const firstSentence = content.split(/[.!?]/)[0].trim();
    this.title = firstSentence.length > 0 && firstSentence.length <= 60
      ? firstSentence
      : content.substring(0, 57) + (content.length > 57 ? '...' : '');
  }
  return this.title;
};

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
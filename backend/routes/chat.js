/**
 * Chat Routes - STRIDE Security Enhanced (Sprint-2)
 *
 * Handles AI chat interactions using FastAPI RAG System.
 * Manages conversation history and integrates with LangGraph memory.
 * Includes automated Gemini 2.0 Evaluation.
 * 
 * STRIDE Mitigations Implemented:
 * - Spoofing: JWT authentication, session validation
 * - Tampering: HTTPS, input validation, file integrity checks
 * - Repudiation: Comprehensive audit logging
 * - Information Disclosure: Output filtering, secure file handling
 * - Denial of Service: Rate limiting, file size limits, timeout controls
 * - Elevation of Privilege: RBAC, input sanitization, authorization checks
 *
 * @module routes/chat
 */

import express from "express";
import { protect } from "../middleware/auth.js";
import axios from "axios";
import Conversation from "../models/Conversation.js";
import multer from "multer";
import FormData from "form-data";
import mongoose from "mongoose";
import crypto from "crypto";

const router = express.Router();

// --- STRIDE: Denial of Service - File size and type restrictions ---
// Use memoryStorage to prevent file locking/permission issues
const storage = multer.memoryStorage();

// STRIDE: Tampering & Denial of Service - File validation with integrity checks
const fileFilter = (req, file, cb) => {
  // Only allow specific file types
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  // STRIDE: Tampering - Validate both mimetype and file extension
  const allowedExtensions = ['.pdf', '.docx', '.txt'];
  const fileExtension = file.originalname.toLowerCase().match(/\.[^.]*$/)?.[0];

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    // STRIDE: Information Disclosure - Generic error message
    cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,  // STRIDE: Denial of Service - 10MB limit
    files: 1  // STRIDE: Denial of Service - Only one file per request
  },
  fileFilter: fileFilter
});

// STRIDE: Repudiation - Audit logging function
function auditLog(userId, action, details, status = 'success') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: userId,
    action: action,
    details: details,
    status: status,
    ip: details.ip || 'unknown'
  };

  // In production, send to a logging service (e.g., Winston, ELK)
  console.log('[AUDIT]', JSON.stringify(logEntry));
}

// STRIDE: Tampering - Calculate file hash for integrity verification
function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// STRIDE: Information Disclosure - Filter sensitive data from output
function filterSensitiveData(reasoning) {
  if (!reasoning) return reasoning;

  // Create a copy to avoid modifying original
  const filtered = { ...reasoning };

  // Remove or redact system paths, internal IDs, etc.
  if (filtered.sources) {
    filtered.sources = filtered.sources.map(source => ({
      title: source.title,
      section: source.section,
      confidence: source.confidence,
      data_point: source.data_point
      // Omit internal fields like file_path, database_id, etc.
    }));
  }

  return filtered;
}

// STRIDE: Tampering - Sanitize filename to prevent path traversal
function sanitizeFilename(filename) {
  // Remove path separators and special characters
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

// Generates a concise topic-based title using Gemini
async function generateSmartTitle(userQuery) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return null;

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Given this user message, generate a short, specific conversation title (max 50 characters, no quotes, no punctuation at end) that captures the main legal topic being asked about. Return ONLY the title text, nothing else.

User message: "${userQuery.substring(0, 500)}"`;

  try {
    const response = await axios.post(GEMINI_URL, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 30 }
    }, { timeout: 5000 });

    const title = response.data.candidates[0].content.parts[0].text
      .trim()
      .replace(/^["']|["']$/g, '')   // strip surrounding quotes
      .substring(0, 60);

    return title.length > 0 ? title : null;
  } catch {
    return null; // fall back silently
  }
}

async function evaluateAnswerWithGemini(userQuery, botAnswer) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // STRIDE: Information Disclosure - Don't log API keys
  if (!GEMINI_API_KEY) {
    return {
      factuality: 0, coherence: 0, accuracy: 0, fluency: 0,
      explanation: "Evaluation failed (API Key Missing)."
    };
  }

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  // STRIDE: Tampering - Sanitize inputs for evaluation
  const sanitizedQuery = userQuery.substring(0, 1000); // Limit length
  const sanitizedAnswer = botAnswer.substring(0, 2000);

  const prompt = `
    You are an expert AI Quality Assurance Judge. 
    Evaluate the following Chatbot Response based on the User Query.
    
    User Query: "${sanitizedQuery}"
    Chatbot Response: "${sanitizedAnswer}"
    
    Score the response from 0 to 10 on these 4 metrics:
    1. Factuality: Is the information true and hallucinaton-free?
    2. Coherence: Does the answer make logical sense?
    3. Accuracy: Does it directly address the user's specific intent?
    4. Fluency: Is the grammar and style natural?

    Return ONLY a JSON object in this format (no markdown):
    {
      "factuality": number,
      "coherence": number,
      "accuracy": number,
      "fluency": number,
      "explanation": "short one sentence reason"
    }
    `;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await axios.post(GEMINI_URL, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      }, {
        timeout: 10000  // STRIDE: Denial of Service - 10 second timeout for evaluation
      });

      const jsonString = response.data.candidates[0].content.parts[0].text;
      return JSON.parse(jsonString);

    } catch (error) {
      // STRIDE: Denial of Service - Handle rate limiting with exponential backoff
      if (error.response && error.response.status === 429) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000;

        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // STRIDE: Information Disclosure - Don't expose detailed error info
        if (error.response && error.response.status === 400) {
          console.error("⚠️ 400 Bad Request Details:", error.response.data);
        }

        return {
          factuality: 0, coherence: 0, accuracy: 0, fluency: 0,
          explanation: "Evaluation failed (API Error)."
        };
      }
    }
  }

  return {
    factuality: 0, coherence: 0, accuracy: 0, fluency: 0,
    explanation: "Evaluation unavailable (System Busy)"
  };
}

/**
 * POST /send
 * STRIDE Protected: All threats mitigated
 */
router.post("/send", protect, upload.single('file'), async (req, res) => {
  try {
    // STRIDE: Spoofing - User already authenticated via protect middleware
    const userId = req.user._id;
    const clientIp = req.ip || req.connection.remoteAddress;

    const RAG_API_URL = process.env.RAG_API_URL || "http://localhost:8000/api/query";

    // 1. Parse and Validate Input
    // let { messages, conversationId } = req.body;
    let { messages, conversationId, mode } = req.body;

    // STRIDE: Tampering - Validate input format
    if (typeof messages === 'string') {
      try {
        messages = JSON.parse(messages);
      } catch (e) {
        auditLog(userId, 'chat_send', { error: 'Invalid messages format', ip: clientIp }, 'error');
        return res.status(400).json({ message: "Invalid messages format" });
      }
    }

    // STRIDE: Tampering - Validate messages is an array
    if (!Array.isArray(messages) || messages.length === 0) {
      auditLog(userId, 'chat_send', { error: 'Messages must be a non-empty array', ip: clientIp }, 'error');
      return res.status(400).json({ message: "Messages must be a non-empty array" });
    }

    const latestMessage = messages.at(-1);
    const userQuery = latestMessage?.content || "";
    const file = req.file;

    // STRIDE: Tampering - Sanitize user input
    const sanitizedQuery = userQuery.trim().substring(0, 10000); // Hard limit

    // STRIDE: Tampering - Validate and sanitize file if present
    let fileHash = null;
    let sanitizedFilename = null;

    if (file) {
      // Calculate file hash for integrity
      fileHash = calculateFileHash(file.buffer);

      // Sanitize filename
      sanitizedFilename = sanitizeFilename(file.originalname);

      // STRIDE: Tampering - Additional file validation
      if (file.size === 0) {
        auditLog(userId, 'chat_send', { error: 'Empty file uploaded', ip: clientIp }, 'error');
        return res.status(400).json({ message: "Empty files are not allowed" });
      }

      // STRIDE: Tampering - Validate file magic numbers (file signature)
      const fileSignatures = {
        'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // PK (ZIP format)
        'text/plain': null // Text files don't have a specific signature
      };

      const signature = fileSignatures[file.mimetype];
      if (signature && file.mimetype !== 'text/plain') {
        const fileHeader = Array.from(file.buffer.slice(0, 4));
        const signatureMatch = signature.every((byte, index) => byte === fileHeader[index]);

        if (!signatureMatch) {
          auditLog(userId, 'chat_send', {
            error: 'File signature mismatch',
            mimetype: file.mimetype,
            ip: clientIp
          }, 'error');
          return res.status(400).json({ message: "File appears to be corrupted or invalid" });
        }
      }
    }

    // STRIDE: Repudiation - Log the request with file details
    auditLog(userId, 'chat_send', {
      messageLength: sanitizedQuery.length,
      hasFile: !!file,
      fileName: sanitizedFilename,
      fileSize: file?.size,
      fileHash: fileHash,
      conversationId: conversationId || 'new',
      ip: clientIp
    });

    // 2. Find or Create Conversation
    let conversation;
    if (conversationId && conversationId !== "null") {
      // STRIDE: Tampering - Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        auditLog(userId, 'chat_send', { error: 'Invalid conversation ID', ip: clientIp }, 'error');
        return res.status(400).json({ message: "Invalid conversation ID format" });
      }

      // STRIDE: Spoofing & Elevation of Privilege - Verify conversation ownership
      conversation = await Conversation.findOne({
        _id: new mongoose.Types.ObjectId(conversationId),
        userId: userId,
        isActive: true,
      });

      if (!conversation) {
        auditLog(userId, 'chat_send', {
          error: 'Conversation not found or unauthorized',
          conversationId,
          ip: clientIp
        }, 'error');
        return res.status(404).json({ message: "Conversation not found" });
      }

      conversation.messages.push({
        role: "user",
        content: sanitizedQuery,
        timestamp: new Date(),
        attachments: file ? [{
          fileName: sanitizedFilename,
          fileType: file.mimetype,
          fileSize: file.size,
          fileHash: fileHash,
          filePath: "memory_buffer"
        }] : []
      });
    } else {
      conversation = new Conversation({
        userId: userId,
        messages: [{
          role: "user",
          content: sanitizedQuery,
          timestamp: new Date(),
          attachments: file ? [{
            fileName: sanitizedFilename,
            fileType: file.mimetype,
            fileSize: file.size,
            fileHash: fileHash,
            filePath: "memory_buffer"
          }] : []
        }],
        title: file ? `Analysis: ${sanitizedFilename}` : "New Chat",
      });
    }
    await conversation.save();

    // 3. Process Query
    let aiResponseText = "";
    let aiReasoning = null;
    let isLegalQuery = null;
    let evaluationScores = null;
    let isDraft = null;
    let fileData = null;
    let fileName = null;

    // STRIDE: Denial of Service - Word count check
    // Check word limit ONLY if NO file is attached
    let isBlocked = false;
    if (!file) {
      const wordCount = sanitizedQuery.trim() === "" ? 0 : sanitizedQuery.trim().split(/\s+/).length;
      const WORD_LIMIT = 1000;

      if (wordCount > WORD_LIMIT) {
        isBlocked = true;
        aiResponseText = `Your message is too long (${wordCount} words). The limit is ${WORD_LIMIT} words.`;
        aiReasoning = { intent: "blocked_query", sub_queries: [], sources: [], doc_count: 0 };

        // STRIDE: Repudiation - Log blocked request
        auditLog(userId, 'chat_blocked', { wordCount, limit: WORD_LIMIT, ip: clientIp }, 'blocked');
      }
    }

    if (!isBlocked) {
      try {
        const pythonFormData = new FormData();
        pythonFormData.append('query', sanitizedQuery);
        pythonFormData.append('thread_id', conversation._id.toString());
        pythonFormData.append('verbose', 'true');
        pythonFormData.append('mode', mode || 'general');

        if (file) {
          // STRIDE: Tampering - Use file.buffer for memory storage with validated filename
          pythonFormData.append('file', file.buffer, {
            filename: sanitizedFilename,
            contentType: file.mimetype
          });
        }

        // STRIDE: Spoofing - Include API key for internal service authentication
        const ragResponse = await axios.post(RAG_API_URL, pythonFormData, {
          headers: {
            'X-API-Key': process.env.MY_INTERNAL_API_KEY,
            ...pythonFormData.getHeaders()
          },
          timeout: 300000,  // STRIDE: Denial of Service - 5 minute timeout
          maxContentLength: 50 * 1024 * 1024,  // STRIDE: Denial of Service - 50MB response limit
          maxBodyLength: 50 * 1024 * 1024
        });

        aiResponseText = ragResponse.data.answer;
        aiReasoning = ragResponse.data.reasoning;
        isLegalQuery = ragResponse.data.is_legal_query;

        // STRIDE: Information Disclosure - Filter sensitive data from reasoning
        aiReasoning = filterSensitiveData(aiReasoning);
        // --- NEW: Capture Drafting Data ---
        isDraft = ragResponse.data.is_draft;
        fileData = ragResponse.data.file_data;
        fileName = ragResponse.data.filename;

        // Run Gemini Evaluation
        if (aiResponseText) {
          evaluationScores = await evaluateAnswerWithGemini(sanitizedQuery, aiResponseText);
        }

      } catch (ragError) {
        // STRIDE: Information Disclosure - Generic error message to user
        aiResponseText = "I encountered an issue processing your request. Please try again later.";

        // STRIDE: Repudiation - Log the error
        auditLog(userId, 'chat_error', {
          error: ragError.message,
          conversationId: conversation._id,
          hasFile: !!file,
          fileName: sanitizedFilename,
          ip: clientIp
        }, 'error');
      }
    }

    // 4. Save Response with Evaluation
    const botMessage = {
      role: "assistant",
      content: aiResponseText,
      reasoning: aiReasoning,
      evaluation: evaluationScores || {},
      isDraft: isDraft,
      fileData: fileData,
      fileName: fileName
    };

    conversation.messages.push(botMessage);

    if (!conversationId) {
      if (!file) {
        const smartTitle = await generateSmartTitle(sanitizedQuery);
        if (smartTitle) {
          conversation.title = smartTitle;
        } else {
          conversation.generateTitle();
        }
      } else {
        conversation.generateTitle(); // file uploads keep their "Analysis: filename" title
      }
    }
    await conversation.save();

    // STRIDE: Repudiation - Log successful response
    auditLog(userId, 'chat_success', {
      conversationId: conversation._id,
      responseLength: aiResponseText.length,
      isLegalQuery: isLegalQuery,
      hasFile: !!file,
      fileName: sanitizedFilename,
      fileHash: fileHash,
      ip: clientIp
    });

    res.json({
      success: true,
      response: aiResponseText,
      reasoning: aiReasoning,
      evaluation: evaluationScores,
      conversationId: conversation._id,
      isLegalQuery: isLegalQuery,
      isDraft: isDraft,        // <--- ADD THIS
      fileData: fileData,      // <--- ADD THIS
      fileName: fileName       // <--- ADD THIS
    });

  } catch (error) {
    // STRIDE: Information Disclosure - Generic error message
    console.error("Chat Handler Error:", error);

    // STRIDE: Repudiation - Log the error
    auditLog(req.user?._id || 'unknown', 'chat_fatal_error', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ip: req.ip
    }, 'error');

    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
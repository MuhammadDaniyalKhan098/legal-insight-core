/**
 * Server Entry Point
 *
 * Initializes Express server with middleware, routes, and database connection.
 * Includes security headers via Helmet and CORS configuration.
 *
 * @module __server__
 */
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import conversationRoutes from "./routes/conversations.js";
import feedbackRoutes from "./routes/feedback.js";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/admin.js";
import communityRoutes from "./routes/community.js";
import newsRoutes from "./routes/news.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const DEFAULT_PORT = 5000;
const REQUEST_SIZE_LIMIT = "10mb";
const PORT = process.env.PORT || DEFAULT_PORT;
const app = express();

// // For whitelisting IPs in rate limiters, we need to trust the proxy (if behind one) to get correct IPs
// app.set('trust proxy', true); // Remove Later




// Security Middleware -- Helmet: Sets various HTTP headers for security
app.use(
helmet({
    contentSecurityPolicy: false, // Disable CSP for now (can enable later if needed)
    crossOriginEmbedderPolicy: false, // Disable for development (enable in production)
  })
);

// Middleware setup
app.use(cors());
app.use(express.json({ limit: REQUEST_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_SIZE_LIMIT }));

// --- Routes ---
/**
 * Authentication routes: /api/users/*
 * Handles registration, login, email verification, profile.
 */
app.use("/api/users", authRoutes);

/**
 * Chat routes: /api/chat/*
 * Handles AI chat interactions and model information
 */
app.use("/api/chat", chatRoutes);

/**
 * Conversation routes: /api/conversations/*
 * Handles conversation CRUD operations
 */
app.use("/api/conversations", conversationRoutes);

/**
 * Feedback routes: /api/feedback/*
 * Handles user feedback on responses and conversation ratings
 */
app.use("/api/feedback", feedbackRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/news", newsRoutes);
connectDB();

app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);
  console.log(`Security headers enabled with Helmet`);
});
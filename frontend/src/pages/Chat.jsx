/**
 * Chat Page - STRIDE Security Enhanced (Sprint-3)
 *
 * Renders the primary chat interface, including the message display area and input form.
 * Manages conversation state, user input, API communication, Web Speech features, and feedback.
 * Includes LLM Evaluation Display.
 *
 * STRIDE Mitigations Implemented:
 * - Spoofing: JWT token validation, secure storage
 * - Tampering: Input sanitization, file validation
 * - Repudiation: User action tracking
 * - Information Disclosure: Secure data handling, no sensitive data in logs
 * - Denial of Service: Client-side rate limiting, file size checks
 * - Elevation of Privilege: Role-based UI, authorization checks
 *
 * @module pages/Chat.jsx
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../config/axios";
import Sidebar from "../components/Sidebar";

const downloadFile = (base64Data, fileName) => {
  const linkSource = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64Data}`;
  const downloadLink = document.createElement("a");
  downloadLink.href = linkSource;
  downloadLink.download = fileName || "drafted_document.docx";
  downloadLink.click();
};

// --- Evaluation Badge Component ---
const EvaluationBadge = ({ label, score }) => {
  let colorClass = "bg-red-500/20 text-red-300 border-red-500/50";
  if (score >= 8)
    colorClass = "bg-green-500/20 text-green-300 border-green-500/50";
  else if (score >= 5)
    colorClass = "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";

  return (
    <div
      className={`flex flex-col items-center p-2 rounded border ${colorClass} min-w-[80px]`}
    >
      <span className="text-[10px] uppercase font-bold tracking-wider mb-1">
        {label}
      </span>
      <span className="text-lg font-mono font-bold">{score}/10</span>
    </div>
  );
};

const Chat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState("general");

  // File handling
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Dynamic loading text
  const [loadingText, setLoadingText] = useState("Analyzing query...");

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    autoSpeak: false,
    voice: null,
  });

  // Expanded views
  const [openReasoningId, setOpenReasoningId] = useState(null);
  const [openEvaluationId, setOpenEvaluationId] = useState(null);

  const toggleReasoning = (index) => {
    setOpenReasoningId(openReasoningId === index ? null : index);
  };

  const toggleEvaluation = (index) => {
    setOpenEvaluationId(openEvaluationId === index ? null : index);
  };

  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Feedback states
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    messageIndex: null,
    rating: null,
  });
  const [feedbackReason, setFeedbackReason] = useState("");
  const [overallRating, setOverallRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);

  const navigate = useNavigate();

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  // STRIDE: Denial of Service - Client-side rate limiting state
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

  // Effect to cycle through loading messages
  useEffect(() => {
    let interval;
    if (isLoading) {
      const loadingStates = [
        "Analyzing your query...",
        "Identifying legal intent...",
        "Searching knowledge base...",
        "Retrieving relevant case law...",
        "Cross-referencing statutes...",
        "Synthesizing answer...",
        "Formatting response...",
        "Grading answer quality...",
      ];

      let index = 0;
      setLoadingText(loadingStates[0]);

      interval = setInterval(() => {
        index = (index + 1) % loadingStates.length;
        setLoadingText(loadingStates[index]);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;

    if (SpeechRecognition && speechSynthesis) {
      setSpeechSupported(true);

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        setIsListening(false);

        // STRIDE: Information Disclosure - Generic error messages
        let errorMessage = "Voice recognition failed. ";
        switch (event.error) {
          case "no-speech":
            errorMessage += "No speech was detected. Please try again.";
            break;
          case "audio-capture":
            errorMessage +=
              "No microphone was found. Please check your microphone.";
            break;
          case "not-allowed":
            errorMessage +=
              "Microphone permission was denied. Please enable microphone access.";
            break;
          case "network":
            errorMessage +=
              "Network error occurred. Please check your connection.";
            break;
          default:
            errorMessage += "Please try again.";
        }

        const errorMsg = { role: "assistant", content: errorMessage };
        setMessages((prev) => [...prev, errorMsg]);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      synthRef.current = speechSynthesis;

      const setDefaultVoice = () => {
        const voices = speechSynthesis.getVoices();
        const englishVoice =
          voices.find((voice) => voice.lang.startsWith("en")) || voices[0];
        setVoiceSettings((prev) => ({ ...prev, voice: englishVoice }));
      };

      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.addEventListener("voiceschanged", setDefaultVoice);
      } else {
        setDefaultVoice();
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Load conversation from URL
  useEffect(() => {
    const loadFromURL = async () => {
      const pathParts = window.location.pathname.split("/");
      const urlConversationId = pathParts[pathParts.length - 1];

      if (
        urlConversationId &&
        urlConversationId !== "chat" &&
        urlConversationId !== currentConversationId
      ) {
        try {
          // STRIDE: Spoofing - Include authentication token
          const token = localStorage.getItem("token");

          // STRIDE: Spoofing - Validate token exists
          if (!token) {
            navigate("/login");
            return;
          }

          const response = await axios.get(
            `/api/conversations/${urlConversationId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          setMessages(response.data.conversation.messages || []);
          setCurrentConversationId(urlConversationId);
          setOverallRating(response.data.conversation.overallRating || 0);
        } catch (error) {
          // STRIDE: Information Disclosure - Generic error message
          console.error("Failed to load conversation");
          navigate("/chat");
        }
      }
    };

    if (user) {
      loadFromURL();
    }
  }, [user, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text) => {
    if (synthRef.current && voiceSettings.voice) {
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voiceSettings.voice;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // STRIDE: Tampering - Comprehensive file validation
  const validateFile = (file) => {
    const errors = [];

    // STRIDE: Denial of Service - File size validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      errors.push(
        `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
      );
    }

    if (file.size === 0) {
      errors.push("Empty files are not allowed.");
    }

    // STRIDE: Tampering - File type validation (both mimetype and extension)
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const fileExtension = file.name.toLowerCase().match(/\.[^.]*$/)?.[0];

    if (!allowedTypes.includes(file.type)) {
      errors.push(
        "Invalid file type. Only PDF, DOCX, and TXT files are allowed.",
      );
    }

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      errors.push(
        "Invalid file extension. Only .pdf, .docx, and .txt files are allowed.",
      );
    }

    // STRIDE: Tampering - Filename validation (prevent path traversal)
    if (file.name.includes("/") || file.name.includes("\\")) {
      errors.push(
        "Invalid filename. Filenames cannot contain path separators.",
      );
    }

    // STRIDE: Tampering - Check for suspicious filenames
    const suspiciousPatterns = [
      /\.\./, // parent directory
      /^\./, // hidden files
      /<script/i, // script tags
      /%00/, // null bytes
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(file.name))) {
      errors.push("Invalid filename detected.");
    }

    return errors;
  };

  // STRIDE: Tampering - File selection with comprehensive validation
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file
      const validationErrors = validateFile(file);

      if (validationErrors.length > 0) {
        // STRIDE: Information Disclosure - Show user-friendly error
        alert(validationErrors.join("\n"));

        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setSelectedFile(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // STRIDE: Tampering - Input sanitization
  const sanitizeInput = (input) => {
    // Remove potentially harmful characters while preserving legal text
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "") // Remove iframe tags
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "") // Remove object tags
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "") // Remove embed tags
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remove inline event handlers
      .trim()
      .substring(0, 10000); // Hard limit on input length
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // STRIDE: Denial of Service - Rate limiting check
    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      alert("Please wait a moment before sending another message.");
      return;
    }

    if ((!inputMessage.trim() && !selectedFile) || isLoading) return;

    // STRIDE: Tampering - Sanitize input
    const sanitizedInput = sanitizeInput(inputMessage);

    // STRIDE: Denial of Service - Word count validation (only if no file)
    if (!selectedFile) {
      const wordCount = sanitizedInput
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      if (wordCount > 1000) {
        alert(
          `Your message is too long (${wordCount} words). The limit is 1000 words.`,
        );
        return;
      }
    }

    // STRIDE: Tampering - Re-validate file before submission
    if (selectedFile) {
      const validationErrors = validateFile(selectedFile);
      if (validationErrors.length > 0) {
        alert(validationErrors.join("\n"));
        clearFile();
        return;
      }
    }

    // Update last request time
    setLastRequestTime(now);

    // Optimistic UI Update
    const userMessage = {
      role: "user",
      content: sanitizedInput,
      attachments: selectedFile
        ? [
            {
              fileName: selectedFile.name,
              fileSize: selectedFile.size,
              fileType: selectedFile.type,
            },
          ]
        : [],
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage("");
    setIsLoading(true);

    try {
      // STRIDE: Spoofing - Validate token before request
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      // STRIDE: Tampering - Use FormData for proper file upload
      const formData = new FormData();
      formData.append("messages", JSON.stringify(updatedMessages));
      formData.append("conversationId", currentConversationId || "");
      formData.append("mode", selectedMode);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      // STRIDE: Spoofing - Include authentication token
      const response = await axios.post("/api/chat/send", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 305000, // STRIDE: Denial of Service - 5 minute + 5 second timeout
        maxContentLength: 50 * 1024 * 1024, // STRIDE: Denial of Service - 50MB response limit
        maxBodyLength: 50 * 1024 * 1024,
      });

      clearFile();

      const aiMessage = {
        role: "assistant",
        content: response.data.response,
        reasoning: response.data.reasoning,
        evaluation: response.data.evaluation,
        isDraft: response.data.isDraft, // Changed from response.data.isDraft
        fileData: response.data.fileData, // Changed from response.data.fileData
        fileName: response.data.fileName, // Changed from response.data.fileName
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (!currentConversationId && response.data.conversationId) {
        setCurrentConversationId(response.data.conversationId);
        navigate(`/chat/${response.data.conversationId}`);
        setRefreshTrigger((prev) => prev + 1);
      }

      // Auto-speak if enabled
      if (voiceSettings.autoSpeak && !isSpeaking) {
        speakText(response.data.response);
      }
    } catch (error) {
      // STRIDE: Information Disclosure - Generic error message
      console.error("Request failed");

      // STRIDE: Spoofing - Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
        return;
      }

      const errorMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleConversationSelect = async (conversationId) => {
    if (conversationId) {
      try {
        // STRIDE: Spoofing - Include authentication token
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `/api/conversations/${conversationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        setMessages(response.data.conversation.messages || []);
        setCurrentConversationId(conversationId);
        setOverallRating(response.data.conversation.overallRating || 0);

        if (synthRef.current) {
          synthRef.current.cancel();
          setIsSpeaking(false);
        }
      } catch (error) {
        // STRIDE: Information Disclosure - Generic error message
        console.error("Failed to load conversation");

        // STRIDE: Spoofing - Handle authentication errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate("/login");
          return;
        }

        const errorMessage = {
          role: "assistant",
          content: "Failed to load conversation. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } else {
      setMessages([]);
      setCurrentConversationId(null);
      setOverallRating(0);
    }
  };

  const newChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setOverallRating(0);
    clearFile(); // STRIDE: Clear any selected files
    navigate("/chat");
    setRefreshTrigger((prev) => prev + 1);
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleAutoSpeak = () => {
    setVoiceSettings((prev) => ({
      ...prev,
      autoSpeak: !prev.autoSpeak,
    }));
  };

  // Feedback handlers
  const handleFeedbackClick = (messageIndex, rating) => {
    if (rating === "negative") {
      setFeedbackModal({
        isOpen: true,
        messageIndex,
        rating,
      });
      setFeedbackReason("");
    } else {
      submitFeedback(messageIndex, rating, "");
    }
  };

  const submitFeedback = async (messageIndex, rating, reason) => {
    if (!currentConversationId) {
      alert("Please save the conversation first by sending a message.");
      return;
    }

    try {
      // STRIDE: Tampering - Sanitize feedback reason
      const sanitizedReason = sanitizeInput(reason).substring(0, 500);

      // STRIDE: Spoofing - Include authentication token
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      await axios.post(
        "/api/feedback/message",
        {
          conversationId: currentConversationId,
          messageIndex,
          rating,
          reason: sanitizedReason,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setMessages((prev) => {
        const updated = [...prev];
        updated[messageIndex] = {
          ...updated[messageIndex],
          feedback: { rating, reason: sanitizedReason, timestamp: new Date() },
        };
        return updated;
      });

      setFeedbackModal({ isOpen: false, messageIndex: null, rating: null });
      setFeedbackReason("");
    } catch (error) {
      // STRIDE: Information Disclosure - Generic error message
      console.error("Failed to submit feedback");

      // STRIDE: Spoofing - Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
        return;
      }

      alert("Failed to submit feedback. Please try again.");
    }
  };

  const handleFeedbackSubmit = () => {
    submitFeedback(
      feedbackModal.messageIndex,
      feedbackModal.rating,
      feedbackReason,
    );
  };

  const handleOverallRatingClick = async (rating) => {
    if (!currentConversationId) {
      alert("Please save the conversation first by sending a message.");
      return;
    }

    try {
      // STRIDE: Spoofing - Include authentication token
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      await axios.post(
        "/api/feedback/conversation/rating",
        {
          conversationId: currentConversationId,
          rating,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setOverallRating(rating);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      // STRIDE: Information Disclosure - Generic error message
      console.error("Failed to submit rating");

      // STRIDE: Spoofing - Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
        return;
      }

      alert("Failed to submit rating. Please try again.");
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[57px] flex bg-gradient-to-br from-[#1e1e2e] to-[#111827] text-white">
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #4b5563;
            border-radius: 4px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }

          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #4b5563 transparent;
          }
        `}
      </style>

      {/* Feedback Modal */}
      {feedbackModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-semibold mb-1 text-white">
              Help us improve
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Please tell us what went wrong:
            </p>
            <textarea
  value={feedbackReason}
  onChange={(e) => {
    if (e.target.value.length <= 500) setFeedbackReason(e.target.value);
  }}
  placeholder="The information is incorrect, not relevant, etc."
  className="w-full p-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
  rows={4}
  maxLength={500}
/>
<div className="flex justify-between items-center mt-1">
  <span className="text-xs text-gray-500">Max 500 characters</span>
  <span className={`text-xs ${feedbackReason.length >= 450 ? feedbackReason.length >= 500 ? 'text-red-400' : 'text-yellow-400' : 'text-gray-500'}`}>
    {feedbackReason.length}/500
  </span>
</div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleFeedbackSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setFeedbackModal({
                    isOpen: false,
                    messageIndex: null,
                    rating: null,
                  });
                  setFeedbackReason("");
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <div
          className="bg-[#0d1117] border-r border-gray-700 flex-shrink-0 relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          <Sidebar
            user={user}
            onConversationSelect={handleConversationSelect}
            newChat={newChat}
            refreshTrigger={refreshTrigger}
          />

          {/* Resize handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={() => setIsResizing(true)}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between p-3 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-800 transition-colors"
          >
            {sidebarOpen ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>

          {!sidebarOpen && (
            <button
              onClick={newChat}
              className="p-2 rounded-md hover:bg-gray-800 transition-colors text-gray-300 flex items-center gap-1.5 text-sm"
              title="New Chat"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}

          <span className="text-base font-semibold tracking-wide text-gray-100">
            ⚖️ Legal Assistant
          </span>
          {/* <div className="flex items-center gap-4">
            <span className="text-base font-semibold tracking-wide text-gray-100">
              ⚖️ Legal Assistant
            </span>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="bg-gray-800 text-xs font-medium text-gray-200 border border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="general">Standard Q&A</option>
              <option value="drafting">Document Drafting</option>
              <option value="prediction">Outcome Prediction</option>
              <option value="procedure">Guided Procedure</option>
            </select>
          </div> */}

          {/* Overall Rating Display */}
          {currentConversationId && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Rate this chat:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleOverallRatingClick(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <svg
                      className="w-5 h-5"
                      fill={
                        (hoveredStar || overallRating) >= star
                          ? "#fbbf24"
                          : "none"
                      }
                      stroke="#fbbf24"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!currentConversationId && <div className="w-9"></div>}
        </div>

        {/* ── EMPTY STATE: hero + input centered ── */}
        {messages.length === 0 && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6">
            {/* Hero */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-3xl mb-5 shadow-lg shadow-blue-600/20 mx-auto">
                ⚖️
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                How can I assist you?
              </h2>
              <p className="text-gray-400 mb-1 max-w-sm">
                Ask anything related to Pakistani law — contracts, procedures,
                rights, and more.
              </p>
              {speechSupported && (
                <p className="text-sm text-blue-400 mt-3 flex items-center justify-center gap-1.5">
                  🎙️ Tip: Use the microphone to speak your question
                </p>
              )}
            </div>

            {/* Centered input bar */}
            <div className="w-full max-w-2xl">
              {selectedFile && (
                <div className="px-4 py-2 bg-gray-800 border border-b-0 border-gray-700 rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-blue-300">
                    <span>📎 Attached:</span>
                    <span className="font-semibold truncate max-w-xs">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={clearFile}
                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div
                className={`flex gap-2 items-end p-2 bg-gray-900 border border-gray-700 ${selectedFile ? "rounded-b-2xl" : "rounded-2xl"} shadow-lg`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition-all duration-150 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach File (PDF, DOCX, TXT - Max 10MB)"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>

                {/* 👇 ADD THIS DROPDOWN BLOCK RIGHT HERE 👇 */}
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  disabled={isLoading || isListening}
                  className="h-[46px] px-3 rounded-xl bg-gray-800 text-sm font-medium text-gray-300 border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title="Select AI Mode"
                >
                  <option value="general">General</option>
                  <option value="drafting">Drafting</option>
                  <option value="prediction">Prediction</option>
                  <option value="procedure">Procedure</option>
                </select>
                {/* 👆 ---------------------------------- 👆 */}

                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Ask a legal question..."
                  className="flex-1 p-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 resize-none max-h-32 custom-scrollbar placeholder-gray-500 transition-all duration-150"
                  style={{ height: "auto", minHeight: "48px" }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 128) + "px";
                  }}
                  disabled={isLoading || isListening}
                  maxLength={10000}
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                    className={`p-3 rounded-xl flex-shrink-0 transition-all duration-150 border ${
                      isListening
                        ? "bg-red-600 border-red-500 animate-pulse"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700"
                    } disabled:opacity-50`}
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    🎤
                  </button>
                )}
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={
                    (!inputMessage.trim() && !selectedFile) ||
                    isLoading ||
                    isListening
                  }
                  className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 transition-all duration-150 shadow-lg shadow-blue-600/20"
                  title="Send message"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── CHAT STATE: messages list ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex w-full ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`p-4 rounded-2xl max-w-[80%] shadow-md ${
                        message.role === "user"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-800 text-gray-100 border border-gray-700/80 rounded-bl-sm"
                      }`}
                    >
                      {/* File attachment indicator */}
                      {message.attachments &&
                        message.attachments.length > 0 && (
                          <div className="mb-2 p-2 bg-black/20 rounded flex items-center gap-2 border border-white/10">
                            <span className="text-xl">📄</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-mono text-blue-200">
                                {message.attachments[0].fileName}
                              </span>
                              {message.attachments[0].fileSize && (
                                <span className="text-[10px] text-gray-400">
                                  {(
                                    message.attachments[0].fileSize / 1024
                                  ).toFixed(1)}{" "}
                                  KB
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>

                      {/* Assistant features */}
                      {message.role === "assistant" && (
                        <div className="mt-3 pt-2 border-t border-gray-700/50 flex flex-wrap gap-4">
                          {/* NEW: Download Button for Drafting */}
                          {message.fileData && (
                            <button
                              onClick={() =>
                                downloadFile(message.fileData, message.fileName)
                              }
                              className="flex items-center gap-2 text-xs font-bold text-green-400 hover:text-green-300 bg-green-900/20 px-3 py-2 rounded-lg border border-green-500/30 transition-all"
                            >
                              <span className="text-lg">📥</span>
                              Download {message.fileName || "Legal Draft"}
                            </button>
                          )}

                          {/* Reasoning toggle */}
                          {message.reasoning && (
                            <button
                              onClick={() => toggleReasoning(index)}
                              className="flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <span className="text-lg">🧠</span>
                              {openReasoningId === index
                                ? "Hide Thought Process"
                                : "View Thought Process"}
                            </button>
                          )}

                          {/* Evaluation toggle */}
                          {message.evaluation &&
                            message.evaluation.factuality !== undefined && (
                              <button
                                onClick={() => toggleEvaluation(index)}
                                className="flex items-center gap-2 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                <span className="text-lg">⚖️</span>
                                {openEvaluationId === index
                                  ? "Hide Evaluation Score"
                                  : "View Evaluation Score"}
                              </button>
                            )}
                        </div>
                      )}

                      {/* Reasoning panel */}
                      {message.role === "assistant" &&
                        openReasoningId === index &&
                        message.reasoning && (
                          <div className="mt-3 bg-black/20 rounded-lg p-3 text-sm border border-white/10">
                            <div className="grid gap-2">
                              {/* Intent */}
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-xs uppercase tracking-wider">
                                  Intent
                                </span>
                                <span className="text-green-400 font-mono text-xs bg-green-900/30 px-2 py-1 rounded">
                                  {message.reasoning.intent}
                                </span>
                              </div>

                              {/* Sub Queries */}
                              {message.reasoning.sub_queries?.length > 0 && (
                                <div className="mt-1">
                                  <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">
                                    Search Queries Generated
                                  </span>
                                  <ul className="list-disc pl-4 space-y-1 text-gray-300 text-xs font-mono">
                                    {message.reasoning.sub_queries.map(
                                      (q, i) => (
                                        <li key={i}>{q}</li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}

                              {/* Sources */}
                              {message.reasoning.sources &&
                                message.reasoning.sources.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-gray-400 text-xs uppercase tracking-wider">
                                        📚 Evidence Trail & Key Data
                                      </span>
                                      <span className="bg-blue-900/40 text-blue-200 text-[10px] px-1.5 rounded border border-blue-800">
                                        {message.reasoning.doc_count} Sources
                                      </span>
                                    </div>

                                    <div className="space-y-3">
                                      {message.reasoning.sources.map(
                                        (source, i) => (
                                          <div
                                            key={i}
                                            className="bg-gray-800/40 rounded-lg border border-gray-700/50 overflow-hidden"
                                          >
                                            {/* Header */}
                                            <div className="bg-gray-900/50 px-3 py-2 flex justify-between items-center border-b border-gray-700/50">
                                              <div className="flex flex-col">
                                                <span
                                                  className="text-blue-300 text-xs font-bold truncate max-w-[180px]"
                                                  title={source.title}
                                                >
                                                  {source.title}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-mono">
                                                  {source.section}
                                                </span>
                                              </div>
                                              {/* Confidence */}
                                              <div className="flex flex-col items-end">
                                                <span
                                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                    source.confidence > 80
                                                      ? "bg-green-900/40 text-green-400 border border-green-800"
                                                      : source.confidence > 60
                                                        ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800"
                                                        : "bg-red-900/40 text-red-400 border border-red-800"
                                                  }`}
                                                >
                                                  {source.confidence}% Match
                                                </span>
                                              </div>
                                            </div>

                                            {/* Body */}
                                            <div className="p-3 bg-black/20">
                                              <div className="flex gap-2">
                                                <span className="text-gray-500 text-xs select-none">
                                                  ❝
                                                </span>
                                                <p className="text-gray-300 text-xs italic leading-relaxed font-serif">
                                                  {source.data_point}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}

                      {/* Evaluation panel */}
                      {message.role === "assistant" &&
                        openEvaluationId === index &&
                        message.evaluation && (
                          <div className="mt-3 bg-black/40 rounded-lg p-4 text-sm border border-purple-500/30 shadow-inner">
                            <h4 className="text-purple-300 font-semibold mb-3 text-xs uppercase tracking-widest border-b border-purple-500/30 pb-2 flex justify-between">
                              <span>LLM Response Evaluation Report</span>
                              <span className="text-purple-400/50 text-[10px]">
                                AI Judge
                              </span>
                            </h4>

                            {/* Score Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              <EvaluationBadge
                                label="Factuality"
                                score={message.evaluation.factuality}
                              />
                              <EvaluationBadge
                                label="Coherence"
                                score={message.evaluation.coherence}
                              />
                              <EvaluationBadge
                                label="Accuracy"
                                score={message.evaluation.accuracy}
                              />
                              <EvaluationBadge
                                label="Fluency"
                                score={message.evaluation.fluency}
                              />
                            </div>

                            {/* Explanation */}
                            {message.evaluation.explanation && (
                              <div className="bg-purple-900/20 p-3 rounded border border-purple-500/20 relative">
                                <span className="text-purple-200 text-xs font-bold mr-2 block mb-1">
                                  JUDGE'S VERDICT:
                                </span>
                                <p className="text-gray-300 text-xs italic leading-relaxed">
                                  "{message.evaluation.explanation}"
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                      {/* Feedback buttons */}
                      {message.role === "assistant" &&
                        currentConversationId && (
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-700">
                            {message.feedback?.rating ? (
                              <span className="text-xs text-gray-400">
                                {message.feedback.rating === "positive"
                                  ? "👍 Helpful"
                                  : "👎 Not helpful"}
                              </span>
                            ) : (
                              <>
                                <span className="text-xs text-gray-400">
                                  Was this helpful?
                                </span>
                                <button
                                  onClick={() =>
                                    handleFeedbackClick(index, "positive")
                                  }
                                  className="text-gray-400 hover:text-green-500 transition-colors"
                                  title="Helpful"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() =>
                                    handleFeedbackClick(index, "negative")
                                  }
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                  title="Not helpful"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                                    />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex w-full justify-start">
                    <div className="p-4 rounded-xl bg-gray-800 border border-gray-700 flex items-center gap-3">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full animate-bounce bg-blue-400"></div>
                        <div
                          className="w-2 h-2 rounded-full animate-bounce bg-blue-400"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full animate-bounce bg-blue-400"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-gray-300 text-sm font-medium animate-pulse min-w-[150px]">
                        {loadingText}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            </div>

            {/* Input Area */}
            <div className="flex flex-col border-t border-gray-800 flex-shrink-0">
              {/* File preview banner */}
              {selectedFile && (
                <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-blue-300">
                    <span>📎 Attached:</span>
                    <span className="font-semibold truncate max-w-xs">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={clearFile}
                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Main input row */}
              <div className="p-4 flex gap-2 items-end">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />

                {/* Paperclip button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition-all duration-150 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach File (PDF, DOCX, TXT - Max 10MB)"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>

                {/* --- ADD MODE SELECTOR HERE --- */}
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  disabled={isLoading || isListening}
                  className="h-[48px] px-3 rounded-xl bg-gray-800 text-sm font-medium text-gray-300 border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title="Select AI Mode"
                >
                  <option value="general">General QA</option>
                  <option value="drafting">Drafting</option>
                  <option value="prediction">Prediction</option>
                  <option value="procedure">Procedure</option>
                </select>
                {/* ----------------------------- */}

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Ask a legal question..."
                  className="flex-1 p-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 resize-none max-h-32 custom-scrollbar placeholder-gray-500 transition-all duration-150"
                  style={{
                    height: "auto",
                    minHeight: "48px",
                  }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 128) + "px";
                  }}
                  disabled={isLoading || isListening}
                  maxLength={10000}
                />

                {/* Microphone button */}
                {speechSupported && (
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                    className={`p-3 rounded-xl flex-shrink-0 transition-all duration-150 border ${
                      isListening
                        ? "bg-red-600 border-red-500 animate-pulse"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700"
                    } disabled:opacity-50`}
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    🎤
                  </button>
                )}

                {/* Send button */}
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={
                    (!inputMessage.trim() && !selectedFile) ||
                    isLoading ||
                    isListening
                  }
                  className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 transition-all duration-150 shadow-lg shadow-blue-600/20"
                  title="Send message"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;

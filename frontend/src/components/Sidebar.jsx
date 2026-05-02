import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../config/axios";
import jsPDF from "jspdf";

const Sidebar = ({
  user,
  currentConversationId,
  onConversationSelect,
  refreshTrigger,
}) => {
  const [conversations, setConversations] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const fetchConversations = async () => {
    try {
      const response = await axios.get("/api/conversations", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, refreshTrigger]);

  const handleConversationClick = (conversationId) => {
    if (renamingId === conversationId) return;
    onConversationSelect(conversationId);
    navigate(`/chat/${conversationId}`);
    setActiveMenu(null);
  };

  const newChat = () => {
    onConversationSelect(null);
    navigate("/chat");
    setActiveMenu(null);
  };

  const handleHome = () => {
    navigate("/");
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  // Delete conversation
  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation();

    if (window.confirm("Are you sure you want to delete this conversation?")) {
      try {
        await axios.delete(`/api/conversations/${conversationId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        fetchConversations();

        if (currentConversationId === conversationId) {
          navigate("/chat");
          onConversationSelect(null);
        }

        setActiveMenu(null);
      } catch (error) {
        console.error("Error deleting conversation:", error);
        alert("Failed to delete conversation. Please try again.");
      }
    }
  };

  // Export conversation as PDF
  const exportConversation = async (conversationId, e) => {
    e.stopPropagation();

    try {
      const response = await axios.get(`/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const conversation = response.data.conversation;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Helper: detect Urdu/Arabic script
      const containsUrdu = (text) =>
        /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

      // Helper: render Urdu text to image via Canvas, returns {imgData, imgHeight}
      const urduTextToImage = (text, widthPx = 500) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const fontSize = 16;
        const lineHeight = fontSize * 1.8;
        const padding = 10;

        // Measure and wrap text
        ctx.font = `${fontSize}px 'Noto Nastaliq Urdu', 'Arial Unicode MS', serif`;
        const words = text.split(" ");
        const lines = [];
        let currentLine = "";

        words.forEach((word) => {
          const testLine = currentLine ? currentLine + " " + word : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > widthPx - padding * 2 && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);

        const canvasHeight = lines.length * lineHeight + padding * 2;
        canvas.width = widthPx;
        canvas.height = canvasHeight;

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, widthPx, canvasHeight);

        // Draw RTL text
        ctx.font = `${fontSize}px 'Noto Nastaliq Urdu', 'Arial Unicode MS', serif`;
        ctx.fillStyle = "#000000";
        ctx.textAlign = "right";
        ctx.direction = "rtl";

        lines.forEach((line, i) => {
          ctx.fillText(line, widthPx - padding, padding + (i + 1) * lineHeight);
        });

        return {
          imgData: canvas.toDataURL("image/png"),
          imgHeight: (canvasHeight / widthPx) * (pageWidth - 2 * margin),
        };
      };

      // --- Title ---
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(conversation.title, margin, yPosition);
      yPosition += 10;

      // --- Export date ---
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Exported: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 10;

      // --- Overall rating ---
      if (conversation.overallRating > 0) {
        doc.text(
          `Overall Rating: ${conversation.overallRating}/5 stars`,
          margin,
          yPosition,
        );
        yPosition += 15;
      } else {
        yPosition += 5;
      }

      doc.setTextColor(0);

      // --- Messages ---
      for (const message of conversation.messages) {
        if (yPosition > pageHeight - margin - 20) {
          doc.addPage();
          yPosition = margin;
        }

        // Message header
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const header = message.role === "user" ? "You:" : "AI Assistant:";
        doc.text(header, margin, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        if (containsUrdu(message.content)) {
          // Render Urdu as canvas image
          const canvasWidthPx = 500;
          const { imgData, imgHeight } = urduTextToImage(
            message.content,
            canvasWidthPx,
          );
          const imgWidthMM = pageWidth - 2 * margin;

          if (yPosition + imgHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }

          doc.addImage(
            imgData,
            "PNG",
            margin,
            yPosition,
            imgWidthMM,
            imgHeight,
          );
          yPosition += imgHeight + 3;
        } else {
          // Regular Latin text
          const lines = doc.splitTextToSize(
            message.content,
            pageWidth - 2 * margin,
          );
          lines.forEach((line) => {
            if (yPosition > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(line, margin, yPosition);
            yPosition += 5;
          });
        }

        // Feedback if exists
        if (message.feedback?.rating) {
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(
            `Feedback: ${message.feedback.rating === "positive" ? "Positive" : "Negative"
            }${message.feedback.reason ? " - " + message.feedback.reason : ""}`,
            margin,
            yPosition,
          );
          yPosition += 5;
          doc.setTextColor(0);
        }

        yPosition += 5;
      }

      // --- Save PDF ---
      const fileName = `${conversation.title
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")}.pdf`;
      doc.save(fileName);

      setActiveMenu(null);
    } catch (error) {
      console.error("Export error:", error);
      alert(`Error: ${error.message}\n\nCheck console for details.`);
    }
  };

  // Start renaming
  const startRename = (conversationId, currentTitle, e) => {
    e.stopPropagation();
    setRenamingId(conversationId);
    setNewTitle(currentTitle);
    setActiveMenu(null);
  };

  // Save rename
  const saveRename = async (conversationId, e) => {
    e.stopPropagation();

    if (!newTitle.trim()) {
      alert("Title cannot be empty");
      return;
    }

    try {
      const response = await axios.patch(
        `/api/conversations/${conversationId}`,
        { title: newTitle.trim() },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      fetchConversations();
      setRenamingId(null);
      setNewTitle("");
    } catch (error) {
      // console.error("Error renaming conversation:", error);
      // alert(
      //   `Failed to rename conversation: ${
      //     error.response?.data?.message || error.message
      //   }`,
      // );
      console.error("Error renaming conversation:", error);
      // Match the exact string expected by the Test Case document
      alert(error.response?.data?.message || error.message);
    }
  };

  // Cancel rename
  const cancelRename = (e) => {
    e.stopPropagation();
    setRenamingId(null);
    setNewTitle("");
  };

  // Toggle menu
  const toggleMenu = (conversationId, e) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === conversationId ? null : conversationId);
  };

  // Close menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
      setShowUserMenu(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Render star rating
  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3 h-3 ${star <= rating ? "text-yellow-400 fill-current" : "text-gray-600"
              }`}
            fill={star <= rating ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-[#0d1117] flex flex-col">
      <style>
        {`
          /* Custom scrollbar for sidebar */
          .sidebar-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          
          .sidebar-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .sidebar-scrollbar::-webkit-scrollbar-thumb {
            background: #374151;
            border-radius: 3px;
          }
          
          .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #4b5563;
          }

          .sidebar-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #374151 transparent;
          }
        `}
      </style>

      {/* Header with New Chat button */}
      <div className="p-3 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={newChat}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white py-2.5 px-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
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
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 px-2 py-3 space-y-1 overflow-y-auto sidebar-scrollbar">
        {conversations.length === 0 ? (
          <div className="text-gray-500 text-xs text-center mt-8 px-4">
            No conversations yet
          </div>
        ) : (
          conversations.map((convo) => (
            <div
              key={convo._id}
              onClick={() => handleConversationClick(convo._id)}
              className={`group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${currentConversationId === convo._id
                  ? "bg-blue-600/10 border border-blue-500/20"
                  : "hover:bg-gray-800/70 border border-transparent"
                }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  {renamingId === convo._id ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveRename(convo._id, e);
                          } else if (e.key === "Escape") {
                            cancelRename(e);
                          }
                        }}
                        className="w-full bg-gray-700 text-white text-sm px-2 py-1 rounded border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="text-right text-[10px] text-gray-500 mt-0.5">
                        {newTitle.length}/60
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={(e) => saveRename(convo._id, e)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelRename}
                          className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 mb-1.5">
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                        <div className="text-sm font-normal text-gray-200 truncate flex-1">
                          {convo.title}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pl-6">
                        <div className="text-xs text-gray-500">
                          {new Date(convo.lastUpdated).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}
                        </div>
                        {convo.overallRating > 0 && (
                          <div className="flex items-center gap-1">
                            {renderStars(convo.overallRating)}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {renamingId !== convo._id && (
                  <button
                    onClick={(e) => toggleMenu(convo._id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded hover:bg-gray-700 flex-shrink-0"
                  >
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                )}
              </div>

              {activeMenu === convo._id && (
                <div className="absolute right-2 top-12 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]">
                  <button
                    onClick={(e) => startRename(convo._id, convo.title, e)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Rename
                  </button>
                  <button
                    onClick={(e) => exportConversation(convo._id, e)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export PDF
                  </button>
                  <div className="border-t border-gray-700 my-1"></div>
                  <button
                    onClick={(e) => deleteConversation(convo._id, e)}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* User Profile Section with Menu */}
      <div className="p-3 border-t border-gray-800 flex-shrink-0 relative">
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowUserMenu(!showUserMenu);
          }}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        >
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20 flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm ring-2 ring-blue-500/20">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-200 truncate">
              {user?.username}
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? "rotate-90" : ""
              }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>

        {/* User Menu Dropdown */}
        {showUserMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-30">
            <button
              onClick={handleHome}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home
            </button>
            <button
              onClick={handleProfile}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

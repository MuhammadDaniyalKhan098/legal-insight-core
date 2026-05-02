/**
 * Frontend Page: src/pages/admin/ConversationList.jsx
 */
import React, { useEffect, useState } from "react";
import axios from "../../config/axios";
import { Link } from "react-router-dom";
// REMOVED 'Loader' to prevent import crash. Using CSS spinner instead.
import {
  MessageSquare,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ConversationList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalConversations, setTotalConversations] = useState(0);

  useEffect(() => {
    fetchConversations();
  }, [page]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `/api/admin/conversations?page=${page}&limit=20`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      // Added safety checks with || [] and || 0
      setConversations(res.data.conversations || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalConversations(res.data.totalConversations || 0);
    } catch (error) {
      console.error("Error fetching conversations", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Global Chat Logs</h1>
        <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
          Total: {totalConversations}
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">
          Loading conversations...
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center text-gray-400">
          No active conversations found.
        </div>
      ) : (
        <div className="grid gap-4">
          {conversations.map((convo) => (
            <Link
              key={convo._id}
              to={`/admin/conversations/${convo._id}`}
              className="block bg-gray-800 p-5 rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-gray-750 transition-all group shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg truncate flex-1 pr-4 text-blue-100 group-hover:text-blue-400 transition-colors">
                  {convo.title || "Untitled Conversation"}
                </h3>
                <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-900/50 px-2 py-1 rounded border border-gray-700">
                  <Calendar size={12} />
                  {new Date(convo.lastUpdated).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <User size={14} />
                  <span className="text-gray-300 font-medium">
                    {convo.userId?.username || "Unknown"}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                    {convo.userId?.role || "N/A"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
  <MessageSquare size={14} />
  <span>{convo.messages?.length || 0} msgs</span>
</div>

{convo.overallRating > 0 && (
  <div className="flex items-center gap-1.5">
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= convo.overallRating
              ? "text-yellow-400"
              : "text-gray-600"
          }`}
          fill={star <= convo.overallRating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ))}
    </div>
    <span className="text-xs text-yellow-400 font-medium">
      {convo.overallRating}/5
    </span>
  </div>
)}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && conversations.length > 0 && (
        <div className="flex justify-between items-center mt-8 bg-gray-800 p-4 rounded-lg border border-gray-700">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <span className="text-sm text-gray-400 font-medium">
            Page <span className="text-white">{page}</span> of{" "}
            <span className="text-white">{totalPages}</span>
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ConversationList;

/**
 * Frontend Page: src/pages/admin/FeedbackList.jsx
 */

import React, { useEffect, useState } from "react";
import axios from "../../config/axios";
import { Link } from "react-router-dom";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const FeedbackList = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchFeedback();
  }, [page]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/admin/feedback?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeedback(res.data.feedback);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error("Error fetching feedback", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">User Feedback Report</h1>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading feedback...</div>
      ) : feedback.length === 0 ? (
        <p className="text-gray-400">No feedback found.</p>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <div
              key={item._id}
              className="bg-gray-800 p-4 rounded-lg border border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {item.rating === "positive" ? (
                    <ThumbsUp className="text-green-500" size={20} />
                  ) : (
                    <ThumbsDown className="text-red-500" size={20} />
                  )}
                  <span
                    className={`font-semibold text-lg ${
                      item.rating === "positive"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {item.rating.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>

              {item.reason && (
                <p className="text-gray-200 mb-3 italic">"{item.reason}"</p>
              )}

              <div className="text-sm text-gray-400 border-t border-gray-700 pt-3 flex flex-col sm:flex-row sm:items-center sm:gap-6">
                <div className="flex items-center gap-2">
                  <User size={14} />
                  <span>
                    {item.userId?.username || "Unknown User"} (
                    {item.userId?.email || "..."})
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 sm:mt-0">
                  <MessageSquare size={14} />
                  <Link
                    to={`/admin/conversations/${item.conversationId?._id}`}
                    className="hover:underline text-blue-400"
                  >
                    View Conversation: {item.conversationId?.title || "..."}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && feedback.length > 0 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedbackList;

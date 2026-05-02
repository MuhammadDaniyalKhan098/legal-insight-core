/**
 * CommunityModeration Component
 *
 * Admin panel for moderating community Q&A content.
 * Includes report review, content deletion, pinning, and user management.
 *
 * @module pages/admin/CommunityModeration
 */

import { useState, useEffect } from "react";
import axios from "../../config/axios";
import { Flag, Trash2, Pin, Shield, Users, AlertTriangle } from "lucide-react";

const CommunityModeration = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [statusFilter, page]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `/api/admin/community/reports?status=${statusFilter}&page=${page}&limit=20`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setReports(res.data.reports);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewReport = async (reportId, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/admin/community/reports/${reportId}/review`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchReports();
      setShowReportModal(false);
    } catch (error) {
      alert(error.response?.data?.message || "Error reviewing report");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?"))
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/admin/community/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Question deleted successfully");
      fetchReports();
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting question");
    }
  };

  const handleDeleteAnswer = async (answerId) => {
    if (!window.confirm("Are you sure you want to delete this answer?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/admin/community/answers/${answerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Answer deleted successfully");
      fetchReports();
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting answer");
    }
  };

  const handlePinQuestion = async (questionId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/admin/community/questions/${questionId}/pin`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchReports();
    } catch (error) {
      alert(error.response?.data?.message || "Error pinning question");
    }
  };

  const handlePinAnswer = async (answerId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/admin/community/answers/${answerId}/pin`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchReports();
    } catch (error) {
      alert(error.response?.data?.message || "Error pinning answer");
    }
  };

  const handleMarkAdminAnswer = async (answerId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/admin/community/answers/${answerId}/admin-answer`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchReports();
    } catch (error) {
      alert(error.response?.data?.message || "Error marking admin answer");
    }
  };

  const openReportModal = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const getReasonColor = (reason) => {
    switch (reason) {
      case "misinformation":
        return "text-yellow-400";
      case "harassment":
        return "text-red-400";
      case "spam":
        return "text-orange-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <Flag className="text-red-500" /> Community Moderation
      </h1>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="text-white font-semibold">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No reports found.
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report._id}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Flag
                          className={`${
                            report.status === "pending"
                              ? "text-red-400"
                              : report.status === "resolved"
                                ? "text-green-400"
                                : "text-gray-400"
                          }`}
                          size={18}
                        />
                        <span
                          className={`font-semibold ${getReasonColor(report.reason)}`}
                        >
                          {report.reason.charAt(0).toUpperCase() +
                            report.reason.slice(1)}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            report.status === "pending"
                              ? "bg-yellow-600/30 text-yellow-300"
                              : report.status === "resolved"
                                ? "bg-green-600/30 text-green-300"
                                : "bg-gray-600/30 text-gray-300"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">
                        Reported by: {report.reportedBy?.username || "Unknown"}
                      </p>
                      {report.description && (
                        <p className="text-gray-400 text-sm mb-2">
                          {report.description}
                        </p>
                      )}
                      {report.question && (
                        <div className="bg-gray-800 rounded p-3 mb-2">
                          <p className="text-white font-semibold mb-1">
                            Question: {report.question.title || "N/A"}
                          </p>
                          <p className="text-gray-300 text-sm line-clamp-2">
                            {report.question.content || "N/A"}
                          </p>
                        </div>
                      )}
                      {report.answer && (
                        <div className="bg-gray-800 rounded p-3 mb-2">
                          <p className="text-white font-semibold mb-1">
                            Answer
                          </p>
                          <p className="text-gray-300 text-sm line-clamp-2">
                            {report.answer.content || "N/A"}
                          </p>
                        </div>
                      )}
                      <p className="text-gray-500 text-xs">
                        {new Date(report.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => openReportModal(report)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Review
                    </button>
                    {report.question && (
                      <>
                        <button
                          onClick={() =>
                            handleDeleteQuestion(report.question._id)
                          }
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Delete Question
                        </button>
                        <button
                          onClick={() => handlePinQuestion(report.question._id)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <Pin size={14} />
                          Pin Question
                        </button>
                      </>
                    )}
                    {report.answer && (
                      <>
                        <button
                          onClick={() => handleDeleteAnswer(report.answer._id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Delete Answer
                        </button>
                        <button
                          onClick={() => handlePinAnswer(report.answer._id)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <Pin size={14} />
                          Pin Answer
                        </button>
                        <button
                          onClick={() =>
                            handleMarkAdminAnswer(report.answer._id)
                          }
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <Shield size={14} />
                          Mark Verified
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-white px-4 py-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Report Review Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Review Report</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Reason
                </label>
                <p className="text-white">{selectedReport.reason}</p>
              </div>
              {selectedReport.description && (
                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Description
                  </label>
                  <p className="text-white">{selectedReport.description}</p>
                </div>
              )}
              {selectedReport.question && (
                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Question
                  </label>
                  <div className="bg-gray-700 rounded p-3">
                    <p className="text-white font-semibold mb-1">
                      {selectedReport.question.title}
                    </p>
                    <p className="text-gray-300 text-sm">
                      {selectedReport.question.content}
                    </p>
                  </div>
                </div>
              )}
              {selectedReport.answer && (
                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Answer
                  </label>
                  <div className="bg-gray-700 rounded p-3">
                    <p className="text-gray-300 text-sm">
                      {selectedReport.answer.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedReport(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleReviewReport(selectedReport._id, "resolved")
                }
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
              >
                Mark Resolved
              </button>
              <button
                onClick={() =>
                  handleReviewReport(selectedReport._id, "dismissed")
                }
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityModeration;

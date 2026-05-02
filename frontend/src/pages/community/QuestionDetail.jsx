/**
 * QuestionDetail Component
 *
 * Displays a single question with its answers, voting, and answer submission.
 *
 * @module pages/community/QuestionDetail
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "../../config/axios";
import CommunityDisclaimer from "../../components/CommunityDisclaimer";
import {
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Hash,
  Flag,
  Shield,
} from "lucide-react";

const QuestionDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [answerVotes, setAnswerVotes] = useState({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportingType, setReportingType] = useState(null); // 'question' or 'answer'
  const [reportingId, setReportingId] = useState(null);

  useEffect(() => {
    fetchQuestion();
  }, [id]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(`/api/community/questions/${id}`, {
        headers,
      });
      setQuestion(res.data.question);
      setAnswers(res.data.answers);
      setUserVote(res.data.userVote);
      setAnswerVotes(res.data.answerVotes || {});
    } catch (error) {
      console.error("Error fetching question:", error);
      if (error.response?.status === 404) {
        navigate("/community");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVoteQuestion = async (voteType) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `/api/community/questions/${id}/vote`,
        { voteType },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setQuestion({ ...question, totalVotes: res.data.totalVotes });
      setUserVote(res.data.userVote);
    } catch (error) {
      console.error("Error voting:", error);
      alert(error.response?.data?.message || "Error voting");
    }
  };

  const handleVoteAnswer = async (answerId, voteType) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const currentVote = answerVotes[answerId];
      const newVoteType = currentVote === voteType ? null : voteType;
      const res = await axios.post(
        `/api/community/answers/${answerId}/vote`,
        { voteType: newVoteType || voteType },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setAnswerVotes({ ...answerVotes, [answerId]: res.data.userVote });
      setAnswers(
        answers.map((a) =>
          a._id === answerId ? { ...a, totalVotes: res.data.totalVotes } : a,
        ),
      );
    } catch (error) {
      console.error("Error voting:", error);
      alert(error.response?.data?.message || "Error voting");
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `/api/community/questions/${id}/answers`,
        { content: answerContent },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setAnswerContent("");
      fetchQuestion();
    } catch (error) {
      alert(error.response?.data?.message || "Error posting answer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!reportReason) {
      alert("Please select a reason");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const payload = {
        reason: reportReason,
        description: reportDescription,
      };

      if (reportingType === "question") {
        payload.questionId = reportingId;
      } else {
        payload.answerId = reportingId;
      }

      await axios.post("/api/community/reports", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Report submitted successfully");
      setShowReportModal(false);
      setReportReason("");
      setReportDescription("");
    } catch (error) {
      alert(error.response?.data?.message || "Error submitting report");
    }
  };

  const openReportModal = (type, itemId) => {
    setReportingType(type);
    setReportingId(itemId);
    setShowReportModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading question…</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-white font-semibold">Question not found</p>
          <Link
            to="/community"
            className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
          >
            ← Back to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="bg-orb-1 absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-600/8 blur-3xl" />
        <div className="bg-orb-2 absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-indigo-600/8 blur-3xl" />
      </div>

      <div className="relative z-10 p-4 pt-8">
        <div className="container mx-auto max-w-4xl">
          <Link
            to="/community"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors text-sm mb-6"
          >
            ← Back to Community
          </Link>

          <CommunityDisclaimer />

          {/* Question card */}
          <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 mb-6 animate-slide-up">
            <div className="flex gap-4">
              {/* Vote column */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                {user ? (
                  <button
                    onClick={() => handleVoteQuestion("upvote")}
                    className={`p-1.5 rounded-xl transition-all ${
                      userVote === "upvote"
                        ? "text-blue-400 bg-blue-500/15"
                        : "text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
                    }`}
                  >
                    <ChevronUp size={22} />
                  </button>
                ) : (
                  <ChevronUp size={22} className="text-gray-700 p-1.5" />
                )}
                <span className="text-white font-bold tabular-nums">
                  {question.totalVotes}
                </span>
                {user ? (
                  <button
                    onClick={() => handleVoteQuestion("downvote")}
                    className={`p-1.5 rounded-xl transition-all ${
                      userVote === "downvote"
                        ? "text-red-400 bg-red-500/15"
                        : "text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                    }`}
                  >
                    <ChevronDown size={22} />
                  </button>
                ) : (
                  <ChevronDown size={22} className="text-gray-700 p-1.5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h1 className="text-2xl font-bold text-white leading-snug">
                    {question.title}
                  </h1>
                  {user && (
                    <button
                      onClick={() => openReportModal("question", question._id)}
                      className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 mt-1"
                      title="Report"
                    >
                      <Flag size={16} />
                    </button>
                  )}
                </div>

                <div className="text-gray-300 mb-5 whitespace-pre-wrap leading-relaxed">
                  {question.content}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    {question.author?.profilePicture ? (
                      <img
                        src={question.author.profilePicture}
                        alt="Profile"
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full inline-flex items-center justify-center text-white font-bold text-[9px]">
                        {(question.author?.username || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                    {question.author?.username || "Unknown"}
                  </span>
                  <span>
                    {new Date(question.createdAt).toLocaleDateString()}
                  </span>
                  {question.tags && question.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {question.tags.map((tag) => (
                        <Link
                          key={tag._id || tag}
                          to={`/community?tag=${typeof tag === "object" ? tag.name : tag}`}
                          className="inline-flex items-center gap-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full hover:bg-blue-500/20 transition-colors"
                        >
                          <Hash size={10} />
                          {typeof tag === "object" ? tag.name : tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Answer form */}
          {user && (
            <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 mb-6 animate-slide-up anim-delay-100">
              <h2 className="text-lg font-semibold text-white mb-4">
                Your Answer
              </h2>
              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                <textarea
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 min-h-[130px] placeholder-gray-500 transition-all resize-none"
                  required
                  placeholder="Write your answer… (use @username for mentions)"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-600/25"
                >
                  {submitting ? "Posting…" : "Post Answer"}
                </button>
              </form>
            </div>
          )}

          {/* Answers */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-400" />
              {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
            </h2>

            {answers.length === 0 ? (
              <div className="text-center py-12 bg-gray-900/50 border border-gray-800 rounded-2xl animate-fade-in">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-400">
                  No answers yet — be the first to help!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {answers.map((answer, i) => (
                  <div
                    key={answer._id}
                    className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 animate-slide-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex gap-4">
                      {/* Vote column */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        {user ? (
                          <button
                            onClick={() =>
                              handleVoteAnswer(answer._id, "upvote")
                            }
                            className={`p-1.5 rounded-xl transition-all ${
                              answerVotes[answer._id] === "upvote"
                                ? "text-blue-400 bg-blue-500/15"
                                : "text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
                            }`}
                          >
                            <ChevronUp size={20} />
                          </button>
                        ) : (
                          <ChevronUp
                            size={20}
                            className="text-gray-700 p-1.5"
                          />
                        )}
                        <span className="text-white text-sm font-bold tabular-nums">
                          {answer.totalVotes}
                        </span>
                        {user ? (
                          <button
                            onClick={() =>
                              handleVoteAnswer(answer._id, "downvote")
                            }
                            className={`p-1.5 rounded-xl transition-all ${
                              answerVotes[answer._id] === "downvote"
                                ? "text-red-400 bg-red-500/15"
                                : "text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                            }`}
                          >
                            <ChevronDown size={20} />
                          </button>
                        ) : (
                          <ChevronDown
                            size={20}
                            className="text-gray-700 p-1.5"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                              {answer.author?.profilePicture ? (
                                <img
                                  src={answer.author.profilePicture}
                                  alt="Profile"
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full inline-flex items-center justify-center text-white font-bold text-[10px]">
                                  {(answer.author?.username || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              )}
                              {answer.author?.username || "Unknown"}
                            </span>
                            {answer.isAdminAnswer && (
                              <span className="inline-flex items-center gap-1 bg-green-500/15 text-green-400 border border-green-500/30 text-xs px-2 py-0.5 rounded-full">
                                <Shield size={10} /> Verified
                              </span>
                            )}
                            {answer.isPinned && (
                              <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs px-2 py-0.5 rounded-full">
                                📌 Pinned
                              </span>
                            )}
                          </div>
                          {user && (
                            <button
                              onClick={() =>
                                openReportModal("answer", answer._id)
                              }
                              className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                            >
                              <Flag size={14} />
                            </button>
                          )}
                        </div>

                        <div className="text-gray-300 text-sm mb-3 whitespace-pre-wrap leading-relaxed">
                          {answer.content}
                        </div>
                        <p className="text-xs text-gray-600">
                          {new Date(answer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            <h2 className="text-lg font-semibold text-white mb-1">
              Report Content
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              Help us keep the community safe
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Reason
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  required
                >
                  <option value="">Select a reason…</option>
                  <option value="misinformation">Misinformation</option>
                  <option value="harassment">Harassment</option>
                  <option value="spam">Spam</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Description{" "}
                  <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 min-h-[90px] placeholder-gray-500 transition-all resize-none"
                  maxLength={500}
                  placeholder="Provide additional details…"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason("");
                  setReportDescription("");
                }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                className="flex-1 bg-red-600/90 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-600/20"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionDetail;

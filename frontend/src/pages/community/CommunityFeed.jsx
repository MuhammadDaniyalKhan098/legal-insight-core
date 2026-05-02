/**
 * CommunityFeed Component
 *
 * Displays the community question feed with sorting and filtering options.
 *
 * @module pages/community/CommunityFeed
 */

import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import axios from "../../config/axios";
import CommunityDisclaimer from "../../components/CommunityDisclaimer";
import { ChevronUp, ChevronDown, MessageSquare, Hash } from "lucide-react";

const CommunityFeed = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("top");
  const [selectedTag, setSelectedTag] = useState(searchParams.get("tag") || "");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAskForm, setShowAskForm] = useState(false);
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionContent, setQuestionContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userVotes, setUserVotes] = useState({});

  useEffect(() => {
    const tagParam = searchParams.get("tag");
    if (tagParam) {
      setSelectedTag(tagParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchQuestions();
  }, [sort, selectedTag, page]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        sort,
        page: page.toString(),
        limit: "20",
      });
      if (selectedTag) {
        params.append("tag", selectedTag.toLowerCase().trim());
      }

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`/api/community/questions?${params}`, {
        headers,
      });
      setQuestions(res.data.questions);
      setTotalPages(res.data.totalPages);
      setUserVotes(res.data.userVotes || {});
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/community/questions",
        {
          title: questionTitle,
          content: questionContent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setQuestionTitle("");
      setQuestionContent("");
      setShowAskForm(false);
      fetchQuestions();
    } catch (error) {
      alert(error.response?.data?.message || "Error posting question");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (questionId, voteType) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `/api/community/questions/${questionId}/vote`,
        { voteType },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      // Update local vote state immediately
      setUserVotes((prev) => ({
        ...prev,
        [questionId]: res.data.userVote,
      }));
      // Update question vote count
      setQuestions((prev) =>
        prev.map((q) =>
          q._id === questionId ? { ...q, totalVotes: res.data.totalVotes } : q,
        ),
      );
    } catch (error) {
      console.error("Error voting:", error);
      alert(error.response?.data?.message || "Error voting");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="bg-orb-1 absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-3xl" />
        <div className="bg-orb-2 absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full bg-indigo-600/8 blur-3xl" />
        <div className="bg-orb-3 absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-violet-600/6 blur-2xl" />
      </div>

      <div className="relative z-10 p-4 pt-8">
        <div className="container mx-auto max-w-5xl">
          {/* Page header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-600/20">
                👥
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Community Q&A
              </h1>
            </div>
            <p className="text-gray-400 ml-13 pl-0.5">
              Ask questions and share legal knowledge with the community
            </p>
          </div>

          <CommunityDisclaimer />

          {/* Controls bar */}
          <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 mb-6 animate-slide-up anim-delay-100">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-sm font-medium">
                  Sort:
                </label>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className="bg-gray-800 text-white text-sm px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                >
                  <option value="top">⬆ Top Votes</option>
                  <option value="newest">🆕 Newest</option>
                  <option value="unanswered">❓ Unanswered</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-sm font-medium">
                  Tag:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedTag}
                    onChange={(e) => {
                      setSelectedTag(e.target.value);
                      setPage(1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        fetchQuestions();
                      }
                    }}
                    placeholder="e.g., contract"
                    className="bg-gray-800 text-white text-sm px-3 py-2 pr-7 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all min-w-[170px] placeholder-gray-500"
                  />
                  {selectedTag && (
                    <button
                      onClick={() => {
                        setSelectedTag("");
                        setPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {user && (
                <button
                  onClick={() => setShowAskForm(!showAskForm)}
                  className={`ml-auto text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 ${
                    showAskForm
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
                  }`}
                >
                  {showAskForm ? "✕ Cancel" : "+ Ask Question"}
                </button>
              )}
            </div>

            {/* Ask form */}
            {showAskForm && (
              <form
                onSubmit={handleAskQuestion}
                className="mt-5 pt-5 border-t border-gray-800 space-y-4 animate-slide-up"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Question Title
                  </label>
                  <input
                    type="text"
                    value={questionTitle}
                    onChange={(e) => setQuestionTitle(e.target.value)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 placeholder-gray-500 transition-all"
                    required
                    maxLength={200}
                    placeholder="What is your legal question?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Details{" "}
                    <span className="text-gray-500 font-normal">
                      (use #hashtag for tags, @username for mentions)
                    </span>
                  </label>
                  <textarea
                    value={questionContent}
                    onChange={(e) => setQuestionContent(e.target.value)}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 min-h-[130px] placeholder-gray-500 transition-all resize-none"
                    required
                    placeholder="Describe your question in detail..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-600/25"
                >
                  {submitting ? "Posting…" : "Post Question"}
                </button>
              </form>
            )}
          </div>

          {/* Questions list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading questions…</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="text-5xl mb-4">🤔</div>
              <p className="text-white font-semibold text-lg mb-2">
                No questions found
              </p>
              <p className="text-gray-400 text-sm">
                Be the first to ask a question!
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {questions.map((question, i) => (
                  <div
                    key={question._id}
                    className={`bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 hover:border-gray-700 hover:bg-gray-900 transition-all duration-200 animate-slide-up`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex gap-4">
                      {/* Vote column */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        {user ? (
                          <button
                            onClick={() => handleVote(question._id, "upvote")}
                            className={`p-1 rounded-lg transition-all ${
                              userVotes[question._id] === "upvote"
                                ? "text-blue-400 bg-blue-500/10"
                                : "text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
                            }`}
                          >
                            <ChevronUp size={20} />
                          </button>
                        ) : (
                          <ChevronUp size={20} className="text-gray-700 p-1" />
                        )}
                        <span className="text-white text-sm font-bold tabular-nums">
                          {question.totalVotes}
                        </span>
                        {user ? (
                          <button
                            onClick={() => handleVote(question._id, "downvote")}
                            className={`p-1 rounded-lg transition-all ${
                              userVotes[question._id] === "downvote"
                                ? "text-red-400 bg-red-500/10"
                                : "text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                            }`}
                          >
                            <ChevronDown size={20} />
                          </button>
                        ) : (
                          <ChevronDown
                            size={20}
                            className="text-gray-700 p-1"
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/community/question/${question._id}`}
                          className="block mb-1.5"
                        >
                          <h2 className="text-base font-semibold text-white hover:text-blue-400 transition-colors line-clamp-2">
                            {question.title}
                          </h2>
                        </Link>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2 leading-relaxed">
                          {question.content}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            {question.author?.profilePicture ? (
                              <img
                                src={question.author.profilePicture}
                                alt="Profile"
                                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <span className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full inline-flex items-center justify-center text-white font-bold text-[9px] flex-shrink-0">
                                {(question.author?.username || "?")
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            )}
                            {question.author?.username || "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare size={12} />
                            {question.answerCount}{" "}
                            {question.answerCount === 1 ? "answer" : "answers"}
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
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <span className="text-gray-400 text-sm px-3">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityFeed;

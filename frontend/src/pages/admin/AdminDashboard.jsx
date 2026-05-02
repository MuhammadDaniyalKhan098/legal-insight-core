import React, { useEffect, useState } from "react";
import axios from "../../config/axios";
import { Link } from "react-router-dom";
import { Users, MessageSquare, Activity, FileText, Flag } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    userCount: 0,
    conversationCount: 0,
    feedbackCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (error) {
        console.error("Error fetching stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 text-white overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="bg-orb-1 absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-600/6 blur-3xl" />
        <div className="bg-orb-2 absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-blue-600/6 blur-3xl" />
      </div>

      <div className="relative z-10 p-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center justify-center">
            <Activity size={20} className="text-red-400" />
          </div>
          Admin Dashboard
        </h1>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">Total Users</p>
              <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                <Users size={16} className="text-blue-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white">{stats.userCount}</p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl animate-slide-up anim-delay-100">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">Active Conversations</p>
              <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center">
                <MessageSquare size={16} className="text-green-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white">
              {stats.conversationCount}
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl animate-slide-up anim-delay-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">Total Feedback</p>
              <div className="w-8 h-8 bg-yellow-500/15 rounded-lg flex items-center justify-center">
                <FileText size={16} className="text-yellow-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white">
              {stats.feedbackCount || 0}
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Link
            to="/admin/users"
            className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl hover:border-blue-500/40 hover:bg-gray-900 transition-all duration-200 group animate-slide-up anim-delay-300"
          >
            <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/25 transition-colors">
              <Users size={16} className="text-blue-400" />
            </div>
            <h3 className="text-base font-semibold mb-1 group-hover:text-blue-400 transition-colors">
              User Reports →
            </h3>
            <p className="text-gray-500 text-sm">View and manage all users.</p>
          </Link>

          <Link
            to="/admin/conversations"
            className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl hover:border-green-500/40 hover:bg-gray-900 transition-all duration-200 group animate-slide-up anim-delay-400"
          >
            <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500/25 transition-colors">
              <MessageSquare size={16} className="text-green-400" />
            </div>
            <h3 className="text-base font-semibold mb-1 group-hover:text-green-400 transition-colors">
              Chat Logs →
            </h3>
            <p className="text-gray-500 text-sm">
              Inspect user prompts and AI responses.
            </p>
          </Link>

          <Link
            to="/admin/feedback"
            className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl hover:border-yellow-500/40 hover:bg-gray-900 transition-all duration-200 group animate-slide-up anim-delay-500"
          >
            <div className="w-8 h-8 bg-yellow-500/15 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-500/25 transition-colors">
              <FileText size={16} className="text-yellow-400" />
            </div>
            <h3 className="text-base font-semibold mb-1 group-hover:text-yellow-400 transition-colors">
              Feedback Report →
            </h3>
            <p className="text-gray-500 text-sm">
              See all user-submitted feedback.
            </p>
          </Link>

          <Link
            to="/admin/community"
            className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl hover:border-red-500/40 hover:bg-gray-900 transition-all duration-200 group animate-slide-up anim-delay-600"
          >
            <div className="w-8 h-8 bg-red-500/15 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-500/25 transition-colors">
              <Flag size={16} className="text-red-400" />
            </div>
            <h3 className="text-base font-semibold mb-1 group-hover:text-red-400 transition-colors">
              Community Moderation →
            </h3>
            <p className="text-gray-500 text-sm">
              Moderate Q&A content and reports.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

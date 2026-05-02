/**
 * Notifications Component
 *
 * Displays user notifications with read/unread status.
 *
 * @module pages/community/Notifications
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../../config/axios";
import CommunityDisclaimer from "../../components/CommunityDisclaimer";

const Notifications = ({ user }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchNotifications();
  }, [user, page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `/api/community/notifications?page=${page}&limit=20`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications(res.data.notifications);
      setTotalPages(res.data.totalPages);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/community/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        "/api/community/notifications/read-all",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationLink = (notification) => {
    if (notification.link) return notification.link;
    if (notification.question)
      return `/community/question/${notification.question._id || notification.question}`;
    return "/community";
  };

  if (!user) return null;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="bg-orb-1 absolute -top-32 -left-32 w-[440px] h-[440px] rounded-full bg-blue-600/8 blur-3xl" />
        <div className="bg-orb-2 absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full bg-indigo-600/8 blur-3xl" />
      </div>

      <div className="relative z-10 p-4 pt-8">
        <div className="container mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-600/20">
                🔔
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Notifications
              </h1>
            </div>
            {unreadCount > 0 && (
              <p className="text-gray-400 text-sm pl-0.5">
                <span className="text-blue-400 font-semibold">
                  {unreadCount}
                </span>{" "}
                unread {unreadCount === 1 ? "notification" : "notifications"}
              </p>
            )}
          </div>

          <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 animate-slide-up">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="mb-5 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
              >
                ✓ Mark all as read
              </button>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Loading notifications…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="text-5xl mb-4">🔕</div>
                <p className="text-white font-semibold mb-1">All caught up!</p>
                <p className="text-gray-500 text-sm">No notifications yet.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {notifications.map((notification, i) => (
                    <Link
                      key={notification._id}
                      to={getNotificationLink(notification)}
                      onClick={() => {
                        if (!notification.isRead) markAsRead(notification._id);
                      }}
                      className={`flex items-start justify-between gap-3 p-4 rounded-xl transition-all duration-200 animate-fade-in ${
                        notification.isRead
                          ? "bg-gray-800/40 hover:bg-gray-800/70"
                          : "bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/15"
                      }`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-semibold text-sm mb-0.5 ${notification.isRead ? "text-gray-300" : "text-white"}`}
                        >
                          {notification.title}
                        </h3>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-gray-600 text-xs mt-1.5">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5 animate-glow" />
                      )}
                    </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6 pt-5 border-t border-gray-800">
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
    </div>
  );
};

export default Notifications;

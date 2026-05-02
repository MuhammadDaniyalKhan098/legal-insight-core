/**
 * App Component
 * The root component of the application.
 * Manages routing, global user state, and initial authentication check.
 * Renders the Navbar and defines all application routes.
 * @module App.jsx
 */

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import VerifyEmail from "./pages/VerifyEmail";
import VerificationPending from "./pages/VerificationPending";
import UserProfile from "./pages/UserProfile";
import { useEffect, useState } from "react";
import axios from "./config/axios";
import NotFound from "./components/NotFound";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserList from "./pages/admin/UserList";
import ConversationList from "./pages/admin/ConversationList";
import ConversationView from "./pages/admin/ConversationView";
import FeedbackList from "./pages/admin/FeedbackList";
import CommunityFeed from "./pages/community/CommunityFeed";
import QuestionDetail from "./pages/community/QuestionDetail";
import Notifications from "./pages/community/Notifications";
import CommunityModeration from "./pages/admin/CommunityModeration";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  console.log(user);
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await axios.get("/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(res.data);
        } catch (err) {
          setError("Failed to fetch user data");
          localStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center flex-col gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            ⚖️
          </div>
        </div>
        <p className="text-gray-400 text-sm font-medium animate-pulse">
          Loading LegalAI...
        </p>
      </div>
    );
  }

  return (
    <Router>
      <Navbar user={user} setUser={setUser} />
      <div className="min-h-[calc(100vh-64px)] overflow-hidden">
        <Routes>
          <Route path="/" element={<Home user={user} error={error} />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <Login setUser={setUser} />}
          />
          <Route
            path="/register"
            element={
              user ? <Navigate to="/" /> : <Register setUser={setUser} />
            }
          />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route
            path="/verification-pending"
            element={<VerificationPending />}
          />
          <Route
            path="/profile"
            element={
              user ? (
                <UserProfile user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/chat/:conversationId?"
            element={user ? <Chat user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin"
            element={
              <AdminRoute user={user}>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute user={user}>
                <UserList />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/conversations"
            element={
              <AdminRoute user={user}>
                <ConversationList />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/conversations/:id"
            element={
              <AdminRoute user={user}>
                <ConversationView />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/feedback"
            element={
              <AdminRoute user={user}>
                <FeedbackList />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/community"
            element={
              <AdminRoute user={user}>
                <CommunityModeration />
              </AdminRoute>
            }
          />
          <Route path="/community" element={<CommunityFeed user={user} />} />
          <Route
            path="/community/question/:id"
            element={<QuestionDetail user={user} />}
          />
          <Route
            path="/community/notifications"
            element={
              user ? <Notifications user={user} /> : <Navigate to="/login" />
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

/**
 * Forgot Password Page
 * Renders a form for the user to submit their email and receive a password reset link.
 * @module pages/ForgotPassword.jsx
 */

import axios from "../config/axios";
import React, { useState } from "react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await axios.post("/api/users/forgot-password", { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-60px)] bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-sm border border-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl scale-150"></div>
            <div className="relative w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto">
              🔑
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Forgot Password</h2>
          <p className="text-gray-400 text-sm">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-3 mb-6">
            <p className="text-sm text-green-400 flex items-center gap-2">
              <span>✅</span>
              {message}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-400 flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </p>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 transform text-white p-3 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
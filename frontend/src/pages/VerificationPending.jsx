/**
 * Verification Pending Page
 * Informs the user that a verification email has been sent.
 * Provides an option to resend the verification email.
 * @module pages/VerificationPending.jsx
 */

import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "../config/axios";

const VerificationPending = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      setError("Email not found. Please register again.");
      return;
    }

    setIsResending(true);
    setError("");
    setMessage("");

    try {
      const res = await axios.post("/api/users/resend-verification", {
        email,
      });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend email");
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-800 text-center animate-scale-in">
          <h2 className="text-2xl font-bold text-white mb-4">No Email Found</h2>
          <p className="text-gray-400 mb-6">
            Please register to create an account.
          </p>
          <button
            onClick={() => navigate("/register")}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-500"
          >
            Go to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-800 animate-scale-in">
        <div className="text-center mb-6">
          <div className="text-blue-400 text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Verify Your Email
          </h2>
          <p className="text-gray-400">We've sent a verification email to:</p>
          <p className="text-blue-400 font-semibold mt-2">{email}</p>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-md p-4 mb-6">
          <p className="text-sm text-gray-300">
            Please check your inbox and click the verification link to activate
            your account.
          </p>
        </div>

        {message && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-md p-3 mb-4">
            <p className="text-sm text-green-400">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-md p-3 mb-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-400 mb-3">
            Didn't receive the email?
          </p>
          <button
            onClick={handleResendEmail}
            disabled={isResending}
            className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-500 font-medium disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            {isResending ? "Resending..." : "Resend Verification Email"}
          </button>
        </div>

        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => navigate("/login")}
            className="text-blue-400 text-sm hover:underline block w-full"
          >
            Back to Login
          </button>
          <button
            onClick={() => navigate("/register")}
            className="text-gray-400 text-sm hover:underline block w-full"
          >
            Register with Different Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;

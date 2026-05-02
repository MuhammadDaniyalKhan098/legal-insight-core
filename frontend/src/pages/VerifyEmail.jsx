/**
 * Verify Email Page
 * Handles the email verification process using a token from the URL query parameters.
 * Shows loading, success, and error states to the user.
 * Redirects to the login page upon successful verification.
 * @module pages/VerifyEmail.jsx
 */

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "../config/axios";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [verificationResult, setVerificationResult] = useState(null);
  const navigate = useNavigate();
  const hasVerified = useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verifyEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setVerificationResult({
          status: "error",
          message: "Invalid verification link",
        });
        return;
      }

      try {
        const res = await axios.get(`/api/users/verify-email?token=${token}`);

        if (res.data.verified) {
          setVerificationResult({
            status: "success",
            message: res.data.message,
          });

          setTimeout(() => {
            navigate("/login");
          }, 2000);
        } else {
          setVerificationResult({
            status: "error",
            message: "Verification failed. Please try again.",
          });
        }
      } catch (err) {
        console.error("Verification error:", err);
        setVerificationResult({
          status: "error",
          message:
            err.response?.data?.message ||
            "Verification failed. The link may be invalid or expired.",
        });
      }
    };

    verifyEmail();
  }, []);

  if (!verificationResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-800 text-center animate-scale-in">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white">Verifying Email...</h2>
          <p className="text-gray-400 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-800 text-center animate-scale-in">
        {verificationResult.status === "success" ? (
          <>
            <div className="text-green-400 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Email Verified!
            </h2>
            <p className="text-gray-400">{verificationResult.message}</p>
            <p className="text-sm text-gray-500 mt-4">
              Redirecting to login...
            </p>
          </>
        ) : (
          <>
            <div className="text-red-400 text-6xl mb-4">✗</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Verification Failed
            </h2>
            <p className="text-red-400 mb-4">{verificationResult.message}</p>
            <div className="space-y-3">
              <button
                onClick={() =>
                  navigate("/verification-pending", { state: { email: null } })
                }
                className="w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-500"
              >
                Resend Verification Email
              </button>
              <button
                onClick={() => navigate("/register")}
                className="w-full bg-gray-800 text-gray-200 px-6 py-2 rounded-md hover:bg-gray-700"
              >
                Register Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

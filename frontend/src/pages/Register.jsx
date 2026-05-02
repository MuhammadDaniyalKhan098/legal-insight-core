/**
 * Register Page
 * Renders a form for new user registration.
 * Handles form state, submission, and API requests for registration.
 * Upon success, redirects the user to a verification pending page.
 * @module pages/Register.jsx
 */

import axios from "../config/axios";
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Register = ({ setUser }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "public",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/users/register", formData);
      navigate("/verification-pending", { state: { email: formData.email } });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-60px)] bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="bg-orb-1 absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="bg-orb-2 absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="bg-orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-violet-600/8 blur-2xl" />
      </div>

      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-sm border border-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl animate-scale-in relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl scale-150"></div>
            <div className="relative w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto">
              ⚖️
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-gray-400 text-sm">
            Sign up to start using your legal assistant
          </p>
        </div>

        {error && (
          <p className="text-red-400 bg-red-500/10 border border-red-500 p-3 rounded-lg mb-4 text-sm">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Username
            </label>
            <input
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Email
            </label>
            <input
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Select Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="public">Public User</option>
              <option value="lawyer">Lawyer</option>
              <option value="academic">Academic</option>
            </select>
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 transform text-white p-3 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30">
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-400 text-center">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-400 hover:underline cursor-pointer"
          >
            Login
          </span>
        </p>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

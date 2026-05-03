/**
 * Home Page
 * Renders the main home page. Displays a welcome message and navigation
 * for authenticated users, or login/register prompts for guests.
 * @module pages/Home.jsx
 */

import { Link } from "react-router-dom";
import NewsFeed from "../components/NewsFeed";

const Home = ({ user, error }) => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 overflow-hidden">

      {/* ── Animated background orbs ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Top-left blue orb */}
        <div className="bg-orb-1 absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-blue-600/10 blur-3xl" />
        {/* Bottom-right indigo orb */}
        <div className="bg-orb-2 absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-3xl" />
        {/* Centre-top violet accent */}
        <div className="bg-orb-3 absolute top-1/3 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-violet-600/8 blur-2xl" />
      </div>

      {error && (
        <div className="max-w-2xl mx-auto pt-6 px-4">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {user ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-60px)] p-4">
          <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="text-center">
              {/* Avatar — pops in with a springy bounce */}
              <div className="mb-6 animate-pop-in">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-4 shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/20"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/20">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <h2 className="text-3xl font-bold mb-2 text-white animate-fade-in anim-delay-100">
                  Welcome back, {user.username}!
                </h2>
                <p className="text-gray-400 text-sm animate-fade-in anim-delay-200">{user.email}</p>
              </div>

              {/* CTA button — slides up after the heading */}
              <div className="space-y-4 mb-6">
                <div className="animate-fade-in anim-delay-300">
                  <Link
                    to="/chat"
                    className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white p-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 shadow-lg hover:shadow-blue-600/40 group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-200">🤖</span>
                    <span>Start Chat with AI Legal Assistant</span>
                  </Link>
                </div>

                {/* Features card — slides in from left */}
                <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl text-left animate-slide-in anim-delay-400">
                  <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                    <span className="text-blue-400">⚖️</span>
                    Legal Assistant Features
                  </h3>
                  <ul className="text-sm text-gray-300 space-y-3">
                    {[
                      "Get legal information and guidance",
                      "Ask questions about legal procedures",
                      "Understand legal terminology",
                      "Document preparation assistance",
                    ].map((text, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2 animate-fade-in anim-delay-${(i + 4) * 100}`}
                      >
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Disclaimer — fades in last */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 animate-fade-in anim-delay-500">
                <p className="text-xs text-yellow-300">
                  ⚠️ This AI assistant provides general legal information only.
                  Always consult with qualified legal professionals for specific legal advice.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] p-4">
          <div className="text-center animate-fade-in max-w-2xl w-full">
            {/* Hero */}
            <div className="mb-10">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl scale-150"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-4xl shadow-2xl shadow-blue-600/30 mx-auto">
                  ⚖️
                </div>
              </div>
              <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
                Pakistan's AI{" "}
                <span className="block text-blue-400">Legal Assistant</span>
              </h1>
              <p className="text-xl text-gray-400 mb-2">
                Instant, accurate legal guidance powered by AI
              </p>
              <p className="text-gray-500 text-sm">
                Please sign in or create an account to continue
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <Link
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30 text-base"
                to="/login"
              >
                Sign In to Your Account
              </Link>
              <Link
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 text-base"
                to="/register"
              >
                Create Free Account
              </Link>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 anim-delay-100 animate-fade-in">
                <div className="text-2xl mb-2">⚡</div>
                <p className="text-sm font-medium text-white">Instant Answers</p>
                <p className="text-xs text-gray-500 mt-1">Get legal info fast</p>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 anim-delay-200 animate-fade-in">
                <div className="text-2xl mb-2">🔒</div>
                <p className="text-sm font-medium text-white">Secure & Private</p>
                <p className="text-xs text-gray-500 mt-1">Your data is safe</p>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 anim-delay-300 animate-fade-in">
                <div className="text-2xl mb-2">📚</div>
                <p className="text-sm font-medium text-white">Comprehensive</p>
                <p className="text-xs text-gray-500 mt-1">Wide legal coverage</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── News Feed Section ── */}
      <NewsFeed />
    </div>
  );
};

export default Home;
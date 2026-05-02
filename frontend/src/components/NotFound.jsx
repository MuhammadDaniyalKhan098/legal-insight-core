/**
 * NotFound Component
 * A simple component that is displayed when a user navigates to a route
 * that does not exist (404).
 * * @module components/NotFound.jsx
 */

import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 text-white">
      <div className="text-center animate-fade-in p-8">
        <div className="text-8xl font-black text-blue-600/20 mb-4">404</div>
        <div className="text-4xl mb-3">⚖️</div>
        <h1 className="text-2xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-gray-400 mb-8 max-w-sm mx-auto">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30 inline-block">
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

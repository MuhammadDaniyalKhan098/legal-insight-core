import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, LogOut, MessageSquare, Users, User } from "lucide-react";
import NotificationBell from "./NotificationBell";

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  /* Returns classes for a nav pill link. Active page gets a solid blue tint. */
  const navLink = (href) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${pathname === href
      ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40"
      : "text-gray-300 hover:text-white hover:bg-gray-800"
    }`;

  return (
    <nav className="bg-gray-900/95 backdrop-blur-md border-b border-gray-800 px-6 py-3 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" aria-label="LegalAI Home" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm group-hover:bg-blue-500 transition-colors">⚖️</div>
          <span className="text-white font-bold text-lg tracking-tight">LegalAI</span>
        </Link>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors font-medium border border-red-400/30 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-sm mr-1"
                >
                  <Shield size={14} />
                  Admin
                </Link>
              )}

              {/* Primary nav links — icon + label pills */}
              <Link to="/chat" className={navLink("/chat")}>
                <MessageSquare size={14} className="flex-shrink-0" />
                Chat
              </Link>
              <Link to="/community" className={navLink("/community")}>
                <Users size={14} className="flex-shrink-0" />
                Community
              </Link>
              <Link to="/profile" className={navLink("/profile")}>
                <User size={14} className="flex-shrink-0" />
                Profile
              </Link>

              <NotificationBell user={user} />

              {/* User badge + sign-out */}
              <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-700">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="Profile"
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-blue-500/30 flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-blue-500/30 flex-shrink-0">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-sm font-medium px-2 py-1.5 rounded-lg border border-transparent hover:border-red-500/20"
                  title="Sign out"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-gray-300 hover:text-white px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 shadow-lg shadow-blue-600/20"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

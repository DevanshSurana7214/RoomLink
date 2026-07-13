import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ currentUser, onLogout }) {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path
      ? 'text-brand-700 border-brand-600'
      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300';

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🔗</span>
            <span className="text-xl font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
              RoomLink
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {currentUser ? (
              <>
                <Link
                  to="/search"
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${isActive('/search')}`}
                >
                  Find Path
                </Link>
                <Link
                  to="/connections"
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${isActive('/connections')}`}
                >
                  My Connections
                </Link>
                <Link
                  to="/connect"
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${isActive('/connect')}`}
                >
                  Add Connection
                </Link>
                <div className="ml-4 flex items-center gap-3 border-l border-gray-200 pl-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                    <p className="text-xs text-gray-500">Room {currentUser.room_no}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/" className="btn-secondary text-sm py-2 px-4">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

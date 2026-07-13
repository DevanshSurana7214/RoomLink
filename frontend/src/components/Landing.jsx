import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setAuthData } from '../api';

export default function Landing({ currentUser, onLogin }) {
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (currentUser) {
    return (
      <div className="card text-center py-12">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {currentUser.name}!
        </h2>
        <p className="text-gray-500 mb-6">Room {currentUser.room_no}</p>
        {currentUser.previous_room && currentUser.previous_room !== currentUser.room_no && (
          <p className="text-xs text-gray-400 mb-6">
            Switched from {currentUser.previous_room} to {currentUser.room_no}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <button onClick={() => navigate('/search')} className="btn-primary">
            Find a Path
          </button>
          <button onClick={() => navigate('/connections')} className="btn-secondary">
            My Connections
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!rollNumber.trim() || !password) {
      setError('Please enter your roll number and password');
      return;
    }
    setLoading(true);
    try {
      const data = await api.login(rollNumber.trim(), password);
      setAuthData(data.person, data.token);
      onLogin(data.person);
    } catch (err) {
      setError('Invalid roll number or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🔗</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to <span className="text-brand-600">RoomLink</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Find consented paths through your dorm network to reach any room.
        </p>
      </div>

      {/* Concept explanation */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          How Consent-Based Routing Works
        </h2>
        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
          <p>
            <strong>Just because you're friends doesn't mean you're both okay bridging in both directions.</strong>
          </p>
          <p>
            RoomLink uses <strong>directional consent</strong>: each person independently controls whether
            they're willing to be used as a stepping stone to reach someone else's room.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <p className="font-medium text-amber-800 text-sm">Example</p>
            <p className="text-amber-700 text-sm mt-1">
              Alice knows Charlie. Alice is happy to help others reach Charlie's room,
              but Charlie might not want to help others reach Alice's room. Both choices
              are respected — consent is set <strong>per direction, per connection</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Sign in form */}
      <div className="card max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sign In</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Roll Number</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. CS22001"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-sm text-gray-500 text-center mt-4">
          New here?{' '}
          <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

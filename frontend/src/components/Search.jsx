import React, { useState } from 'react';
import { api } from '../api';
import PathDisplay from './PathDisplay';

export default function Search({ currentUser }) {
  const [targetRooms, setTargetRooms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!currentUser) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Please sign in to search for paths.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const rooms = targetRooms
      .split(/[,;]+/)
      .map(r => r.trim())
      .filter(r => r.length > 0);

    if (rooms.length === 0) {
      setError('Please enter at least one target room');
      return;
    }

    setLoading(true);
    try {
      const data = await api.findPath(currentUser.id, rooms);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find a Path</h1>
        <p className="text-gray-500 mt-1">
          Enter one or more target rooms to find a consented path from your room
        </p>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-medium text-sm">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900">{currentUser.name}</p>
            <p className="text-sm text-gray-500">Room {currentUser.room_no}</p>
          </div>
          <div className="ml-auto text-sm text-gray-400">
            You are here →
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Target Room(s)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. A206, A310 (separate with commas)"
              value={targetRooms}
              onChange={(e) => setTargetRooms(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              Separate multiple rooms with commas (,) or semicolons (;).
              Rooms are tried in preference order.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Finding path...
              </span>
            ) : (
              'Find Path'
            )}
          </button>
        </form>
      </div>

      {result && (
        <PathDisplay result={result} />
      )}
    </div>
  );
}

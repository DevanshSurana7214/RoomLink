import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { normalizeRoom } from '../roomUtils';
import PathDisplay from './PathDisplay';

export default function Search({ currentUser }) {
  const location = useLocation();
  const [targetRooms, setTargetRooms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [savedSearches, setSavedSearches] = useState([]);
  const [watchingLoading, setWatchingLoading] = useState(false);
  const [swapSending, setSwapSending] = useState(false);
  const [swapMessage, setSwapMessage] = useState('');
  const [watchMessage, setWatchMessage] = useState('');

  // Load saved searches on mount
  useEffect(() => {
    if (!currentUser) return;
    api.getMySearches()
      .then(setSavedSearches)
      .catch(() => {});
  }, [currentUser]);

  // If navigated here from a notification (view path), show that result
  useEffect(() => {
    if (location.state?.savedResult) {
      setResult(location.state.savedResult);
      setTargetRooms(location.state.savedResult.target_room || '');
      // Clear the state so it doesn't re-show on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
    setSwapMessage('');
    setWatchMessage('');

    const rooms = targetRooms
      .split(/[,;]+/)
      .map(r => r.trim())
      .filter(r => r.length > 0)
      .map(r => normalizeRoom(r) || r);

    if (rooms.length === 0) {
      setError('Please enter at least one target room');
      return;
    }

    setLoading(true);
    try {
      const data = await api.findPath(rooms);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchRoom = async () => {
    const rooms = targetRooms
      .split(/[,;]+/)
      .map(r => r.trim())
      .filter(r => r.length > 0)
      .map(r => normalizeRoom(r) || r);

    if (rooms.length === 0) return;

    setWatchingLoading(true);
    setWatchMessage('');
    try {
      await api.saveSearch(rooms);
      setWatchMessage(`We'll notify you when a path to ${rooms.join(', ')} becomes available!`);
      // Refresh saved searches list
      const searches = await api.getMySearches();
      setSavedSearches(searches);
    } catch (err) {
      setWatchMessage(err.message);
    } finally {
      setWatchingLoading(false);
    }
  };

  const handleRequestSwap = async () => {
    if (!result?.found || !result?.path) return;
    const targetPerson = result.path[result.path.length - 1];
    if (!targetPerson) return;

    setSwapSending(true);
    setSwapMessage('');
    try {
      const data = await api.requestSwap(targetPerson.id, result.target_room);
      setSwapMessage(`Swap request sent to ${data.target_person.name}!`);
    } catch (err) {
      setSwapMessage(err.message);
    } finally {
      setSwapSending(false);
    }
  };

  // Active watching searches for display
  const watchingSearches = savedSearches.filter(s => s.status === 'watching' || s.status === 'found');

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

      {/* Swap request status message */}
      {swapMessage && (
        <div className={`rounded-lg p-4 text-sm ${
          swapMessage.includes('sent')
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {swapMessage}
        </div>
      )}

      {/* Watch room message */}
      {watchMessage && (
        <div className={`rounded-lg p-4 text-sm ${
          watchMessage.includes('notify') || watchMessage.includes('available')
            ? 'bg-blue-50 border border-blue-200 text-blue-700'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {watchMessage}
        </div>
      )}

      {result && (
        <PathDisplay
          result={result}
          currentUser={currentUser}
          onRequestSwap={handleRequestSwap}
          swapSending={swapSending}
          onWatchRoom={handleWatchRoom}
          watchingLoading={watchingLoading}
        />
      )}

      {/* Saved searches summary */}
      {watchingSearches.length > 0 && (
        <div className="card py-4 px-5">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Watching ({watchingSearches.filter(s => s.status === 'watching').length} active)
          </h4>
          <div className="space-y-2">
            {watchingSearches.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {s.status === 'found' ? (
                    <span className="text-emerald-500 text-sm">🎉</span>
                  ) : (
                    <span className="text-blue-400 text-sm">👀</span>
                  )}
                  <span className="text-sm text-gray-700">
                    {s.target_rooms.join(', ')}
                  </span>
                </div>
                <span className={`text-xs font-medium ${
                  s.status === 'found' ? 'text-emerald-600' : 'text-gray-400'
                }`}>
                  {s.status === 'found' ? 'Path found!' : 'Watching...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

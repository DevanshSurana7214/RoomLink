import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { POLL_INTERVAL } from '../constants';

export default function NotificationsPage({ currentUser }) {
  const [notifications, setNotifications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(null);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      if (!loading) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  if (!currentUser) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Please sign in to view notifications.</p>
      </div>
    );
  }

  const handleAcceptConnection = async (id) => {
    setActing('conn-' + id);
    try {
      await api.confirmConnection(id);
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  };

  const handleAcceptSwap = async (id) => {
    const confirmed = window.confirm(
      'This will change your room. Are you sure you want to accept this swap?'
    );
    if (!confirmed) return;
    setActing('swap-accept-' + id);
    try {
      await api.acceptSwap(id);
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  };

  const handleDeclineSwap = async (id) => {
    setActing('swap-decline-' + id);
    try {
      await api.declineSwap(id);
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  };

  const handleViewPath = (searchId, lastResult) => {
    navigate('/search', { state: { savedResult: lastResult, savedSearchId: searchId } });
  };

  const total = notifications ? notifications.total_count : 0;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-500 mt-1">
          {total > 0 ? `You have ${total} notification${total !== 1 ? 's' : ''}` : 'No new notifications'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="card text-center py-8">
          <p className="text-gray-400">Loading...</p>
        </div>
      )}

      {!loading && notifications && (
        <div className="space-y-6">
          {/* Incoming connection requests */}
          {notifications.connection_requests.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Connection Requests ({notifications.connection_requests.length})
              </h2>
              <div className="space-y-3">
                {notifications.connection_requests.map(n => (
                  <div key={`conn-${n.id}`} className="card flex items-center justify-between py-4 px-5">
                    <div>
                      <p className="font-medium text-gray-900">{n.from.name}</p>
                      <p className="text-sm text-gray-500">{n.from.roll_number}</p>
                    </div>
                    <button
                      onClick={() => handleAcceptConnection(n.id)}
                      disabled={acting === 'conn-' + n.id}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      {acting === 'conn-' + n.id ? '...' : 'Accept'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incoming swap requests */}
          {notifications.swap_requests.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Room Swap Requests ({notifications.swap_requests.length})
              </h2>
              <div className="space-y-3">
                {notifications.swap_requests.map(n => (
                  <div key={`swap-${n.id}`} className="card py-4 px-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {n.from.name} wants your room
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          They're in <strong>{n.requester_room}</strong> · You're in{' '}
                          <strong>{n.target_room}</strong>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {n.from.name} would move to {n.target_room}, you'd move to{' '}
                          {n.requester_room}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptSwap(n.id)}
                        disabled={acting === 'swap-accept-' + n.id}
                        className="btn-primary text-sm py-2 px-4 flex-1"
                      >
                        {acting === 'swap-accept-' + n.id ? 'Processing...' : 'Accept & Swap'}
                      </button>
                      <button
                        onClick={() => handleDeclineSwap(n.id)}
                        disabled={acting === 'swap-decline-' + n.id}
                        className="btn-secondary text-sm py-2 px-4"
                      >
                        {acting === 'swap-decline-' + n.id ? '...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Found saved searches */}
          {notifications.found_searches.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Paths Found ({notifications.found_searches.length})
              </h2>
              <div className="space-y-3">
                {notifications.found_searches.map(n => (
                  <div key={`search-${n.id}`} className="card py-4 px-5">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎉</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Path found to {n.target_rooms.join(', ')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {n.last_result?.path_length} hop{n.last_result?.path_length !== 1 ? 's' : ''} away
                        </p>
                      </div>
                      <button
                        onClick={() => handleViewPath(n.id, n.last_result)}
                        className="btn-primary text-sm py-2 px-4"
                      >
                        View Path
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="card text-center py-8">
              <div className="text-4xl mb-2">🔔</div>
              <p className="text-gray-500">No notifications yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Incoming connection requests, swap requests, and found paths will appear here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

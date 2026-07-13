import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

function ConsentSwitch({ connectionId, direction, label, enabled, onChange, loading }) {
  return (
    <div className={`flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg ${loading ? 'opacity-60' : ''}`}>
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={() => !loading && onChange(connectionId, direction, !enabled)}
        className={`consent-toggle ${enabled ? 'on' : 'off'} ${loading ? 'cursor-wait' : 'cursor-pointer'}`}
        aria-label={label}
        disabled={loading}
      >
        <span className="handle" />
      </button>
    </div>
  );
}

export default function MyConnections({ currentUser }) {
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [consentLoading, setConsentLoading] = useState(null);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [conns, pending] = await Promise.all([
        api.getMyConnections(),
        api.getPendingRequests(),
      ]);
      setConnections(conns);
      setPendingRequests(pending);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!currentUser) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Please sign in to view connections.</p>
      </div>
    );
  }

  const handleConfirm = async (id) => {
    setConfirmingId(id);
    try {
      await api.confirmConnection(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleConsentChange = async (connectionId, direction, value) => {
    setConsentLoading(connectionId + direction);
    try {
      await api.setConsent(connectionId, direction, value);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setConsentLoading(null);
    }
  };

  const pendingConns = connections.filter(c => c.status === 'pending');
  const confirmedConns = connections.filter(c => c.status === 'confirmed');

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Connections</h1>
        <p className="text-gray-500 mt-1">
          Manage your connections and set consent directions
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Incoming pending requests */}
      {pendingRequests.filter(r => r.incoming).length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Incoming Requests ({pendingRequests.filter(r => r.incoming).length})
          </h2>
          <div className="space-y-3">
            {pendingRequests.filter(r => r.incoming).map(req => (
              <div key={req.id} className="card flex items-center justify-between py-4 px-5">
                <div>
                  <p className="font-medium text-gray-900">{req.otherPerson.name}</p>
                  <p className="text-sm text-gray-500">Room {req.otherPerson.room_no}</p>
                </div>
                <button
                  onClick={() => handleConfirm(req.id)}
                  disabled={confirmingId === req.id}
                  className="btn-primary text-sm py-2 px-4"
                >
                  {confirmingId === req.id ? 'Confirming...' : 'Accept'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing pending requests */}
      {pendingConns.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Pending Requests ({pendingConns.length})
          </h2>
          <div className="space-y-3">
            {pendingConns.map(conn => (
              <div key={conn.id} className="card py-4 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{conn.otherPerson.name}</p>
                    <p className="text-sm text-gray-500">Room {conn.otherPerson.room_no}</p>
                  </div>
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                    Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed connections */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          Confirmed Connections ({confirmedConns.length})
        </h2>
        {confirmedConns.length === 0 && (
          <div className="card text-center py-8">
            <div className="text-4xl mb-2">🤝</div>
            <p className="text-gray-500">No confirmed connections yet.</p>
          </div>
        )}
        <div className="space-y-3">
          {confirmedConns.map(conn => (
            <div key={conn.id} className="card py-4 px-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{conn.otherPerson.name}</p>
                  <p className="text-sm text-gray-500">Room {conn.otherPerson.room_no}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Routing Consent (direction you control)
                </p>
                <ConsentSwitch
                  connectionId={conn.id}
                  direction={conn.myConsentDirection}
                  label={`Allow routing through you to reach ${conn.otherPerson.name}'s room`}
                  enabled={conn.myConsent}
                  onChange={handleConsentChange}
                  loading={consentLoading === conn.id + conn.myConsentDirection}
                />
                <div className="pt-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    Their consent toward you
                  </p>
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-500">
                      Allow routing through {conn.otherPerson.name} to reach your room
                    </span>
                    <span className={`text-sm font-medium ${conn.theirConsent ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {conn.theirConsent ? '✓ Granted' : '— Not set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function AddConnection({ currentUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const navigate = useNavigate();

  if (!currentUser) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Please sign in to add connections.</p>
      </div>
    );
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    setStatus({ type: '', message: '' });
    try {
      const people = await api.searchPeople(query.trim());
      setResults(people.filter(p => p.id !== currentUser.id));
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (person) => {
    setSending(person.id);
    setStatus({ type: '', message: '' });
    try {
      await api.addConnection(currentUser.id, person.id);
      setStatus({
        type: 'success',
        message: `Connection request sent to ${person.name}!`
      });
      // Remove from results
      setResults(prev => prev.filter(p => p.id !== person.id));
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Connection</h1>
        <p className="text-gray-500 mt-1">Search for someone you know in the dorm</p>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="label">Search by name, room, or roll number</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="e.g. Alice, A101, CS22001..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <button type="submit" disabled={searching || !query.trim()} className="btn-primary">
                {searching ? '...' : 'Search'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {status.message && (
        <div className={`rounded-lg p-4 text-sm ${
          status.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {status.message}
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="card text-center py-8">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-gray-500">No people found matching your search.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Results ({results.length})
          </h2>
          {results.map(person => (
            <div key={person.id} className="card flex items-center justify-between py-4 px-5">
              <div>
                <p className="font-medium text-gray-900">{person.name}</p>
                <p className="text-sm text-gray-500">
                  Room {person.room_no} · {person.roll_number}
                </p>
              </div>
              <button
                onClick={() => handleSendRequest(person)}
                disabled={sending === person.id}
                className="btn-primary text-sm py-2 px-4"
              >
                {sending === person.id ? 'Sending...' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="text-center">
        <button
          onClick={() => navigate('/connections')}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          View my connections →
        </button>
      </div>
    </div>
  );
}

const BASE_URL = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const api = {
  // People
  registerPerson: (data) =>
    request('/people', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  searchPeople: (query) =>
    request(`/people/search?q=${encodeURIComponent(query)}`),

  getPerson: (id) =>
    request(`/people/${id}`),

  getPersonByRoll: (rollNumber) =>
    request(`/people/roll/${encodeURIComponent(rollNumber)}`),

  // Connections
  addConnection: (fromId, toId) =>
    request('/connections', {
      method: 'POST',
      body: JSON.stringify({ from_id: fromId, to_id: toId }),
    }),

  confirmConnection: (id) =>
    request(`/connections/${id}/confirm`, { method: 'PUT' }),

  setConsent: (id, personId, direction, value) =>
    request(`/connections/${id}/consent`, {
      method: 'PUT',
      body: JSON.stringify({ person_id: personId, direction, value }),
    }),

  getPersonConnections: (personId) =>
    request(`/connections/person/${personId}`),

  getPendingRequests: (personId) =>
    request(`/connections/pending/${personId}`),

  // Search
  findPath: (personId, targetRooms) =>
    request('/search', {
      method: 'POST',
      body: JSON.stringify({ person_id: personId, target_rooms: targetRooms }),
    }),
};

export function getCurrentPerson() {
  const stored = localStorage.getItem('roomlink_user');
  return stored ? JSON.parse(stored) : null;
}

export function setCurrentPerson(person) {
  localStorage.setItem('roomlink_user', JSON.stringify(person));
}

export function clearCurrentPerson() {
  localStorage.removeItem('roomlink_user');
}

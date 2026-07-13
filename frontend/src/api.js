const BASE_URL = '/api';

function getToken() {
  const stored = localStorage.getItem('roomlink_token');
  return stored || null;
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    headers,
    ...options,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const api = {
  // Auth
  login: (rollNumber, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ roll_number: rollNumber, password }),
    }),

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

  getMyProfile: () =>
    request('/people/me'),

  // Connections
  addConnection: (toId) =>
    request('/connections', {
      method: 'POST',
      body: JSON.stringify({ to_id: toId }),
    }),

  confirmConnection: (id) =>
    request(`/connections/${id}/confirm`, { method: 'PUT' }),

  setConsent: (connectionId, direction, value) =>
    request(`/connections/${connectionId}/consent`, {
      method: 'PUT',
      body: JSON.stringify({ direction, value }),
    }),

  getMyConnections: () =>
    request('/connections/person'),

  getPendingRequests: () =>
    request('/connections/pending'),

  // Search / Pathfinding
  findPath: (targetRooms) =>
    request('/search', {
      method: 'POST',
      body: JSON.stringify({ target_rooms: targetRooms }),
    }),

  // Saved Searches (standing search / watch)
  saveSearch: (targetRooms) =>
    request('/searches', {
      method: 'POST',
      body: JSON.stringify({ target_rooms: targetRooms }),
    }),

  getMySearches: () =>
    request('/searches/me'),

  cancelSearch: (id) =>
    request(`/searches/${id}`, { method: 'DELETE' }),

  // Swap Requests
  requestSwap: (targetPersonId, targetRoom) =>
    request('/swaps', {
      method: 'POST',
      body: JSON.stringify({ target_person_id: targetPersonId, target_room: targetRoom }),
    }),

  acceptSwap: (id) =>
    request(`/swaps/${id}/accept`, { method: 'PUT' }),

  declineSwap: (id) =>
    request(`/swaps/${id}/decline`, { method: 'PUT' }),

  cancelSwap: (id) =>
    request(`/swaps/${id}/cancel`, { method: 'PUT' }),

  getMySwaps: () =>
    request('/swaps/me'),

  // Notifications (aggregated)
  getNotifications: () =>
    request('/notifications'),
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
  localStorage.removeItem('roomlink_token');
}

export function setAuthData(person, token) {
  localStorage.setItem('roomlink_user', JSON.stringify(person));
  localStorage.setItem('roomlink_token', token);
}

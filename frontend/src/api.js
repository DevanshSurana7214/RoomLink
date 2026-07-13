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

  // Connections (identity derived from token — no person_id params)
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

  // Search (identity derived from token — no person_id param)
  findPath: (targetRooms) =>
    request('/search', {
      method: 'POST',
      body: JSON.stringify({ target_rooms: targetRooms }),
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
  localStorage.removeItem('roomlink_token');
}

export function setAuthData(person, token) {
  localStorage.setItem('roomlink_user', JSON.stringify(person));
  localStorage.setItem('roomlink_token', token);
}

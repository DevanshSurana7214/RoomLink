const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { recheckAllSavedSearches } = require('../recheckSearches');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Helper to normalize person pair ordering
function normalizePair(id1, id2) {
  return id1 < id2 ? { a: id1, b: id2 } : { a: id2, b: id1 };
}

// Send a connection request
router.post('/', (req, res) => {
  const { to_id } = req.body;
  const from_id = req.userId;

  if (!to_id) {
    return res.status(400).json({ error: 'to_id is required' });
  }
  if (from_id === to_id) {
    return res.status(400).json({ error: 'Cannot connect to yourself' });
  }

  const db = getDb();

  // Verify target person exists
  const to = db.prepare('SELECT id FROM people WHERE id = ?').get(to_id);
  if (!to) {
    return res.status(404).json({ error: 'Target person not found' });
  }

  const { a, b } = normalizePair(from_id, to_id);
  const requestedBy = a === from_id ? 'a' : 'b';

  // Check if connection already exists
  const existing = db.prepare('SELECT id, status FROM connections WHERE person_a_id = ? AND person_b_id = ?').get(a, b);
  if (existing) {
    if (existing.status === 'pending') {
      return res.status(409).json({ error: 'Connection request already pending', id: existing.id });
    }
    return res.status(409).json({ error: 'Connection already exists', id: existing.id });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO connections (id, person_a_id, person_b_id, status, requested_by)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(id, a, b, requestedBy);

  res.status(201).json({ id, status: 'pending' });
});

// Confirm a pending connection
router.put('/:id/confirm', (req, res) => {
  const db = getDb();
  const conn = db.prepare('SELECT id, status, person_a_id, person_b_id FROM connections WHERE id = ?').get(req.params.id);
  if (!conn) {
    return res.status(404).json({ error: 'Connection not found' });
  }
  if (conn.status !== 'pending') {
    return res.status(400).json({ error: 'Connection is not pending' });
  }
  // Only the other person (not the requester) can confirm
  if (conn.person_a_id !== req.userId && conn.person_b_id !== req.userId) {
    return res.status(403).json({ error: 'You are not part of this connection' });
  }
  db.prepare('UPDATE connections SET status = ? WHERE id = ?').run('confirmed', req.params.id);
  res.json({ id: req.params.id, status: 'confirmed' });
});

// Update consent flags
// Body: { direction: "a_to_b" | "b_to_a", value: true/false }
// Person identity derived from req.userId
router.put('/:id/consent', (req, res) => {
  const { direction, value } = req.body;
  if (!direction || typeof value !== 'boolean') {
    return res.status(400).json({ error: 'direction (a_to_b or b_to_a) and value (boolean) are required' });
  }
  if (!['a_to_b', 'b_to_a'].includes(direction)) {
    return res.status(400).json({ error: 'direction must be a_to_b or b_to_a' });
  }

  const db = getDb();
  const conn = db.prepare('SELECT * FROM connections WHERE id = ?').get(req.params.id);
  if (!conn) {
    return res.status(404).json({ error: 'Connection not found' });
  }
  if (conn.status !== 'confirmed') {
    return res.status(400).json({ error: 'Connection must be confirmed before setting consent' });
  }

  // Verify the person making the change is one of the two people
  if (req.userId !== conn.person_a_id && req.userId !== conn.person_b_id) {
    return res.status(403).json({ error: 'You can only set consent for your own connections' });
  }

  // a_to_b_consent: person A allows routing THROUGH them to reach B's side
  // Only person A can set a_to_b_consent
  // Only person B can set b_to_a_consent
  if (direction === 'a_to_b' && req.userId !== conn.person_a_id) {
    return res.status(403).json({ error: 'Only person A can set a_to_b_consent' });
  }
  if (direction === 'b_to_a' && req.userId !== conn.person_b_id) {
    return res.status(403).json({ error: 'Only person B can set b_to_a_consent' });
  }

  db.prepare(`UPDATE connections SET ${direction} = ? WHERE id = ?`).run(value ? 1 : 0, req.params.id);

  // Consent changes can affect pathfinding — re-check saved searches
  recheckAllSavedSearches();

  res.json({ id: req.params.id, [direction]: value });
});

// Get all connections for current user
router.get('/person', (req, res) => {
  const db = getDb();
  const personId = req.userId;

  const connections = db.prepare(`
    SELECT
      c.id,
      c.person_a_id,
      c.person_b_id,
      c.a_to_b_consent,
      c.b_to_a_consent,
      c.status,
      c.requested_by,
      pa.id AS a_id, pa.name AS a_name, pa.roll_number AS a_roll, pa.room_no AS a_room,
      pb.id AS b_id, pb.name AS b_name, pb.roll_number AS b_roll, pb.room_no AS b_room
    FROM connections c
    JOIN people pa ON c.person_a_id = pa.id
    JOIN people pb ON c.person_b_id = pb.id
    WHERE c.person_a_id = ? OR c.person_b_id = ?
    ORDER BY c.status, c.id
  `).all(personId, personId);

  const result = connections.map(c => {
    const isPersonA = c.person_a_id === personId;
    const otherPerson = isPersonA
      ? { id: c.b_id, name: c.b_name, roll_number: c.b_roll, room_no: c.b_room }
      : { id: c.a_id, name: c.a_name, roll_number: c.a_roll, room_no: c.a_room };

    const myConsentDirection = isPersonA ? 'a_to_b' : 'b_to_a';
    const theirConsentDirection = isPersonA ? 'b_to_a' : 'a_to_b';

    return {
      id: c.id,
      otherPerson,
      status: c.status,
      requested_by: c.requested_by,
      myConsent: isPersonA ? !!c.a_to_b_consent : !!c.b_to_a_consent,
      theirConsent: isPersonA ? !!c.b_to_a_consent : !!c.a_to_b_consent,
      myConsentDirection,
      theirConsentDirection,
      a_to_b_consent: !!c.a_to_b_consent,
      b_to_a_consent: !!c.b_to_a_consent,
    };
  });

  res.json(result);
});

// Get pending requests for current user
router.get('/pending', (req, res) => {
  const db = getDb();
  const personId = req.userId;

  const requests = db.prepare(`
    SELECT
      c.id,
      c.person_a_id,
      c.person_b_id,
      c.requested_by,
      c.status,
      pa.id AS a_id, pa.name AS a_name, pa.roll_number AS a_roll, pa.room_no AS a_room,
      pb.id AS b_id, pb.name AS b_name, pb.roll_number AS b_roll, pb.room_no AS b_room
    FROM connections c
    JOIN people pa ON c.person_a_id = pa.id
    JOIN people pb ON c.person_b_id = pb.id
    WHERE (c.person_a_id = ? OR c.person_b_id = ?) AND c.status = 'pending'
    ORDER BY c.id
  `).all(personId, personId);

  const result = requests.map(c => {
    const isPersonA = c.person_a_id === personId;
    const otherPerson = isPersonA
      ? { id: c.b_id, name: c.b_name, roll_number: c.b_roll, room_no: c.b_room }
      : { id: c.a_id, name: c.a_name, roll_number: c.a_roll, room_no: c.a_room };

    const incoming = (isPersonA && c.requested_by === 'b') || (!isPersonA && c.requested_by === 'a');

    return {
      id: c.id,
      otherPerson,
      incoming,
      status: c.status,
    };
  });

  res.json(result);
});

module.exports = router;

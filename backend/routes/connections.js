const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const router = express.Router();

// Helper to normalize person pair ordering
// We always store with smaller UUID as person_a_id for uniqueness constraint
function normalizePair(id1, id2) {
  return id1 < id2 ? { a: id1, b: id2 } : { a: id2, b: id1 };
}

// Send a connection request
router.post('/', (req, res) => {
  const { from_id, to_id } = req.body;
  if (!from_id || !to_id) {
    return res.status(400).json({ error: 'from_id and to_id are required' });
  }
  if (from_id === to_id) {
    return res.status(400).json({ error: 'Cannot connect to yourself' });
  }

  const db = getDb();

  // Verify both people exist
  const from = db.prepare('SELECT id FROM people WHERE id = ?').get(from_id);
  const to = db.prepare('SELECT id FROM people WHERE id = ?').get(to_id);
  if (!from || !to) {
    return res.status(404).json({ error: 'One or both people not found' });
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
  const conn = db.prepare('SELECT id, status FROM connections WHERE id = ?').get(req.params.id);
  if (!conn) {
    return res.status(404).json({ error: 'Connection not found' });
  }
  if (conn.status !== 'pending') {
    return res.status(400).json({ error: 'Connection is not pending' });
  }
  db.prepare('UPDATE connections SET status = ? WHERE id = ?').run('confirmed', req.params.id);
  res.json({ id: req.params.id, status: 'confirmed' });
});

// Update consent flags
// Body: { person_id: "the person making the change", direction: "a_to_b" | "b_to_a", value: true/false }
router.put('/:id/consent', (req, res) => {
  const { person_id, direction, value } = req.body;
  if (!person_id || !direction || typeof value !== 'boolean') {
    return res.status(400).json({ error: 'person_id, direction (a_to_b or b_to_a), and value (boolean) are required' });
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
  if (person_id !== conn.person_a_id && person_id !== conn.person_b_id) {
    return res.status(403).json({ error: 'You can only set consent for your own connections' });
  }

  // a_to_b_consent: person A allows routing THROUGH them to reach B's side
  // This means A consents to be a bridge toward B
  // Only person A can set a_to_b_consent
  // Only person B can set b_to_a_consent

  if (direction === 'a_to_b' && person_id !== conn.person_a_id) {
    return res.status(403).json({ error: 'Only person A can set a_to_b_consent' });
  }
  if (direction === 'b_to_a' && person_id !== conn.person_b_id) {
    return res.status(403).json({ error: 'Only person B can set b_to_a_consent' });
  }

  db.prepare(`UPDATE connections SET ${direction} = ? WHERE id = ?`).run(value ? 1 : 0, req.params.id);
  res.json({ id: req.params.id, [direction]: value });
});

// Get all connections for a person
router.get('/person/:person_id', (req, res) => {
  const db = getDb();
  const personId = req.params.person_id;

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

    // Consent directions from the perspective of the requesting person
    // If I am person A: a_to_b_consent = "my consent to bridge toward B"
    // If I am person B: b_to_a_consent = "my consent to bridge toward A"
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
      // Raw flags for consent editing
      a_to_b_consent: !!c.a_to_b_consent,
      b_to_a_consent: !!c.b_to_a_consent
    };
  });

  res.json(result);
});

// Get pending requests for a person
router.get('/pending/:person_id', (req, res) => {
  const db = getDb();
  const personId = req.params.person_id;

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

    // Did the other person request this?
    const incoming = (isPersonA && c.requested_by === 'b') || (!isPersonA && c.requested_by === 'a');

    return {
      id: c.id,
      otherPerson,
      incoming,
      status: c.status
    };
  });

  res.json(result);
});

module.exports = router;

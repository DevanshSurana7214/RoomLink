const express = require('express');
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// GET /api/notifications — aggregated notification counts and summaries
router.get('/', (req, res) => {
  const db = getDb();
  const personId = req.userId;

  // 1. Pending incoming connection requests
  const pendingConnections = db.prepare(`
    SELECT
      c.id,
      c.person_a_id, c.person_b_id, c.requested_by,
      pa.id AS a_id, pa.name AS a_name, pa.roll_number AS a_roll,
      pb.id AS b_id, pb.name AS b_name, pb.roll_number AS b_roll
    FROM connections c
    JOIN people pa ON c.person_a_id = pa.id
    JOIN people pb ON c.person_b_id = pb.id
    WHERE (c.person_a_id = ? OR c.person_b_id = ?) AND c.status = 'pending'
  `).all(personId, personId);

  const incomingConnections = pendingConnections
    .filter(c => {
      const isPersonA = c.person_a_id === personId;
      return (isPersonA && c.requested_by === 'b') || (!isPersonA && c.requested_by === 'a');
    })
    .map(c => {
      const isPersonA = c.person_a_id === personId;
      const other = isPersonA
        ? { id: c.b_id, name: c.b_name, roll_number: c.b_roll }
        : { id: c.a_id, name: c.a_name, roll_number: c.a_roll };
      return { id: c.id, type: 'connection', from: other, created_at: null };
    });

  // 2. Pending incoming swap requests
  const pendingSwaps = db.prepare(`
    SELECT sr.*, req.name AS requester_name, req.room_no AS requester_current_room
    FROM swap_requests sr
    JOIN people req ON sr.requester_id = req.id
    WHERE sr.target_person_id = ? AND sr.status = 'pending'
    ORDER BY sr.created_at DESC
  `).all(personId);

  const incomingSwaps = pendingSwaps.map(s => ({
    id: s.id,
    type: 'swap',
    from: { id: s.requester_id, name: s.requester_name, room_no: s.requester_current_room },
    target_room: s.target_room,
    requester_room: s.requester_room,
    created_at: s.created_at
  }));

  // 3. Saved searches that flipped to 'found'
  const foundSearches = db.prepare(`
    SELECT * FROM saved_searches
    WHERE person_id = ? AND status = 'found'
    ORDER BY found_at DESC
  `).all(personId);

  const searchNotifications = foundSearches.map(s => ({
    id: s.id,
    type: 'search_found',
    target_rooms: JSON.parse(s.target_rooms),
    found_at: s.found_at,
    last_result: s.last_result ? JSON.parse(s.last_result) : null
  }));

  const totalCount = incomingConnections.length + incomingSwaps.length + searchNotifications.length;

  res.json({
    total_count: totalCount,
    connection_requests: incomingConnections,
    swap_requests: incomingSwaps,
    found_searches: searchNotifications
  });
});

module.exports = router;

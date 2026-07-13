const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { recheckAllSavedSearches } = require('../recheckSearches');

const router = express.Router();

router.use(verifyToken);

// POST /api/swaps — request a swap with someone in a target room
router.post('/', (req, res) => {
  const { target_person_id, target_room } = req.body;
  const requester_id = req.userId;

  if (!target_person_id || !target_room) {
    return res.status(400).json({ error: 'target_person_id and target_room are required' });
  }

  if (requester_id === target_person_id) {
    return res.status(400).json({ error: 'Cannot request a swap with yourself' });
  }

  const db = getDb();

  // Verify both people exist
  const requester = db.prepare('SELECT id, room_no FROM people WHERE id = ?').get(requester_id);
  const target = db.prepare('SELECT id, room_no, name FROM people WHERE id = ?').get(target_person_id);

  if (!requester || !target) {
    return res.status(404).json({ error: 'Person not found' });
  }

  // Verify target is actually in that room
  if (target.room_no.toLowerCase() !== target_room.trim().toLowerCase()) {
    return res.status(400).json({ error: `${target.name} is no longer in room ${target_room}` });
  }

  // Check for existing pending swap between these two
  const existing = db.prepare(`
    SELECT id FROM swap_requests
    WHERE ((requester_id = ? AND target_person_id = ?) OR (requester_id = ? AND target_person_id = ?))
      AND status = 'pending'
  `).get(requester_id, target_person_id, target_person_id, requester_id);

  if (existing) {
    return res.status(409).json({ error: 'A pending swap request already exists between you and this person' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO swap_requests (id, requester_id, target_person_id, requester_room, target_room, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, requester_id, target_person_id, requester.room_no, target.room_no, now);

  res.status(201).json({
    id,
    status: 'pending',
    requester_room: requester.room_no,
    target_room: target.room_no,
    target_person: { id: target.id, name: target.name }
  });
});

// PUT /api/swaps/:id/accept — accept a swap (only the target person)
router.put('/:id/accept', (req, res) => {
  const db = getDb();

  const swap = db.prepare('SELECT * FROM swap_requests WHERE id = ?').get(req.params.id);
  if (!swap) {
    return res.status(404).json({ error: 'Swap request not found' });
  }
  if (swap.status !== 'pending') {
    return res.status(400).json({ error: 'Swap request is no longer pending' });
  }
  if (req.userId !== swap.target_person_id) {
    return res.status(403).json({ error: 'Only the target person can accept this swap' });
  }

  // Verify target person is still in the same room
  const target = db.prepare('SELECT id, room_no, name FROM people WHERE id = ?').get(swap.target_person_id);
  const requester = db.prepare('SELECT id, room_no, name FROM people WHERE id = ?').get(swap.requester_id);

  if (!target || !requester) {
    return res.status(404).json({ error: 'One of the swap participants no longer exists' });
  }

  if (target.room_no !== swap.target_room) {
    return res.status(409).json({ error: `${target.name} no longer occupies room ${swap.target_room}. The swap request is stale.` });
  }
  if (requester.room_no !== swap.requester_room) {
    return res.status(409).json({ error: `${requester.name} no longer occupies room ${swap.requester_room}. The swap request is stale.` });
  }

  const now = new Date().toISOString();

  // Swap rooms atomically
  // requester gets target_room, target gets requester_room
  // requester's old room goes to previous_room
  db.transaction(() => {
    // Set requester's previous room
    db.prepare('UPDATE people SET previous_room = room_no, room_no = ? WHERE id = ?')
      .run(swap.target_room, swap.requester_id);
    // Set target's previous room
    db.prepare('UPDATE people SET previous_room = room_no, room_no = ? WHERE id = ?')
      .run(swap.requester_room, swap.target_person_id);
    // Mark swap as accepted
    db.prepare('UPDATE swap_requests SET status = ?, responded_at = ? WHERE id = ?')
      .run('accepted', now, req.params.id);
    // Auto-cancel other pending swaps for both parties
    db.prepare(`
      UPDATE swap_requests SET status = 'cancelled', responded_at = ?
      WHERE status = 'pending' AND (requester_id = ? OR requester_id = ? OR target_person_id = ? OR target_person_id = ?)
    `).run(now, swap.requester_id, swap.target_person_id, swap.requester_id, swap.target_person_id);
  })();

  // Re-check saved searches since rooms changed
  recheckAllSavedSearches();

  res.json({
    id: swap.id,
    status: 'accepted',
    message: `Swapped rooms! ${requester.name} → ${swap.target_room}, ${target.name} → ${swap.requester_room}`
  });
});

// PUT /api/swaps/:id/decline — decline a swap (only the target person)
router.put('/:id/decline', (req, res) => {
  const db = getDb();

  const swap = db.prepare('SELECT * FROM swap_requests WHERE id = ?').get(req.params.id);
  if (!swap) {
    return res.status(404).json({ error: 'Swap request not found' });
  }
  if (swap.status !== 'pending') {
    return res.status(400).json({ error: 'Swap request is no longer pending' });
  }
  if (req.userId !== swap.target_person_id) {
    return res.status(403).json({ error: 'Only the target person can decline this swap' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE swap_requests SET status = ?, responded_at = ? WHERE id = ?')
    .run('declined', now, req.params.id);

  res.json({ id: swap.id, status: 'declined' });
});

// PUT /api/swaps/:id/cancel — cancel a swap I sent (only the requester)
router.put('/:id/cancel', (req, res) => {
  const db = getDb();

  const swap = db.prepare('SELECT * FROM swap_requests WHERE id = ?').get(req.params.id);
  if (!swap) {
    return res.status(404).json({ error: 'Swap request not found' });
  }
  if (swap.status !== 'pending') {
    return res.status(400).json({ error: 'Swap request is no longer pending' });
  }
  if (req.userId !== swap.requester_id) {
    return res.status(403).json({ error: 'Only the requester can cancel this swap' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE swap_requests SET status = ?, responded_at = ? WHERE id = ?')
    .run('cancelled', now, req.params.id);

  res.json({ id: swap.id, status: 'cancelled' });
});

// GET /api/swaps/me — list swap requests I've sent and received
router.get('/me', (req, res) => {
  const db = getDb();
  const personId = req.userId;

  const swaps = db.prepare(`
    SELECT
      sr.*,
      req.name AS requester_name, req.room_no AS requester_current_room,
      tgt.name AS target_name, tgt.room_no AS target_current_room
    FROM swap_requests sr
    JOIN people req ON sr.requester_id = req.id
    JOIN people tgt ON sr.target_person_id = tgt.id
    WHERE sr.requester_id = ? OR sr.target_person_id = ?
    ORDER BY sr.created_at DESC
  `).all(personId, personId);

  const incoming = [];
  const outgoing = [];

  for (const s of swaps) {
    const item = {
      id: s.id,
      requester_room: s.requester_room,
      target_room: s.target_room,
      status: s.status,
      created_at: s.created_at,
      responded_at: s.responded_at,
      target_person: { id: s.target_person_id, name: s.target_name, room_no: s.target_current_room },
      requester_person: { id: s.requester_id, name: s.requester_name, room_no: s.requester_current_room }
    };

    if (s.target_person_id === personId) {
      incoming.push(item);
    } else {
      outgoing.push(item);
    }
  }

  res.json({ incoming, outgoing });
});

module.exports = router;

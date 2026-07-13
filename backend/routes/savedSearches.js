const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { recheckAllSavedSearches } = require('../recheckSearches');

const router = express.Router();

router.use(verifyToken);

// POST /api/searches — save a new search to watch (triggered when BFS found nothing)
router.post('/', (req, res) => {
  const { target_rooms } = req.body;

  if (!target_rooms || !Array.isArray(target_rooms) || target_rooms.length === 0) {
    return res.status(400).json({ error: 'target_rooms (non-empty array) are required' });
  }

  const db = getDb();
  const personId = req.userId;
  const now = new Date().toISOString();

  const id = uuidv4();
  db.prepare(`
    INSERT INTO saved_searches (id, person_id, target_rooms, status, created_at)
    VALUES (?, ?, ?, 'watching', ?)
  `).run(id, personId, JSON.stringify(target_rooms), now);

  // Run an initial check immediately — maybe the graph has changed since
  // the user's last search (e.g. a consent flag was just toggled)
  recheckAllSavedSearches();

  // Fetch the result to return to client
  const saved = db.prepare('SELECT * FROM saved_searches WHERE id = ?').get(id);
  res.status(201).json({
    id: saved.id,
    target_rooms: JSON.parse(saved.target_rooms),
    status: saved.status,
    created_at: saved.created_at,
    found_at: saved.found_at,
    last_result: saved.last_result ? JSON.parse(saved.last_result) : null
  });
});

// GET /api/searches/me — list all my saved searches
router.get('/me', (req, res) => {
  const db = getDb();

  const searches = db.prepare(`
    SELECT * FROM saved_searches WHERE person_id = ? ORDER BY created_at DESC
  `).all(req.userId);

  const result = searches.map(s => ({
    id: s.id,
    target_rooms: JSON.parse(s.target_rooms),
    status: s.status,
    created_at: s.created_at,
    found_at: s.found_at,
    last_result: s.last_result ? JSON.parse(s.last_result) : null
  }));

  res.json(result);
});

// DELETE /api/searches/:id — cancel/remove a saved search
router.delete('/:id', (req, res) => {
  const db = getDb();

  const search = db.prepare('SELECT * FROM saved_searches WHERE id = ? AND person_id = ?')
    .get(req.params.id, req.userId);

  if (!search) {
    return res.status(404).json({ error: 'Saved search not found' });
  }

  db.prepare('UPDATE saved_searches SET status = ? WHERE id = ?')
    .run('cancelled', req.params.id);

  res.json({ id: req.params.id, status: 'cancelled' });
});

module.exports = router;

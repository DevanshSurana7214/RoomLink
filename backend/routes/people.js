const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { normalizeRoom, validateRoom } = require('../roomUtils');

const router = express.Router();

// Register a new person
router.post('/', (req, res) => {
  const { name, roll_number, room_no, password } = req.body;

  if (!name || !roll_number || !room_no || !password) {
    return res.status(400).json({ error: 'name, roll_number, room_no, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Validate and normalize room number
  const roomError = validateRoom(room_no);
  if (roomError) {
    return res.status(400).json({ error: roomError });
  }
  const normalizedRoom = normalizeRoom(room_no);

  const db = getDb();

  // Check if roll number already exists
  const existing = db.prepare('SELECT id FROM people WHERE roll_number = ?').get(roll_number);
  if (existing) {
    return res.status(409).json({ error: 'A person with this roll number already exists' });
  }

  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);

  db.prepare('INSERT INTO people (id, name, roll_number, room_no, password_hash) VALUES (?, ?, ?, ?, ?)')
    .run(id, name.trim(), roll_number.trim(), normalizedRoom, password_hash);

  // Issue JWT so user is auto-logged-in after registration
  const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    person: {
      id,
      name: name.trim(),
      roll_number: roll_number.trim(),
      room_no: normalizedRoom,
    },
  });
});

// Search people by name or roll number (auth required)
// Does NOT return room_no for people the searcher isn't connected to
router.get('/search', verifyToken, (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const db = getDb();
  const query = `%${q.trim()}%`;

  // Return only name and roll_number for discovery — no room_no
  const people = db.prepare(`
    SELECT id, name, roll_number FROM people
    WHERE (name LIKE ? OR roll_number LIKE ?) AND id != ?
    LIMIT 20
  `).all(query, query, req.userId);

  res.json(people);
});

// Get current user's own profile (auth required)
router.get('/me', verifyToken, (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT id, name, roll_number, room_no FROM people WHERE id = ?').get(req.userId);
  if (!person) {
    return res.status(404).json({ error: 'Person not found' });
  }
  res.json(person);
});

// Get person by ID (auth required, returns only public info — no room_no)
router.get('/:id', verifyToken, (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT id, name, roll_number FROM people WHERE id = ?').get(req.params.id);
  if (!person) {
    return res.status(404).json({ error: 'Person not found' });
  }
  res.json(person);
});

module.exports = router;

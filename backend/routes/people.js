const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const router = express.Router();

// Register a new person
router.post('/', (req, res) => {
  const { name, roll_number, room_no } = req.body;

  if (!name || !roll_number || !room_no) {
    return res.status(400).json({ error: 'name, roll_number, and room_no are required' });
  }

  const db = getDb();

  // Check if roll number already exists
  const existing = db.prepare('SELECT id FROM people WHERE roll_number = ?').get(roll_number);
  if (existing) {
    return res.status(409).json({ error: 'A person with this roll number already exists', id: existing.id });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO people (id, name, roll_number, room_no) VALUES (?, ?, ?, ?)').run(id, name.trim(), roll_number.trim(), room_no.trim());

  res.status(201).json({ id, name: name.trim(), roll_number: roll_number.trim(), room_no: room_no.trim() });
});

// Search people by name, room number, or roll number
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const db = getDb();
  const query = `%${q.trim()}%`;
  const people = db.prepare(`
    SELECT id, name, roll_number, room_no FROM people
    WHERE name LIKE ? OR roll_number LIKE ? OR room_no LIKE ?
    LIMIT 20
  `).all(query, query, query);

  res.json(people);
});

// Get person by ID
router.get('/:id', (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT id, name, roll_number, room_no FROM people WHERE id = ?').get(req.params.id);
  if (!person) {
    return res.status(404).json({ error: 'Person not found' });
  }
  res.json(person);
});

// Get person by roll number (for login-like lookup)
router.get('/roll/:roll_number', (req, res) => {
  const db = getDb();
  const person = db.prepare('SELECT id, name, roll_number, room_no FROM people WHERE roll_number = ?').get(req.params.roll_number);
  if (!person) {
    return res.status(404).json({ error: 'Person not found' });
  }
  res.json(person);
});

module.exports = router;

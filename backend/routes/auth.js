const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Rate limiter: max 5 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
  const { roll_number, password } = req.body;

  if (!roll_number || !password) {
    return res.status(400).json({ error: 'roll_number and password are required' });
  }

  const db = getDb();
  const person = db.prepare('SELECT id, name, roll_number, room_no, previous_room, password_hash FROM people WHERE roll_number = ?').get(roll_number.trim());

  if (!person) {
    return res.status(401).json({ error: 'Invalid roll number or password' });
  }

  const valid = bcrypt.compareSync(password, person.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid roll number or password' });
  }

  // Issue JWT
  const token = jwt.sign({ id: person.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    person: {
      id: person.id,
      name: person.name,
      roll_number: person.roll_number,
      room_no: person.room_no,
      previous_room: person.previous_room,
    },
  });
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const peopleRoutes = require('./routes/people');
const connectionsRoutes = require('./routes/connections');
const searchRoutes = require('./routes/search');
const authRoutes = require('./routes/auth');
const swapRoutes = require('./routes/swaps');
const savedSearchRoutes = require('./routes/savedSearches');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/people', peopleRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/searches', savedSearchRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`RoomLink API server running on http://localhost:${PORT}`);
});

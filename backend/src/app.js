require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const logger = require('./config/logger');
const cron = require('node-cron');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const matchRoutes = require('./routes/matches');
const teamRoutes = require('./routes/teams');
const notificationRoutes = require('./routes/notifications');
const googleSheetsRoutes = require('./routes/googleSheets');
const { startSyncScheduler } = require('./services/syncScheduler');

// Inizializzazione app Express
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Connessione al database
connectDB();
startSyncScheduler();


// Rotte base per test
app.get('/', (req, res) => {
  res.json({ message: 'AIBVC Club Series API funzionante!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sheets', googleSheetsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Gestione errori
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? 'Error stack hidden in production' : err.stack,
  });
});

// Avvio del server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;

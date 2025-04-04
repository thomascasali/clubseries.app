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
const syncScheduler = require('./services/syncScheduler');
const notificationService = require('./services/notificationService');

// Inizializzazione app Express
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Connessione al database
connectDB();

// Inizializzazione dei servizi in modalità produzione
if (process.env.NODE_ENV === 'production') {
  // Inizializza il sync scheduler
  syncScheduler.initSyncScheduler();
  logger.info('Sync scheduler initialized');
  
  // Configura il job di elaborazione notifiche (ogni 5 minuti)
  cron.schedule('*/3 * * * *', async () => {
    try {
      logger.info('Running scheduled notification processing');
      await notificationService.processNotifications();
    } catch (error) {
      logger.error(`Error in notification processing cron job: ${error.message}`);
    }
  });
  logger.info('Notification scheduler initialized');
} else {
  logger.info('Schedulers not initialized in development mode');
}

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
app.use('/api/google-sheets', googleSheetsRoutes);

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
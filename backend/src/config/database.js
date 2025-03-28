const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    // Aggiungi ulteriori opzioni di connessione
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout dopo 5 secondi
      retryWrites: true,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    // Evita di chiudere l'app in modalità sviluppo
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
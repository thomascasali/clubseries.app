require('dotenv').config();
const mongoose = require('mongoose');
const syncScheduler = require('./src/services/syncScheduler');
const connectDB = require('./src/config/database');

async function testSyncAll() {
  try {
    console.log('Connessione al database...');
    await connectDB();
    
    console.log('\nAvvio sincronizzazione da Google Sheets per tutte le categorie...');
    await syncScheduler.syncFromGoogleSheets();
    
    console.log('\nSincronizzazione completata con successo!');
    
  } catch (error) {
    console.error('Errore durante la sincronizzazione:', error.message);
    if (error.response) {
      console.error('Response error data:', error.response.data);
    }
  } finally {
    // Chiudi la connessione MongoDB
    await mongoose.connection.close();
    console.log('Connessione MongoDB chiusa.');
    process.exit(0);
  }
}

testSyncAll();

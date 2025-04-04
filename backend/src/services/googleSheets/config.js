const { google } = require('googleapis');
const logger = require('../../config/logger');

// Configurazione delle credenziali Google
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Inizializzazione dell'API Sheets
let sheets;

try {
  sheets = google.sheets({ version: 'v4', auth });
  logger.info('Google Sheets API initialized successfully');
} catch (error) {
  logger.error(`Failed to initialize Google Sheets API: ${error.message}`);
  // Non lanciamo l'errore qui per evitare di bloccare l'avvio dell'app
  // ma potremmo impostare sheets come null e gestire questo caso altrove
}

module.exports = {
  sheets,
  auth
};
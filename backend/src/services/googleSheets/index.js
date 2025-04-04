const { sheets } = require('./config');
const { readSheet, readTeamsFromSheet, readMatchesFromSheet } = require('./readers');
const { writeSheet, syncMatchesToSheet } = require('./writers');
const { syncTeamsFromSheet, syncMatchesFromSheet, forceSyncMatchesFromSheet } = require('./syncers');
const { updateSheetTracking, hasSheetChanged } = require('./tracking');
const { parseDate, findTeamInText, getSheetInfo } = require('./utils');
const logger = require('../../config/logger');

/**
 * Funzione di test per verificare la connessione a Google Sheets
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @returns {Promise<Object>} - Informazioni sul foglio e dati di test
 */
const testSheetConnection = async (spreadsheetId) => {
  try {
    // Ottieni informazioni sul foglio
    const sheetInfo = await getSheetInfo(sheets, spreadsheetId);
    
    // Leggi squadre dal foglio "entry list"
    const teams = await readTeamsFromSheet(spreadsheetId);
    
    // Leggi le partite dai vari fogli
    const matches = await readMatchesFromSheet(spreadsheetId, "Under 21 M");
    
    return {
      sheetInfo,
      teams,
      matches: matches.slice(0, 5) // Restituisci solo le prime 5 partite per brevità
    };
  } catch (error) {
    logger.error(`Error testing Google Sheet connection: ${error.message}`);
    throw error;
  }
};

// Aggiungi questa funzione al file index.js

/**
 * Funzione di debug per verificare i Golden Set nel foglio
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria (es. "Under 21 M")
 * @returns {Promise<Object>} - Informazioni sui Golden Set trovati
 */
const debugGoldenSets = async (spreadsheetId, category) => {
  try {
    const matches = await readMatchesFromSheet(spreadsheetId, category);
    
    // Filtra solo i potenziali Golden Set
    const goldenMatches = matches.filter(match => 
      match.matchId.includes('G') || 
      match.teamACode === 'G' || 
      match.teamBCode === 'G' || 
      match.isGoldenSet
    );
    
    logger.info(`Found ${goldenMatches.length} potential Golden Sets`);
    
    return {
      total: matches.length,
      goldenSets: goldenMatches,
      summary: goldenMatches.map(m => ({
        matchId: m.matchId,
        teams: `${m.teamA} (${m.teamACode}) vs ${m.teamB} (${m.teamBCode})`,
        isGoldenSet: m.isGoldenSet,
        originalText: m.originalMatchText
      }))
    };
  } catch (error) {
    logger.error(`Error debugging Golden Sets: ${error.message}`);
    throw error;
  }
};

// Esporta tutte le funzioni necessarie
module.exports = {
  readSheet,
  writeSheet,
  readTeamsFromSheet,
  readMatchesFromSheet,
  syncTeamsFromSheet,
  syncMatchesToSheet,
  syncMatchesFromSheet,
  updateSheetTracking,
  hasSheetChanged,
  testSheetConnection,
  getSheetInfo,
  parseDate,
  findTeamInText,
  forceSyncMatchesFromSheet,
  debugGoldenSets
};
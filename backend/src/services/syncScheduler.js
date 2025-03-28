const cron = require('node-cron');
const logger = require('../config/logger');
const googleSheetsService = require('./googleSheetsService');
const Match = require('../models/Match');
const Team = require('../models/Team');
const notificationService = require('./notificationService');
const { getSheetIdForCategory } = require('../utils/sheetsUtils');

// Elenco di tutte le categorie
const ALL_CATEGORIES = [
  'Under 21 M', 'Under 21 F', 'Eccellenza M', 'Eccellenza F', 
  'Amatoriale M', 'Amatoriale F', 'Over 35 F', 'Over 40 F', 
  'Over 43 M', 'Over 50 M', 'Serie A Maschile', 'Serie A Femminile', 
  'Serie B Maschile', 'Serie B Femminile'
];

/**
 * Sincronizza i dati per una categoria specifica
 * @param {string} category - Categoria da sincronizzare
 */
const syncCategory = async (category) => {
  try {
    const spreadsheetId = getSheetIdForCategory(category);
    
    if (!spreadsheetId) {
      logger.warn(`No spreadsheet configured for category ${category}`);
      return;
    }
    
    logger.info(`Starting sync for category ${category}`);
    
    // Sincronizza team
    const teams = await googleSheetsService.syncTeamsFromSheet(
      spreadsheetId,
      category,
      Team
    );
    
    logger.info(`Synced ${teams.length} teams for ${category}`);
    
    // Sincronizza partite
    const matches = await googleSheetsService.syncMatchesFromSheet(
      spreadsheetId,
      category,
      Match,
      Team
    );
    
    logger.info(`Synced ${matches.length} matches for ${category}`);
    
    // Sincronizza risultati
    const matchesWithResults = await Match.find({
      category,
      scoreA: { $exists: true, $ne: [] },
      scoreB: { $exists: true, $ne: [] }
    }).populate('teamA teamB');
    
    await googleSheetsService.syncMatchesToSheet(
      spreadsheetId,
      category,
      matchesWithResults
    );
    
    logger.info(`Synced results for ${matchesWithResults.length} matches for ${category}`);
    
    // Processa notifiche
    await notificationService.processNotifications();
    
    logger.info(`Completed sync for category ${category}`);
  } catch (error) {
    logger.error(`Error syncing category ${category}: ${error.message}`);
  }
};

/**
 * Inizializza il pianificatore di sincronizzazione
 */
const initSyncScheduler = () => {
  // Sincronizza tutte le categorie ogni ora
  // Formato cron: minuto ora giorno mese giorno_settimana
  // "0 * * * *" significa "ogni ora all'inizio dell'ora"
  cron.schedule('0 * * * *', async () => {
    logger.info('Starting scheduled sync of all categories');
    
    for (const category of ALL_CATEGORIES) {
      await syncCategory(category);
    }
    
    logger.info('Completed scheduled sync of all categories');
  });
  
  // Sincronizza i risultati ogni 5 minuti
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Starting scheduled sync of match results');
    
    for (const category of ALL_CATEGORIES) {
      try {
        const spreadsheetId = getSheetIdForCategory(category);
        
        if (!spreadsheetId) continue;
        
        // Sincronizza solo i risultati
        const matchesWithResults = await Match.find({
          category,
          scoreA: { $exists: true, $ne: [] },
          scoreB: { $exists: true, $ne: [] }
        }).populate('teamA teamB');
        
        await googleSheetsService.syncMatchesToSheet(
          spreadsheetId,
          category,
          matchesWithResults
        );
        
        logger.info(`Synced results for ${matchesWithResults.length} matches for ${category}`);
      } catch (error) {
        logger.error(`Error syncing results for ${category}: ${error.message}`);
      }
    }
    
    logger.info('Completed scheduled sync of match results');
  });
  
  logger.info('Sync scheduler initialized');
};

module.exports = {
  initSyncScheduler,
  syncCategory
};
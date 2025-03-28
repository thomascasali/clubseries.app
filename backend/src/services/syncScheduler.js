const cron = require('node-cron');
const Team = require('../models/Team');
const Match = require('../models/Match');
const googleSheetsService = require('./googleSheetsService');
const logger = require('../config/logger');

/**
 * Avvia la sincronizzazione programmata con Google Sheets
 */
const startSyncScheduler = () => {
  // Esegui la sincronizzazione ogni ora
  cron.schedule('0 * * * *', async () => {
    logger.info('Starting scheduled Google Sheets synchronization');
    
    try {
      // Ottieni tutte le squadre con spreadsheetId
      const teams = await Team.find({ spreadsheetId: { $exists: true, $ne: '' } });
      
      for (const team of teams) {
        try {
          // Sincronizza dal foglio al database
          await googleSheetsService.syncMatchesFromSheet(
            team.spreadsheetId,
            team.category,
            Match,
            Team
          );
          
          // Trova le partite per questa categoria
          const matches = await Match.find({ category: team.category })
            .populate('teamA', 'name')
            .populate('teamB', 'name');
          
          // Sincronizza dal database al foglio
          await googleSheetsService.syncMatchesToSheet(
            team.spreadsheetId,
            team.category,
            matches
          );
          
          logger.info(`Completed sync for team ${team.name}, category ${team.category}`);
        } catch (error) {
          logger.error(`Error syncing for team ${team.name}: ${error.message}`);
        }
      }
      
      logger.info('Scheduled Google Sheets synchronization completed');
    } catch (error) {
      logger.error(`Error in scheduled sync: ${error.message}`);
    }
  });
  
  logger.info('Google Sheets sync scheduler started');
};

module.exports = {
  startSyncScheduler
};

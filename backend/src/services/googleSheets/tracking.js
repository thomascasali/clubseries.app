const logger = require('../../config/logger');
const SheetTracking = require('../../models/SheetTracking');

/**
 * Aggiorna il tracking per un foglio Google
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria
 * @param {string} matchesHash - Hash dei dati delle partite
 */
const updateSheetTracking = async (spreadsheetId, category, matchesHash = null) => {
  try {
    let tracking = await SheetTracking.findOne({ spreadsheetId, category });
    
    if (!tracking) {
      tracking = new SheetTracking({
        spreadsheetId,
        category,
        lastChecked: new Date(),
        lastModified: new Date()
      });
    } else {
      tracking.lastChecked = new Date();
    }
    
    if (matchesHash) {
      tracking.matchesHash = matchesHash;
      tracking.lastModified = new Date();
    }
    
    await tracking.save();
    logger.info(`Updated tracking for ${category} (${spreadsheetId})`);
    
  } catch (error) {
    logger.error(`Error updating sheet tracking: ${error.message}`);
    throw error;
  }
};

/**
 * Ottiene il tracking per un foglio Google
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria
 * @returns {Promise<Object>} - Oggetto tracking
 */
const getSheetTracking = async (spreadsheetId, category) => {
  try {
    const tracking = await SheetTracking.findOne({ spreadsheetId, category });
    return tracking;
  } catch (error) {
    logger.error(`Error getting sheet tracking: ${error.message}`);
    throw error;
  }
};

/**
 * Controlla se ci sono state modifiche nel foglio rispetto all'ultima sincronizzazione
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria
 * @param {string} newHash - Nuovo hash dei dati
 * @returns {Promise<boolean>} - True se ci sono state modifiche
 */
const hasSheetChanged = async (spreadsheetId, category, newHash) => {
  try {
    const tracking = await SheetTracking.findOne({ spreadsheetId, category });
    
    if (!tracking || !tracking.matchesHash) {
      logger.info(`Nessun tracking precedente trovato per ${category}, considerando come modificato`);
      return true; // Prima sincronizzazione o nessun hash precedente
    }
    
    const hasChanged = tracking.matchesHash !== newHash;
    logger.info(`Foglio ${category} ${hasChanged ? 'modificato' : 'non modificato'} (hash precedente: ${tracking.matchesHash.substring(0, 8)}..., nuovo hash: ${newHash.substring(0, 8)}...)`);
    
    return hasChanged;
  } catch (error) {
    logger.error(`Error checking if sheet has changed: ${error.message}`);
    return true; // In caso di errore, assumiamo che ci siano cambiamenti da processare
  }
};

module.exports = {
  updateSheetTracking,
  getSheetTracking,
  hasSheetChanged
};
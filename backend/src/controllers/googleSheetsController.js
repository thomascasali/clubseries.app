const googleSheetsService = require('../services/googleSheetsService');
const Team = require('../models/Team');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../config/logger');
const { getSheetIdForCategory } = require('../utils/sheetsUtils');

/**
 * @desc    Testa la connessione a Google Sheets
 * @route   GET /api/google-sheets/test/:category
 * @access  Private/Admin
 */
exports.testConnection = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Ottieni l'ID del foglio per questa categoria
    const spreadsheetId = getSheetIdForCategory(category);
    
    // Verifica che l'ID del foglio sia disponibile
    if (!spreadsheetId) {
      return res.status(400).json({ 
        success: false, 
        message: `Categoria non valida o ID del foglio non configurato: ${category}` 
      });
    }
    
    // Testa la connessione
    const result = await googleSheetsService.testSheetConnection(spreadsheetId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error testing Google Sheets connection: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Errore nel test di connessione a Google Sheets',
      error: error.message
    });
  }
};

/**
 * @desc    Sincronizza i team da Google Sheets al database
 * @route   POST /api/google-sheets/sync/teams/:category
 * @access  Private/Admin
 */
exports.syncTeams = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Ottieni l'ID del foglio per questa categoria
    const spreadsheetId = getSheetIdForCategory(category);
    
    // Verifica che l'ID del foglio sia disponibile
    if (!spreadsheetId) {
      return res.status(400).json({ 
        success: false, 
        message: `Categoria non valida o ID del foglio non configurato: ${category}` 
      });
    }
    
    // Sincronizza i team
    const syncedTeams = await googleSheetsService.syncTeamsFromSheet(
      spreadsheetId,
      category,
      Team
    );
    
    res.status(200).json({
      success: true,
      count: syncedTeams.length,
      data: syncedTeams
    });
  } catch (error) {
    logger.error(`Error syncing teams from Google Sheets: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Errore nella sincronizzazione dei team da Google Sheets',
      error: error.message
    });
  }
};

/**
 * @desc    Sincronizza le partite da Google Sheets al database
 * @route   POST /api/google-sheets/sync/matches/:category
 * @access  Private/Admin
 */
exports.syncMatches = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Ottieni l'ID del foglio per questa categoria
    const spreadsheetId = getSheetIdForCategory(category);
    
    // Verifica che l'ID del foglio sia disponibile
    if (!spreadsheetId) {
      return res.status(400).json({ 
        success: false, 
        message: `Categoria non valida o ID del foglio non configurato: ${category}` 
      });
    }
    
    // Prima sincronizza i team per assicurarsi che esistano
    await googleSheetsService.syncTeamsFromSheet(
      spreadsheetId,
      category,
      Team
    );
    
    // Poi sincronizza le partite
    const syncedMatches = await googleSheetsService.syncMatchesFromSheet(
      spreadsheetId,
      category,
      Match,
      Team
    );
    
    // Se sono state sincronizzate partite, invia notifiche agli utenti iscritti
    if (syncedMatches.length > 0) {
      await sendMatchNotifications(syncedMatches);
    }
    
    res.status(200).json({
      success: true,
      count: syncedMatches.length,
      data: syncedMatches
    });
  } catch (error) {
    logger.error(`Error syncing matches from Google Sheets: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Errore nella sincronizzazione delle partite da Google Sheets',
      error: error.message
    });
  }
};

/**
 * @desc    Sincronizza i risultati delle partite dal database a Google Sheets
 * @route   POST /api/google-sheets/sync/results/:category
 * @access  Private/Admin
 */
exports.syncResults = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Ottieni l'ID del foglio per questa categoria
    const spreadsheetId = getSheetIdForCategory(category);
    
    // Verifica che l'ID del foglio sia disponibile
    if (!spreadsheetId) {
      return res.status(400).json({ 
        success: false, 
        message: `Categoria non valida o ID del foglio non configurato: ${category}` 
      });
    }
    
    // Trova tutte le partite per questa categoria che hanno risultati
    const matches = await Match.find({
      category,
      scoreA: { $exists: true, $ne: [] },
      scoreB: { $exists: true, $ne: [] }
    }).populate('teamA teamB');
    
    // Sincronizza i risultati con il foglio Google
    await googleSheetsService.syncMatchesToSheet(
      spreadsheetId,
      category,
      matches
    );
    
    res.status(200).json({
      success: true,
      count: matches.length,
      message: `Sincronizzati risultati di ${matches.length} partite per la categoria ${category}`
    });
  } catch (error) {
    logger.error(`Error syncing results to Google Sheets: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Errore nella sincronizzazione dei risultati con Google Sheets',
      error: error.message
    });
  }
};

/**
 * @desc    Sincronizza tutti i dati per tutte le categorie
 * @route   POST /api/google-sheets/sync/all
 * @access  Private/Admin
 */
exports.syncAll = async (req, res) => {
  try {
    const results = {};
    const categories = [
      'Under 21 M', 'Under 21 F', 'Eccellenza M', 'Eccellenza F', 
      'Amatoriale M', 'Amatoriale F', 'Over 35 F', 'Over 40 F', 
      'Over 43 M', 'Over 50 M', 'Serie A Maschile', 'Serie A Femminile', 
      'Serie B Maschile', 'Serie B Femminile'
    ];
    
    // Per ogni categoria
    for (const category of categories) {
      // Ottieni l'ID del foglio per questa categoria
      const spreadsheetId = getSheetIdForCategory(category);
      
      // Salta se l'ID del foglio non è configurato
      if (!spreadsheetId) {
        results[category] = {
          success: false,
          message: 'ID del foglio non configurato'
        };
        continue;
      }
      
      try {
        // Sincronizza team
        const teams = await googleSheetsService.syncTeamsFromSheet(
          spreadsheetId,
          category,
          Team
        );
        
        // Sincronizza partite
        const matches = await googleSheetsService.syncMatchesFromSheet(
          spreadsheetId,
          category,
          Match,
          Team
        );
        
        // Se sono state sincronizzate partite, invia notifiche
        if (matches.length > 0) {
          await sendMatchNotifications(matches);
        }
        
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
        
        results[category] = {
          success: true,
          teams: teams.length,
          matches: matches.length,
          results: matchesWithResults.length
        };
      } catch (error) {
        logger.error(`Error syncing category ${category}: ${error.message}`);
        results[category] = {
          success: false,
          message: error.message
        };
      }
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error(`Error in syncAll: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Errore nella sincronizzazione di tutti i dati',
      error: error.message
    });
  }
};

/**
 * Invia notifiche per le partite sincronizzate
 * @param {Array} matches - Array di partite sincronizzate
 */
const sendMatchNotifications = async (matches) => {
  try {
    for (const match of matches) {
      // Popola i riferimenti alle squadre
      await match.populate('teamA', 'name');
      await match.populate('teamB', 'name');
      
      // Trova gli utenti iscritti alle squadre
      const usersTeamA = await User.find({ 
        subscribedTeams: match.teamA._id,
        isActive: true
      });
      
      const usersTeamB = await User.find({ 
        subscribedTeams: match.teamB._id,
        isActive: true
      });
      
      // Combina gli utenti unici
      const uniqueUsers = [...new Map([
        ...usersTeamA.map(u => [u._id.toString(), u]),
        ...usersTeamB.map(u => [u._id.toString(), u])
      ]).values()];
      
      // Formatta la data per la notifica
      const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const formattedDate = match.date 
        ? new Date(match.date).toLocaleDateString('it-IT', dateOptions)
        : 'Data da definire';
      
      // Crea notifiche per gli utenti
      for (const user of uniqueUsers) {
        // Determina se l'utente è iscritto alla squadra A o B (o entrambe)
        const isTeamA = usersTeamA.some(u => u._id.toString() === user._id.toString());
        const isTeamB = usersTeamB.some(u => u._id.toString() === user._id.toString());
        
        // Scegli la squadra appropriata per la notifica
        const teamId = isTeamA ? match.teamA._id : match.teamB._id;
        const myTeam = isTeamA ? match.teamA.name : match.teamB.name;
        const otherTeam = isTeamA ? match.teamB.name : match.teamA.name;
        
        // Crea il messaggio della notifica
        let message = `🏐 Nuova partita programmata!\n\n`;
        message += `${myTeam} vs ${otherTeam}\n`;
        message += `Data: ${formattedDate}\n`;
        message += `Orario: ${match.time}\n`;
        message += `Campo: ${match.court}\n`;
        
        // Se questa è un'aggiornamento di una partita esistente
        if (match.updatedAt && match.createdAt && 
            match.updatedAt.getTime() !== match.createdAt.getTime()) {
          message = `🔄 Aggiornamento partita!\n\n` + message;
        }
        
        // Crea la notifica
        await Notification.create({
          user: user._id,
          team: teamId,
          match: match._id,
          type: 'match_scheduled',
          message,
          status: 'pending'
        });
      }
    }
  } catch (error) {
    logger.error(`Error sending match notifications: ${error.message}`);
  }
};
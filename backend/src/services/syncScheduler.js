const cron = require('node-cron');
const logger = require('../config/logger');
const { getSheetIdForCategory } = require('../utils/sheetsUtils');
const googleSheetsService = require('./googleSheets');
const Team = require('../models/Team');
const Match = require('../models/Match');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Categorie supportate per la sincronizzazione
 */
const CATEGORIES = [
  'Under 21 M', 'Under 21 F', 'Eccellenza M', 'Eccellenza F', 
  'Amatoriale M', 'Amatoriale F', 'Over 35 F', 'Over 40 F', 
  'Over 43 M', 'Over 50 M', 'Serie A Maschile', 'Serie A Femminile', 
  'Serie B Maschile', 'Serie B Femminile'
];

/**
 * Invia notifiche agli utenti per le partite aggiornate
 * @param {Array} matches - Array di partite sincronizzate o aggiornate
 * @param {boolean} isNew - Indica se sono partite nuove o aggiornate
 */
const sendMatchNotifications = async (matches, isNew = false) => {
  try {
    for (const match of matches) {
      // Assicurati che i riferimenti alle squadre siano popolati
      await match.populate('teamA', 'name category');
      await match.populate('teamB', 'name category');
      
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
      
      // Determina il tipo di team (A, B o G)
      const teamALabel = match.teamACode === 'G' ? 'Golden Set' : `Team ${match.teamACode}`;
      const teamBLabel = match.teamBCode === 'G' ? 'Golden Set' : `Team ${match.teamBCode}`;
      
      // Crea notifiche per gli utenti
      for (const user of uniqueUsers) {
        // Determina se l'utente è iscritto alla squadra A o B (o entrambe)
        const isTeamA = usersTeamA.some(u => u._id.toString() === user._id.toString());
        const isTeamB = usersTeamB.some(u => u._id.toString() === user._id.toString());
        
        // Scegli la squadra appropriata per la notifica
        const teamId = isTeamA ? match.teamA._id : match.teamB._id;
        const myTeam = isTeamA ? match.teamA.name : match.teamB.name;
        const otherTeam = isTeamA ? match.teamB.name : match.teamA.name;
        const myTeamCode = isTeamA ? teamALabel : teamBLabel;
        const otherTeamCode = isTeamA ? teamBLabel : teamALabel;
        
        // Crea il messaggio della notifica
        let message;
        if (isNew) {
          message = `🏐 Nuova partita programmata!\n\n`;
        } else {
          message = `🔄 Aggiornamento partita!\n\n`;
        }
        
        // Aggiungi l'indicazione se è un golden set
        if (match.isGoldenSet) {
          message = `🏆 ${message.substring(2)}`;
        }
        
        message += `${myTeam} ${myTeamCode} vs ${otherTeam} ${otherTeamCode}\n`;
        message += `Data: ${formattedDate}\n`;
        message += `Orario: ${match.time}\n`;
        message += `Campo: ${match.court}\n`;
        message += `Fase: ${match.phase}\n`;
        
        // Se ci sono punteggi, aggiungili alla notifica
        if (match.scoreA.length > 0 && match.scoreB.length > 0) {
          const formattedScore = match.scoreA.map((score, idx) => 
            `${score}-${match.scoreB[idx]}`
          ).join(', ');
          
          message += `\nPunteggio: ${formattedScore}\n`;
          
          // Aggiunge il risultato finale
          let resultText = 'In attesa di conferma';
          if (match.confirmedByTeamA && match.confirmedByTeamB) {
            resultText = match.result === 'teamA' 
              ? `Vittoria ${match.teamA.name}` 
              : match.result === 'teamB' 
                ? `Vittoria ${match.teamB.name}` 
                : 'Pareggio';
          }
          
          message += `Risultato: ${resultText}`;
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
        
        logger.info(`Notification created for user ${user._id} about match ${match._id}`);
      }
    }
  } catch (error) {
    logger.error(`Error sending match notifications: ${error.message}`);
  }
};

/**
 * Funzione per sincronizzare dati da Google Sheets
 */
const syncFromGoogleSheets = async () => {
  logger.info('Starting scheduled sync from Google Sheets...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const category of CATEGORIES) {
    try {
      // Ottieni l'ID del foglio per questa categoria
      const spreadsheetId = getSheetIdForCategory(category);
      
      // Salta se non configurato
      if (!spreadsheetId) {
        logger.warn(`Skipping category ${category}: No spreadsheet ID configured`);
        continue;
      }
      
      logger.info(`Syncing category: ${category}`);
      
      // Sincronizza team
      const teams = await googleSheetsService.syncTeamsFromSheet(
        spreadsheetId,
        category,
        Team
      );
      
      // Conta il numero di partite prima della sincronizzazione
      const matchCountBefore = await Match.countDocuments({ category });
      
      // Sincronizza partite
      const matches = await googleSheetsService.syncMatchesFromSheet(
        spreadsheetId,
        category,
        Match,
        Team
      );
      
      // Se non ci sono modifiche, continuiamo con la categoria successiva
      if (matches.length === 0) {
        logger.info(`No changes for category ${category}`);
        continue;
      }
      
      // Filtra le partite nuove (create dopo l'ultima sincronizzazione)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const newMatches = matches.filter(match => 
        match.createdAt && match.createdAt > fiveMinutesAgo
      );
      
      // Filtra le partite aggiornate (non nuove)
      const updatedMatches = matches.filter(match => 
        match.updatedAt && match.createdAt && 
        match.updatedAt.getTime() > match.createdAt.getTime() + 60000 && // +1 minuto per evitare falsi positivi
        match.updatedAt > fiveMinutesAgo
      );
      
      // Se ci sono nuove partite, invia notifiche
      if (newMatches.length > 0) {
        await sendMatchNotifications(newMatches, true);
        logger.info(`Sent notifications for ${newMatches.length} new matches in ${category}`);
      }
      
      // Se ci sono partite aggiornate, invia notifiche
      if (updatedMatches.length > 0) {
        await sendMatchNotifications(updatedMatches, false);
        logger.info(`Sent notifications for ${updatedMatches.length} updated matches in ${category}`);
      }
      
      logger.info(`Synced ${teams.length} teams and ${matches.length} matches for ${category}`);
      successCount++;
    } catch (error) {
      logger.error(`Error syncing category ${category} from Google Sheets: ${error.message}`);
      errorCount++;
    }
  }
  
  logger.info(`Completed sync from Google Sheets: ${successCount} successful, ${errorCount} failed`);
};

/**
 * Inizializza lo scheduler di sincronizzazione
 */
const initSyncScheduler = () => {
  // Sincronizza da Google Sheets ogni 30 minuti
  cron.schedule('*/3 * * * *', async () => {
    try {
      await syncFromGoogleSheets();
    } catch (error) {
      logger.error(`Unhandled error in syncFromGoogleSheets cron job: ${error.message}`);
    }
  });
  
  // Esegui subito la sincronizzazione all'avvio
  setTimeout(async () => {
    try {
      logger.info('Running initial sync...');
      await syncFromGoogleSheets();
    } catch (error) {
      logger.error(`Error in initial sync: ${error.message}`);
    }
  }, 10000); // Attendi 10 secondi per assicurarsi che il database sia connesso
  
  logger.info('Sync scheduler initialized');
};

module.exports = {
  initSyncScheduler,
  syncFromGoogleSheets,
  sendMatchNotifications
};
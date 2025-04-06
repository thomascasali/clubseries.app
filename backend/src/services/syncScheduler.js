const cron = require('node-cron');
const logger = require('../config/logger');
const { getSheetIdForCategory } = require('../utils/sheetsUtils');
const googleSheetsService = require('./googleSheets');
const Team = require('../models/Team');
const Match = require('../models/Match');
const User = require('../models/User');
const Notification = require('../models/Notification');
const notificationService = require('./notificationService');

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
      // Ignora i Golden Set senza risultati
      if (match.isGoldenSet && 
          (!match.officialScoreA || !match.officialScoreA.length || 
           !match.officialScoreB || !match.officialScoreB.length)) {
        logger.info(`Skipping notification for Golden Set ${match.matchId} without scores`);
        continue;
      }

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
        let message;
        
        // Gestione specifica per i Golden Set
        if (match.isGoldenSet) {
          if (match.officialScoreA && match.officialScoreA.length > 0 && 
              match.officialScoreB && match.officialScoreB.length > 0) {
            // Golden Set con risultati
            const scoreA = match.officialScoreA[0];
            const scoreB = match.officialScoreB[0];
            
            message = `🏆 GOLDEN SET: Risultato finale!\n\n`;
            message += `${match.teamA.name} vs ${match.teamB.name}\n`;
            message += `Punteggio: ${scoreA}-${scoreB}\n`;
            
            // Determina il vincitore
            if (match.officialResult === 'teamA') {
              message += `Vittoria di ${match.teamA.name}`;
            } else if (match.officialResult === 'teamB') {
              message += `Vittoria di ${match.teamB.name}`;
            } else {
              message += `Risultato in attesa`;
            }
          } else {
            // Questo caso non dovrebbe verificarsi grazie al controllo all'inizio
            message = `🏆 GOLDEN SET programmato!\n\n`;
            message += `${match.teamA.name} vs ${match.teamB.name}\n`;
            message += `Data: ${formattedDate}\n`;
            message += `Orario: ${match.time}\n`;
            message += `Campo: ${match.court}\n`;
          }
        } else {
          // Match normali
          const teamALabel = match.teamACode ? `Team ${match.teamACode}` : '';
          const teamBLabel = match.teamBCode ? `Team ${match.teamBCode}` : '';
          const myTeamCode = isTeamA ? teamALabel : teamBLabel;
          const otherTeamCode = isTeamA ? teamBLabel : teamALabel;
          
          if (isNew) {
            message = `🏐 Nuova partita programmata!\n\n`;
          } else {
            message = `🔄 Aggiornamento partita!\n\n`;
          }
          
          message += `${myTeam}${myTeamCode ? ' ' + myTeamCode : ''} vs ${otherTeam}${otherTeamCode ? ' ' + otherTeamCode : ''}\n`;
          message += `Data: ${formattedDate}\n`;
          message += `Orario: ${match.time}\n`;
          message += `Campo: ${match.court}\n`;
          message += `Fase: ${match.phase}\n`;
          
          // Se ci sono punteggi ufficiali, aggiungili
          if (match.officialScoreA && match.officialScoreA.length > 0 && 
              match.officialScoreB && match.officialScoreB.length > 0) {
            const formattedScore = match.officialScoreA.map((score, idx) => 
              `${score}-${match.officialScoreB[idx]}`
            ).join(', ');
            
            message += `\nPunteggio: ${formattedScore}\n`;
            
            // Aggiungi il risultato finale
            let resultText = 'In attesa';
            if (match.officialResult === 'teamA') {
              resultText = `Vittoria ${match.teamA.name}`;
            } else if (match.officialResult === 'teamB') {
              resultText = `Vittoria ${match.teamB.name}`;
            } else if (match.officialResult === 'draw') {
              resultText = 'Pareggio';
            }
            
            message += `Risultato: ${resultText}`;
          }
        }
        
        // Verifica se esiste già una notifica simile per questo utente e match
        // per evitare notifiche duplicate
        const existingNotification = await Notification.findOne({
          user: user._id,
          match: match._id,
          type: 'match_scheduled',
          createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Ultime 30 minuti
        });
        
        if (existingNotification) {
          logger.info(`Skipping duplicate notification for user ${user._id} about match ${match._id} (previous notification exists within 30 minutes)`);
          continue;
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
    
    // Processa le notifiche immediatamente
    await notificationService.processNotifications();
    
  } catch (error) {
    logger.error(`Error sending match notifications: ${error.message}`);
  }
};

/**
 * Funzione per confrontare array
 * @param {Array} arr1 Primo array
 * @param {Array} arr2 Secondo array
 * @returns {boolean} True se gli array sono uguali
 */
const arraysEqual = (arr1, arr2) => {
  if (!arr1 && !arr2) return true;
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  
  return true;
};

/**
 * Funzione per verificare se i dati della partita sono effettivamente cambiati
 * @param {Object} newMatch Nuovi dati della partita
 * @param {Object} oldMatch Vecchi dati della partita (dal database)
 * @returns {boolean} True se ci sono modifiche significative
 */
const hasSignificantChanges = (newMatch, oldMatch) => {
  if (!oldMatch) return true; // Se non c'è un match precedente, è considerato nuovo
  
  // Controlliamo solo i campi che generano notifiche quando cambiano
  const significantChanges = 
    newMatch.date?.toString() !== oldMatch.date?.toString() ||
    newMatch.time !== oldMatch.time ||
    newMatch.court !== oldMatch.court ||
    newMatch.phase !== oldMatch.phase ||
    !arraysEqual(newMatch.officialScoreA, oldMatch.officialScoreA) ||
    !arraysEqual(newMatch.officialScoreB, oldMatch.officialScoreB) ||
    newMatch.officialResult !== oldMatch.officialResult;
  
  if (significantChanges) {
    logger.info(`Significant changes detected for match ${newMatch.matchId}`);
    return true;
  }
  
  return false;
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
      
      // Prima otteniamo le partite esistenti dal database per il confronto
      const existingMatches = await Match.find({ category }).lean();
      
      // Mappa per un accesso rapido ai dati precedenti
      const matchesMap = new Map();
      existingMatches.forEach(match => {
        matchesMap.set(match.matchId, match);
      });
      
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
      
      // Se non ci sono modifiche, continuiamo con la categoria successiva
      if (matches.length === 0) {
        logger.info(`No changes for category ${category}`);
        continue;
      }
      
      // Filtra le partite nuove (create dopo l'ultima sincronizzazione)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      // Aggiungiamo informazioni su modifiche significative
      const newAndUpdatedMatches = matches.map(match => {
        const existingMatch = matchesMap.get(match.matchId);
        
        // Flag per match creato recentemente
        const isNew = !existingMatch || 
                     (match.createdAt && match.createdAt > fiveMinutesAgo);
        
        // Flag per modifiche significative
        const hasChanges = hasSignificantChanges(match, existingMatch);
        
        // Flag per aggiornamento recente
        const isRecentUpdate = match.updatedAt && match.createdAt && 
                              match.updatedAt.getTime() > match.createdAt.getTime() + 60000 && 
                              match.updatedAt > fiveMinutesAgo;
        
        return {
          ...match,
          _isNew: isNew,
          _hasChanges: hasChanges,
          _isRecentUpdate: isRecentUpdate
        };
      });
      
      // Filtra le partite nuove
      const newMatches = newAndUpdatedMatches.filter(match => {
        // Solo match nuovi con modifiche significative
        if (match._isNew && match._hasChanges) {
          // Per i Golden Set, consideriamo solo quelli con punteggi
          if (match.isGoldenSet) {
            return match.officialScoreA && match.officialScoreA.length > 0;
          }
          return true;
        }
        return false;
      });
      
      // Filtra le partite aggiornate (non nuove)
      const updatedMatches = newAndUpdatedMatches.filter(match => {
        // Solo match aggiornati recentemente con modifiche significative
        if (!match._isNew && match._isRecentUpdate && match._hasChanges) {
          // Per i Golden Set, consideriamo solo quelli che hanno avuto un cambio di risultato
          if (match.isGoldenSet) {
            return match.resultChanged === true;
          }
          return true;
        }
        return false;
      });
      
      logger.info(`Category ${category}: Found ${newMatches.length} new and ${updatedMatches.length} updated matches with significant changes`);
      
      // Se ci sono nuove partite, invia notifiche
      if (newMatches.length > 0) {
        logger.info(`Found ${newMatches.length} new matches in ${category}, sending notifications...`);
        await sendMatchNotifications(newMatches, true);
      }
      
      // Se ci sono partite aggiornate, invia notifiche
      if (updatedMatches.length > 0) {
        logger.info(`Found ${updatedMatches.length} updated matches in ${category}, sending notifications...`);
        await sendMatchNotifications(updatedMatches, false);
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
  // Sincronizza da Google Sheets ogni 3 minuti
  cron.schedule('*/10 * * * *', async () => {  // Modificato da */3 a */10 per ridurre la frequenza
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
  
  logger.info('Sync scheduler initialized with 10-minute interval');
};

module.exports = {
  initSyncScheduler,
  syncFromGoogleSheets,
  sendMatchNotifications
};
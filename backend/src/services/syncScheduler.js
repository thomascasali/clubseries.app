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
 * Determina il tipo specifico di modifica
 * @param {Object} newMatch Nuovi dati della partita
 * @param {Object} oldMatch Vecchi dati della partita
 * @returns {string} Tipo di modifica
 */
const determineChangeType = (newMatch, oldMatch) => {
  if (!oldMatch) return 'new_match';
  
  // Controlla se sono cambiati i risultati
  if (!arraysEqual(newMatch.officialScoreA, oldMatch.officialScoreA) || 
      !arraysEqual(newMatch.officialScoreB, oldMatch.officialScoreB) ||
      newMatch.officialResult !== oldMatch.officialResult) {
    logger.info(`Risultati modificati per il match ${newMatch.matchId}: 
      - Score A: ${JSON.stringify(oldMatch.officialScoreA)} → ${JSON.stringify(newMatch.officialScoreA)}
      - Score B: ${JSON.stringify(oldMatch.officialScoreB)} → ${JSON.stringify(newMatch.officialScoreB)}
      - Risultato: ${oldMatch.officialResult} → ${newMatch.officialResult}`);
    return 'results_changed';
  }
  
  // Controlla se è cambiato l'orario
  if (newMatch.time !== oldMatch.time) return 'time_changed';
  
  // Controlla se è cambiato il campo
  if (newMatch.court !== oldMatch.court) return 'court_changed';
  
  // Controlla se è cambiata la data
  if (newMatch.date?.toString() !== oldMatch.date?.toString()) return 'date_changed';
  
  // Altro tipo di cambiamento
  return 'other_change';
};

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
        continue;
      }

      let matchWithTeams = match;

      // Verifica se l'oggetto è un documento Mongoose o un oggetto plain
      if (!match.populate && (typeof match.teamA === 'string' || typeof match.teamA?.toString === 'function')) {
        // È un oggetto plain, dobbiamo ottenere il documento completo
        matchWithTeams = await Match.findById(match._id)
          .populate('teamA', 'name category')
          .populate('teamB', 'name category');
        
        if (!matchWithTeams) {
          logger.warn(`Match ${match._id || match.matchId} not found in database, skipping notification`);
          continue;
        }
      } else if (match.populate) {
        // È un documento Mongoose, popola i riferimenti
        await match.populate('teamA', 'name category');
        await match.populate('teamB', 'name category');
        matchWithTeams = match;
      }
      
      // Trova gli utenti iscritti alle squadre
      const usersTeamA = await User.find({ 
        subscribedTeams: matchWithTeams.teamA._id,
        isActive: true
      });
      
      const usersTeamB = await User.find({ 
        subscribedTeams: matchWithTeams.teamB._id,
        isActive: true
      });
      
      // Combina gli utenti unici
      const uniqueUsers = [...new Map([
        ...usersTeamA.map(u => [u._id.toString(), u]),
        ...usersTeamB.map(u => [u._id.toString(), u])
      ]).values()];
      
      if (uniqueUsers.length === 0) {
        continue; // Salta se nessun utente è iscritto
      }
      
      // Formatta la data per la notifica
      const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const formattedDate = matchWithTeams.date 
        ? new Date(matchWithTeams.date).toLocaleDateString('it-IT', dateOptions)
        : 'Data da definire';
      
      // Crea notifiche per gli utenti
      for (const user of uniqueUsers) {
        // Determina se l'utente è iscritto alla squadra A o B (o entrambe)
        const isTeamA = usersTeamA.some(u => u._id.toString() === user._id.toString());
        const isTeamB = usersTeamB.some(u => u._id.toString() === user._id.toString());
        
        // Scegli la squadra appropriata per la notifica
        const teamId = isTeamA ? matchWithTeams.teamA._id : matchWithTeams.teamB._id;
        const myTeam = isTeamA ? matchWithTeams.teamA.name : matchWithTeams.teamB.name;
        const otherTeam = isTeamA ? matchWithTeams.teamB.name : matchWithTeams.teamA.name;
        
        // Determina il tipo di notifica e di cambiamento
        let notificationType = 'match_scheduled';
        const changeType = match._changeType || (isNew ? 'new_match' : 'other_change');

        if (changeType === 'new_match') {
          notificationType = 'match_scheduled';
          logger.info(`Creazione notifica per nuova partita: ${matchWithTeams.matchId}`);
        } else if (changeType === 'results_changed') {
          notificationType = 'result_updated';
          logger.info(`Creazione notifica per risultati modificati: match ${matchWithTeams.matchId}, team ${matchWithTeams.teamA.name} vs ${matchWithTeams.teamB.name}`);
        } else if (['time_changed', 'court_changed', 'date_changed', 'other_change'].includes(changeType)) {
          notificationType = 'match_updated';
          logger.info(`Creazione notifica per aggiornamento partita (${changeType}): ${matchWithTeams.matchId}`);
        }
        
        // Crea il messaggio della notifica
        let message;
        
        // Gestione specifica per i Golden Set
        if (matchWithTeams.isGoldenSet) {
          if (matchWithTeams.officialScoreA && matchWithTeams.officialScoreA.length > 0 && 
              matchWithTeams.officialScoreB && matchWithTeams.officialScoreB.length > 0) {
            // Golden Set con risultati
            const scoreA = matchWithTeams.officialScoreA[0];
            const scoreB = matchWithTeams.officialScoreB[0];
            
            message = `🏆 GOLDEN SET: Risultato finale!\n\n`;
            message += `${matchWithTeams.teamA.name} vs ${matchWithTeams.teamB.name}\n`;
            message += `Punteggio: ${scoreA}-${scoreB}\n`;
            
            // Determina il vincitore
            if (matchWithTeams.officialResult === 'teamA') {
              message += `Vittoria di ${matchWithTeams.teamA.name}`;
            } else if (matchWithTeams.officialResult === 'teamB') {
              message += `Vittoria di ${matchWithTeams.teamB.name}`;
            } else {
              message += `Risultato in attesa`;
            }
          } else {
            // Questo caso non dovrebbe verificarsi grazie al controllo all'inizio
            message = `🏆 GOLDEN SET programmato!\n\n`;
            message += `${matchWithTeams.teamA.name} vs ${matchWithTeams.teamB.name}\n`;
            message += `Data: ${formattedDate}\n`;
            message += `Orario: ${matchWithTeams.time}\n`;
            message += `Campo: ${matchWithTeams.court}\n`;
          }
        } else {
          // Match normali
          const teamALabel = matchWithTeams.teamACode ? `Team ${matchWithTeams.teamACode}` : '';
          const teamBLabel = matchWithTeams.teamBCode ? `Team ${matchWithTeams.teamBCode}` : '';
          const myTeamCode = isTeamA ? teamALabel : teamBLabel;
          const otherTeamCode = isTeamA ? teamBLabel : teamALabel;
          
          // Imposta l'inizio del messaggio in base al tipo di notifica
          if (notificationType === 'match_scheduled') {
            message = `🏐 Nuova partita programmata!\n\n`;
          } else if (notificationType === 'match_updated') {
            if (changeType === 'time_changed') {
              message = `🕒 Cambio orario partita!\n\n`;
            } else if (changeType === 'court_changed') {
              message = `🏟️ Cambio campo partita!\n\n`;
            } else if (changeType === 'date_changed') {
              message = `📅 Cambio data partita!\n\n`;
            } else {
              message = `🔄 Aggiornamento partita!\n\n`;
            }
          } else if (notificationType === 'result_updated') {
            message = `📊 Risultato aggiornato!\n\n`;
          }
          
          message += `${myTeam}${myTeamCode ? ' ' + myTeamCode : ''} vs ${otherTeam}${otherTeamCode ? ' ' + otherTeamCode : ''}\n`;
          message += `Data: ${formattedDate}\n`;
          message += `Orario: ${matchWithTeams.time}\n`;
          message += `Campo: ${matchWithTeams.court}\n`;
          message += `Fase: ${matchWithTeams.phase}\n`;
          
          // Se ci sono punteggi ufficiali, aggiungili
          if (matchWithTeams.officialScoreA && matchWithTeams.officialScoreA.length > 0 && 
              matchWithTeams.officialScoreB && matchWithTeams.officialScoreB.length > 0) {
            const formattedScore = matchWithTeams.officialScoreA.map((score, idx) => 
              `${score}-${matchWithTeams.officialScoreB[idx]}`
            ).join(', ');
            
            message += `\nPunteggio: ${formattedScore}\n`;
            
            // Aggiungi il risultato finale
            let resultText = 'In attesa';
            if (matchWithTeams.officialResult === 'teamA') {
              resultText = `Vittoria ${matchWithTeams.teamA.name}`;
            } else if (matchWithTeams.officialResult === 'teamB') {
              resultText = `Vittoria ${matchWithTeams.teamB.name}`;
            } else if (matchWithTeams.officialResult === 'draw') {
              resultText = 'Pareggio';
            }
            
            message += `Risultato: ${resultText}`;
          }
        }
        
        // Verifica se esiste già una notifica simile per questo utente e match
        // per evitare notifiche duplicate
        const existingNotification = await Notification.findOne({
          user: user._id,
          match: matchWithTeams._id,
          type: notificationType,
          createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Ultime 30 minuti
        });
        
        if (existingNotification) {
          continue;
        }
        
        // Crea la notifica
        await Notification.create({
          user: user._id,
          team: teamId,
          match: matchWithTeams._id,
          type: notificationType,
          message,
          status: 'pending'
        });
        logger.info(`Notifica creata per utente ${user._id} e match ${matchWithTeams.matchId} (tipo: ${notificationType})`);
      }
    }
    
    // Processa le notifiche immediatamente
    try {
      logger.info(`Avvio elaborazione notifiche per ${matches.length} partite`);
      await notificationService.processNotifications();
      logger.info(`Elaborazione notifiche completata`);
    } catch (notifError) {
      logger.error(`Errore durante l'elaborazione delle notifiche: ${notifError.message}`);
    }
    
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
  
  return significantChanges;
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
        continue;
      }
      
      // Prima otteniamo le partite esistenti dal database per il confronto
      // Non usiamo lean() per mantenere i metodi Mongoose
      const existingMatches = await Match.find({ category });
      
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
        
        // Determina il tipo specifico di modifica
        const changeType = determineChangeType(match, existingMatch);
        
        return {
          ...match.toObject(),  // Converti il documento Mongoose in un oggetto plain
          _isNew: isNew,
          _hasChanges: hasChanges,
          _isRecentUpdate: isRecentUpdate,
          _changeType: changeType
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
      
      // Registra solo se ci sono match rilevanti
      if (newMatches.length > 0 || updatedMatches.length > 0) {
        logger.info(`Category ${category}: Found ${newMatches.length} new and ${updatedMatches.length} updated matches with significant changes`);
        
        // Log dettagliato dei tipi di cambiamenti
        if (updatedMatches.length > 0) {
          const changeTypes = {};
          updatedMatches.forEach(match => {
            const type = match._changeType || 'unknown';
            changeTypes[type] = (changeTypes[type] || 0) + 1;
          });
          logger.info(`Updated matches by change type: ${JSON.stringify(changeTypes)}`);
        }
      }
      
      // Se ci sono nuove partite, invia notifiche
      if (newMatches.length > 0) {
        await sendMatchNotifications(newMatches, true);
      }
      
      // Se ci sono partite aggiornate, invia notifiche
      if (updatedMatches.length > 0) {
        await sendMatchNotifications(updatedMatches, false);
      }
      
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
  // Sincronizza da Google Sheets ogni 10 minuti
  cron.schedule('*/10 * * * *', async () => {
    try {
      await syncFromGoogleSheets();

      // Invia le notifiche solo dopo la sincronizzazione
      try {
        logger.info('📣 Avvio elaborazione notifiche post-sincronizzazione');
        await notificationService.processNotifications();
      } catch (notifError) {
        logger.error(`❌ Errore durante l'elaborazione delle notifiche: ${notifError.message}`);
      }

    } catch (error) {
      logger.error(`Errore non gestito nella sincronizzazione con Google Sheets: ${error.message}`);
    }
  });

  // Esegui subito la sincronizzazione all'avvio
  setTimeout(async () => {
    try {
      logger.info('⏱️ Avvio sincronizzazione iniziale...');
      await syncFromGoogleSheets();
      logger.info('📣 Avvio elaborazione notifiche post-sincronizzazione iniziale');
      await notificationService.processNotifications();
    } catch (error) {
      logger.error(`Errore durante la sincronizzazione iniziale: ${error.message}`);
    }
  }, 10000);

  logger.info('✅ Sync scheduler inizializzato con intervallo di 10 minuti');
};

module.exports = {
  initSyncScheduler,
  syncFromGoogleSheets,
  sendMatchNotifications
};
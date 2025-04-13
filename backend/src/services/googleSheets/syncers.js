// backend/src/services/googleSheets/syncers.js

const logger = require('../../config/logger');
const crypto = require('crypto');
const { readTeamsFromSheet, readMatchesFromSheet, groupMatchesByBaseId } = require('./readers');
const { updateSheetTracking, hasSheetChanged } = require('./tracking');
const SheetTracking = require('../../models/SheetTracking');

/**
 * Sincronizza i team dal foglio Google Sheets al database
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria
 * @param {Object} Team - Modello Team di Mongoose
 * @returns {Promise<Array>} - Array di team sincronizzati
 */
const syncTeamsFromSheet = async (spreadsheetId, category, Team) => {
  try {
    logger.info(`Syncing teams for category ${category} from spreadsheet ${spreadsheetId}`);
    
    const teamsFromSheet = await readTeamsFromSheet(spreadsheetId);
    if (teamsFromSheet.length === 0) {
      logger.warn(`No teams found for category ${category}`);
      return [];
    }
    
    const syncedTeams = [];
    
    for (const teamData of teamsFromSheet) {
      try {
        // Se il team esiste già, lo aggiorniamo, altrimenti lo creiamo
        let team = await Team.findOne({ name: teamData.name, category });
        if (!team) {
          // Genera una password casuale per ogni nuovo team
          const password = Math.random().toString(36).substring(2, 10);
          
          team = await Team.create({
            name: teamData.name,
            category,
            spreadsheetId,
            password,
            players: []
          });
          logger.info(`Created new team: ${team.name} with password: ${password}`);
        }
        
        syncedTeams.push(team);
      } catch (error) {
        logger.error(`Error syncing team ${teamData.name}: ${error.message}`);
      }
    }
    
    logger.info(`Successfully synced ${syncedTeams.length} teams for category ${category}`);
    return syncedTeams;
  } catch (error) {
    logger.error(`Error syncing teams from sheet: ${error.message}`);
    throw error;
  }
};

/**
 * Verifica se un match è cambiato rispetto al database
 * @param {Object} existingMatch - Match nel database
 * @param {Object} newMatch - Nuovo match dal foglio
 * @returns {boolean} - true se il match è cambiato
 */
const isMatchChanged = (existingMatch, newMatch) => {
  if (!existingMatch) return true;
  
  // Verifica cambiamenti nei campi principali
  return (
    existingMatch.date?.toISOString() !== newMatch.date?.toISOString() ||
    existingMatch.time !== newMatch.time ||
    existingMatch.court !== newMatch.court ||
    existingMatch.phase !== newMatch.phase ||
    JSON.stringify(existingMatch.officialScoreA) !== JSON.stringify(newMatch.officialScoreA) ||
    JSON.stringify(existingMatch.officialScoreB) !== JSON.stringify(newMatch.officialScoreB) ||
    existingMatch.officialResult !== newMatch.officialResult
  );
};

/**
 * Sincronizza i match dal foglio Google Sheets al database
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria
 * @param {Object} Match - Modello Match di Mongoose
 * @param {Object} Team - Modello Team di Mongoose
 * @returns {Promise<Array>} - Array di match sincronizzati
 */
const syncMatchesFromSheet = async (spreadsheetId, category, Match, Team) => {
  try {
    logger.info(`Syncing matches for category ${category} from spreadsheet ${spreadsheetId}`);
    
    // Leggiamo i match dal foglio
    const matchesFromSheet = await readMatchesFromSheet(spreadsheetId, category);
    
    if (matchesFromSheet.length === 0) {
      logger.warn(`No matches found for category ${category}`);
      return [];
    }
    
    // Calcoliamo l'hash dei dati per il tracking
    const dataHash = crypto.createHash('md5').update(JSON.stringify(matchesFromSheet)).digest('hex');
    
    // Controlliamo se ci sono stati cambiamenti dall'ultima sincronizzazione
    if (!(await hasSheetChanged(spreadsheetId, category, dataHash))) {
      logger.info(`No changes detected for category ${category}`);
      return await Match.find({ category });
    }
    
    // Raggruppiamo i match per ID base per gestire relazioni tra A, B e G
    const groupedMatches = groupMatchesByBaseId(matchesFromSheet);
    
    logger.info(`Found ${Object.keys(groupedMatches).length} match groups for category ${category}`);
    
    // Array per i match sincronizzati
    const syncedMatchesMap = new Map(); // Usiamo una Map per tracciare i match sincronizzati per ID
    
    // Primo passo: sincronizzare tutti i match (sia normali che Golden Set)
    for (const matchData of matchesFromSheet) {
      try {
        // Se i nomi dei team sono numeri (come negli errori del log), li saltiamo
        if (!isNaN(matchData.teamA) || !isNaN(matchData.teamB)) {
          logger.warn(`Skipping match ${matchData.matchId} - Teams appear to be numbers: A=${matchData.teamA}, B=${matchData.teamB}`);
          continue;
        }
        
        // Troviamo i team nel database
        const [teamA, teamB] = await Promise.all([
          Team.findOne({ name: matchData.teamA, category }),
          Team.findOne({ name: matchData.teamB, category })
        ]);
        
        if (!teamA || !teamB) {
          logger.warn(`Skipping match ${matchData.matchId} - Missing teams: A=${matchData.teamA}, B=${matchData.teamB}`);
          continue;
        }
        
        // Prepariamo i dati per l'aggiornamento
        const updateData = {
          phase: matchData.phase,
          date: matchData.date,
          time: matchData.time,
          court: matchData.court,
          teamA: teamA._id,
          teamB: teamB._id,
          teamACode: matchData.teamACode,
          teamBCode: matchData.teamBCode,
          isGoldenSet: matchData.isGoldenSet,
          spreadsheetRow: matchData.spreadsheetRow,
          sheetName: matchData.sheetName,
          officialScoreA: matchData.officialScoreA,
          officialScoreB: matchData.officialScoreB,
          officialResult: matchData.officialResult,
          category: category,
          baseMatchId: matchData.baseMatchId
        };
        
        // Verifichiamo se il match esiste già
        const existingMatch = await Match.findOne({ matchId: matchData.matchId });
        
        // Aggiorniamo solo se ci sono cambiamenti o se il match non esiste
        if (!existingMatch || isMatchChanged(existingMatch, updateData)) {
          // Aggiorniamo o creiamo il match
          const match = await Match.findOneAndUpdate(
            { matchId: matchData.matchId },
            updateData,
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
          
          syncedMatchesMap.set(matchData.matchId, match);
          
          logger.info(`Synced ${matchData.isGoldenSet ? 'Golden Set' : 'match'}: ${match.matchId}`);
        } else {
          // Se non ci sono cambiamenti, aggiungiamo comunque il match all'array dei sincronizzati
          syncedMatchesMap.set(matchData.matchId, existingMatch);
        }
      } catch (error) {
        logger.error(`Error syncing match ${matchData.matchId}: ${error.message}`);
      }
    }
    
    // Convertiamo la Map in array
    const syncedMatches = Array.from(syncedMatchesMap.values());
    
    // Secondo passo: collegare i match tra loro
    // Per ogni gruppo di match
    for (const [baseId, group] of Object.entries(groupedMatches)) {
      try {
        // Troviamo i match di tipo A, B e G nel gruppo
        const teamAMatchData = group.find(m => m.matchId.endsWith('A'));
        const teamBMatchData = group.find(m => m.matchId.endsWith('B'));
        const goldenSetData = group.find(m => m.isGoldenSet);
        
        // Troviamo i corrispondenti match sincronizzati nel database
        const teamAMatch = teamAMatchData ? syncedMatchesMap.get(teamAMatchData.matchId) : null;
        const teamBMatch = teamBMatchData ? syncedMatchesMap.get(teamBMatchData.matchId) : null;
        const goldenSet = goldenSetData ? syncedMatchesMap.get(goldenSetData.matchId) : null;
        
        // Se abbiamo trovato un Golden Set, colleghiamolo ai match A e B
        if (goldenSet) {
          // Collegamento bidirezionale tra match di tipo A e Golden Set
          if (teamAMatch) {
            teamAMatch.relatedMatchId = goldenSet._id.toString();
            await teamAMatch.save();
            
            logger.info(`Linked Team A match ${teamAMatch.matchId} to Golden Set ${goldenSet.matchId}`);
          }
          
          // Collegamento bidirezionale tra match di tipo B e Golden Set
          if (teamBMatch) {
            teamBMatch.relatedMatchId = goldenSet._id.toString();
            await teamBMatch.save();
            
            logger.info(`Linked Team B match ${teamBMatch.matchId} to Golden Set ${goldenSet.matchId}`);
          }
          
          // Aggiorniamo il Golden Set per collegarlo a uno dei match di base (preferibilmente A)
          const relatedMatch = teamAMatch || teamBMatch;
          
          if (relatedMatch) {
            goldenSet.relatedMatchId = relatedMatch._id.toString();
            await goldenSet.save();
            
            logger.info(`Linked Golden Set ${goldenSet.matchId} to match ${relatedMatch.matchId}`);
          }
        } else if (teamAMatch && teamBMatch) {
          // Collegamento tra match di tipo A e B (se non c'è Golden Set)
          teamAMatch.relatedMatchId = teamBMatch._id.toString();
          teamBMatch.relatedMatchId = teamAMatch._id.toString();
          
          await Promise.all([teamAMatch.save(), teamBMatch.save()]);
          
          logger.info(`Linked Team A match ${teamAMatch.matchId} and Team B match ${teamBMatch.matchId}`);
        }
      } catch (error) {
        logger.error(`Error linking matches for base ID ${baseId}: ${error.message}`);
      }
    }
    
    // Aggiorniamo il tracking con il nuovo hash
    await updateSheetTracking(spreadsheetId, category, dataHash);
    
    // Statistiche finali
    const synced = {
      total: syncedMatches.length,
      normal: syncedMatches.filter(m => !m.isGoldenSet).length,
      goldenSets: syncedMatches.filter(m => m.isGoldenSet).length
    };
    
    logger.info(`Sync complete for category ${category}: ${synced.total} matches (${synced.normal} normal, ${synced.goldenSets} Golden Sets)`);
    
    return syncedMatches;
  } catch (error) {
    logger.error(`Error syncing matches from sheet: ${error.message}`);
    throw error;
  }
};

/**
 * Forza la sincronizzazione dei match, eliminando prima tutti i dati esistenti
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria
 * @param {Object} Match - Modello Match di Mongoose
 * @param {Object} Team - Modello Team di Mongoose
 * @returns {Promise<Array>} - Array di match sincronizzati
 */
const forceSyncMatchesFromSheet = async (spreadsheetId, category, Match, Team) => {
  try {
    logger.info(`Force syncing matches for category ${category} from spreadsheet ${spreadsheetId}`);
    
    // Prima eliminiamo tutti i match esistenti per questa categoria
    const deleteResult = await Match.deleteMany({ category });
    logger.info(`Deleted ${deleteResult.deletedCount} existing matches for category ${category}`);
    
    // Poi eliminiamo i dati di tracking per questa categoria
    await SheetTracking.deleteMany({ spreadsheetId, category });
    logger.info(`Reset tracking data for spreadsheet ${spreadsheetId}, category ${category}`);
    
    // Ora sincronizziamo i match da zero
    return await syncMatchesFromSheet(spreadsheetId, category, Match, Team);
  } catch (error) {
    logger.error(`Error force syncing matches from sheet: ${error.message}`);
    throw error;
  }
};

module.exports = {
  syncTeamsFromSheet,
  syncMatchesFromSheet,
  forceSyncMatchesFromSheet
};
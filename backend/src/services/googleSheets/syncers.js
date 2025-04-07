const logger = require('../../config/logger');
const crypto = require('crypto');
const { readTeamsFromSheet, readMatchesFromSheet } = require('./readers');
const { updateSheetTracking, hasSheetChanged } = require('./tracking');
const SheetTracking = require('../../models/SheetTracking');

const syncTeamsFromSheet = async (spreadsheetId, category, Team) => {
  const teamsFromSheet = await readTeamsFromSheet(spreadsheetId);
  if (teamsFromSheet.length === 0) {
    logger.info(`No teams found for category ${category}`);
    return [];
  }

  const syncedTeams = [];

  for (const teamData of teamsFromSheet) {
    let team = await Team.findOne({ name: teamData.name, category });
    if (!team) {
      team = await Team.create({
        name: teamData.name,
        category,
        spreadsheetId,
        password: Math.random().toString(36).substring(2, 10),
        players: []
      });
      logger.info(`Created new team: ${team.name}`);
    }
    syncedTeams.push(team);
  }

  return syncedTeams;
};

const syncMatchesFromSheet = async (spreadsheetId, category, Match, Team) => {
  const matchesFromSheet = await readMatchesFromSheet(spreadsheetId, category);
  if (matchesFromSheet.length === 0) {
    logger.info(`No matches found for category ${category}`);
    return [];
  }

  const dataHash = crypto.createHash('md5').update(JSON.stringify(matchesFromSheet)).digest('hex');

  if (!(await hasSheetChanged(spreadsheetId, category, dataHash))) {
    logger.info(`No changes detected for category ${category}`);
    return await Match.find({ category });
  }

  const syncedMatches = [];
  const goldenSetMap = new Map();

  // Conta quanti golden set ci sono nel foglio
  const goldenSetsCount = matchesFromSheet.filter(m => m.isGoldenSet).length;
  logger.info(`Found ${goldenSetsCount} golden sets in spreadsheet for category ${category}`);

  // Processiamo prima i match normali
  for (const matchData of matchesFromSheet) {
    if (matchData.isGoldenSet || matchData.teamACode === 'G' || matchData.teamBCode === 'G') {
      // Saltiamo i Golden Set in questo primo passaggio
      continue;
    }
    
    try {
      const [teamA, teamB] = await Promise.all([
        Team.findOne({ name: matchData.teamA, category }),
        Team.findOne({ name: matchData.teamB, category })
      ]);

      if (!teamA || !teamB) {
        logger.warn(`Skipping match due to missing teams: ${matchData.matchId}, Team A: ${matchData.teamA}, Team B: ${matchData.teamB}`);
        continue;
      }

      const updateData = {
        phase: matchData.phase,
        date: matchData.date,
        time: matchData.time,
        court: matchData.court,
        teamA: teamA._id,
        teamB: teamB._id,
        teamACode: matchData.teamACode,
        teamBCode: matchData.teamBCode,
        isGoldenSet: false, // Match normale
        spreadsheetRow: matchData.spreadsheetRow,
        sheetName: matchData.sheetName,
        officialScoreA: matchData.officialScoreA,
        officialScoreB: matchData.officialScoreB,
        officialResult: matchData.officialResult,
        category: category
      };

      const match = await Match.findOneAndUpdate(
        { matchId: matchData.matchId },
        updateData,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      syncedMatches.push(match);
      
      logger.debug(`Synced normal match: ${match.matchId}`);
    } catch (error) {
      logger.error(`Error syncing match ${matchData.matchId}: ${error.message}`);
    }
  }

  // Ora processiamo i Golden Set
for (const matchData of matchesFromSheet) {
  if (!matchData.isGoldenSet && matchData.teamACode !== 'G' && matchData.teamBCode !== 'G') {
    // Saltiamo i match normali in questo secondo passaggio
    continue;
  }
  
  try {
    const [teamA, teamB] = await Promise.all([
      Team.findOne({ name: matchData.teamA, category }),
      Team.findOne({ name: matchData.teamB, category })
    ]);

    if (!teamA || !teamB) {
      //logger.warn(`Skipping golden set due to missing teams: ${matchData.matchId}, Team A: ${matchData.teamA}, Team B: ${matchData.teamB}`);
      continue;
    }
    
    // Determina il risultato del Golden Set in base ai punteggi
    let officialResult = 'pending';
    
    if (matchData.officialScoreA && matchData.officialScoreB && 
        matchData.officialScoreA.length > 0 && matchData.officialScoreB.length > 0) {
      
      const scoreA = parseInt(matchData.officialScoreA[0]);
      const scoreB = parseInt(matchData.officialScoreB[0]);
      
      if (scoreA > scoreB) {
        officialResult = 'teamA';
        logger.info(`Golden Set ${matchData.matchId} risultato: TeamA vince con ${scoreA}-${scoreB}`);
      } else if (scoreB > scoreA) {
        officialResult = 'teamB';
        logger.info(`Golden Set ${matchData.matchId} risultato: TeamB vince con ${scoreA}-${scoreB}`);
      }
    }

    // Cerchiamo il match esistente per determinare se il risultato è cambiato
    const existingMatch = await Match.findOne({ matchId: matchData.matchId });
    let resultChanged = false;
    
    if (existingMatch) {
      // Verifica se il punteggio o il risultato è cambiato
      const scoresChanged = 
        !arraysEqual(existingMatch.officialScoreA, matchData.officialScoreA) || 
        !arraysEqual(existingMatch.officialScoreB, matchData.officialScoreB);
      
      const resultStatusChanged = existingMatch.officialResult !== officialResult;
      
      // Segniamo il cambiamento solo se sono stati aggiunti punteggi o è cambiato il risultato
      resultChanged = (scoresChanged || resultStatusChanged) && 
                      matchData.officialScoreA && matchData.officialScoreA.length > 0;
      
      if (resultChanged) {
        logger.info(`Golden Set ${matchData.matchId} risultato modificato: notifica necessaria`);
      }
    } else if (matchData.officialScoreA && matchData.officialScoreA.length > 0) {
      // Se è un nuovo match e ha già un punteggio, potrebbe richiedere una notifica
      resultChanged = true;
      logger.info(`Nuovo Golden Set ${matchData.matchId} con risultato: notifica necessaria`);
    }

    const updateData = {
      phase: matchData.phase,
      date: matchData.date || new Date('2025-05-02'), // Data default per finali
      time: matchData.time || 'N/A',
      court: matchData.court || 'TBD',
      teamA: teamA._id,
      teamB: teamB._id,
      teamACode: 'G', // Forza il codice G per i Golden Set
      teamBCode: 'G',
      isGoldenSet: true,
      spreadsheetRow: matchData.spreadsheetRow,
      sheetName: matchData.sheetName,
      officialScoreA: matchData.officialScoreA,
      officialScoreB: matchData.officialScoreB,
      officialResult: officialResult, // Determina automaticamente il vincitore
      category: category,
      resultChanged: resultChanged // Aggiunta questa proprietà per tracciare i cambi di risultato
    };

    const match = await Match.findOneAndUpdate(
      { matchId: matchData.matchId },
      updateData,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    syncedMatches.push(match);
    
    // Salva nella mappa per i collegamenti
    const baseMatchId = matchData.matchId.replace(/G$/, '').replace(/\d+G/, '');
    goldenSetMap.set(baseMatchId, match._id);
    
    if (resultChanged) {
      logger.info(`Golden Set ${match.matchId} con cambio risultato sincronizzato (${match.officialScoreA.join('-')}-${match.officialScoreB.join('-')})`);
    } else {
      //logger.info(`Golden Set ${match.matchId} sincronizzato senza cambio di risultato`);
    }
  } catch (error) {
    logger.error(`Error syncing Golden Set ${matchData.matchId}: ${error.message}`);
  }
}

// Funzione helper per confrontare array
function arraysEqual(arr1, arr2) {
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  
  return true;
}

  // Collegamento match normali ai loro Golden Set
  logger.info(`Processing golden set relationships for ${goldenSetMap.size} golden sets`);
  
  for (const [baseMatchId, goldenSetId] of goldenSetMap.entries()) {
    // Trova i match normali correlati a questo Golden Set
    const relatedMatches = syncedMatches.filter(match => 
      !match.isGoldenSet && 
      match.matchId.startsWith(baseMatchId)
    );
    
    if (relatedMatches.length > 0) {
      logger.info(`Found ${relatedMatches.length} matches related to Golden Set ${goldenSetId}`);
      
      for (const match of relatedMatches) {
        try {
          match.relatedMatchId = goldenSetId.toString();
          await match.save();
          logger.info(`Linked match ${match.matchId} to Golden Set ${goldenSetId}`);
        } catch (error) {
          logger.error(`Error linking match ${match.matchId} to Golden Set: ${error.message}`);
        }
      }
    } else {
      logger.warn(`No related matches found for Golden Set ${goldenSetId} (base ID: ${baseMatchId})`);
    }
  }

  // Statistiche finali
  const syncedGoldenSets = syncedMatches.filter(m => m.isGoldenSet).length;
  logger.info(`Successfully synchronized ${syncedGoldenSets} golden sets out of ${goldenSetsCount} for category ${category}`);

  await updateSheetTracking(spreadsheetId, category, dataHash);
  return syncedMatches;
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
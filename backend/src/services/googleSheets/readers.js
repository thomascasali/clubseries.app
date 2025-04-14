// backend/src/services/googleSheets/readers.js

const logger = require('../../config/logger');
const { sheets } = require('./config');
const { parseDate, findTeamInText, extractBaseMatchId } = require('./utils');

const readSheet = async (spreadsheetId, range) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values || [];
  } catch (error) {
    logger.error(`Error reading Google Sheet: ${error.message}`);
    throw error;
  }
};

const readTeamsFromSheet = async (spreadsheetId) => {
  try {
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const entryListSheet = sheetInfo.data.sheets.find(sheet => 
      sheet.properties.title.toLowerCase().includes('entry list')
    );
    
    if (!entryListSheet) {
      logger.warn(`No 'Entry List' sheet found in spreadsheet ${spreadsheetId}`);
      return [];
    }

    const teamsData = await readSheet(spreadsheetId, `'${entryListSheet.properties.title}'!B4:B50`);
    const teams = teamsData
      .filter(row => row[0]?.trim())
      .map(row => ({ name: row[0].trim() }));

    logger.info(`Found ${teams.length} teams in spreadsheet ${spreadsheetId}`);
    return teams;
  } catch (error) {
    logger.error(`Error reading teams from sheet: ${error.message}`);
    return [];
  }
};

/**
 * Analizza una riga del foglio e crea un oggetto match
 * @param {Array} row - Riga del foglio con dati del match
 * @param {number} index - Indice della riga
 * @param {string} sheetName - Nome del foglio
 * @param {string} category - Categoria
 * @param {Array} validTeamNames - Nomi di team validi
 * @returns {Object} - Dati del match
 */
// Modifica alla funzione parseMatchRow
const parseMatchRow = (row, index, sheetName, category, validTeamNames) => {
  // Otteniamo l'ID del match
  const matchNumber = row[0]?.toString().trim() || `row-${index+1}`;
  const matchId = `${category}_${sheetName}_${matchNumber}`;
  
  // Data, ora, campo
  const date = parseDate(row[1]) || new Date('2025-05-04'); // Default per le finali
  const time = row[2] || 'N/A';
  const court = row[3] || '';
  const phase = row[4] || sheetName;
  
  // Otteniamo le informazioni sulle squadre
  const matchText = row[5] || '';
  const [teamAText, teamBText] = matchText.split(' vs ').map(t => t?.trim() || '');
  
  // Analizziamo le informazioni sui team
  const teamAInfo = findTeamInText(teamAText, validTeamNames);
  const teamBInfo = findTeamInText(teamBText, validTeamNames);
  
  // Determiniamo se è un Golden Set SOLO in base al matchNumber
  const isGoldenSet = matchNumber.toString().endsWith('G');
  
  // Se è un Golden Set, forziamo entrambi i teamCode a G
  const matchSuffix = matchNumber.toString().match(/[ABG]$/)?.[0];

  // Se abbiamo un suffisso A/B/G, entrambi i team devono avere lo stesso codice
  let finalTeamACode, finalTeamBCode;

  if (isGoldenSet || matchSuffix === 'G') {
    // Golden Set: entrambi i team hanno codice G
    finalTeamACode = 'G';
    finalTeamBCode = 'G';
  } else if (matchSuffix === 'A') {
    // Match A: entrambi i team hanno codice A
    finalTeamACode = 'A';
    finalTeamBCode = 'A';
  } else if (matchSuffix === 'B') {
    // Match B: entrambi i team hanno codice B
    finalTeamACode = 'B';
    finalTeamBCode = 'B';
  } else {
    // Fallback ai codici rilevati o default A
    finalTeamACode = teamAInfo.teamCode || 'A';
    finalTeamBCode = teamBInfo.teamCode || 'A';
  }
  
  // Analizziamo il risultato esplicito nella colonna G (indice 6)
  let officialResult = 'pending';
  if (row[6] && typeof row[6] === 'string') {
    const resultText = row[6].trim();
    if (resultText === '2-0' || resultText === '2-1') {
      officialResult = 'teamA';
    } else if (resultText === '0-2' || resultText === '1-2') {
      officialResult = 'teamB';
    } else if (resultText === '1-1') {
      officialResult = 'draw';
    }
  }
  
  // Leggiamo i punteggi dei set dalle colonne H, J, L (indici 7, 9, 11)
  const officialScoreA = [];
  const officialScoreB = [];
  
  // Colonne per i punteggi dei set: H, J, L (indici 7, 9, 11)
  for (let col = 7; col <= 11; col += 2) {
    if (row[col] && row[col+1]) {
      officialScoreA.push(row[col].toString().trim());
      officialScoreB.push(row[col+1].toString().trim());
    }
  }
  
  // Per i Golden Set, determiniamo il vincitore in base al punteggio se non già definito
  if (isGoldenSet && officialResult === 'pending' && officialScoreA.length > 0 && officialScoreB.length > 0) {
    const scoreA = parseInt(officialScoreA[0], 10);
    const scoreB = parseInt(officialScoreB[0], 10);
    
    if (!isNaN(scoreA) && !isNaN(scoreB)) {
      if (scoreA > scoreB) {
        officialResult = 'teamA';
      } else if (scoreB > scoreA) {
        officialResult = 'teamB';
      }
    }
  }
  
  // Ricaviamo il baseMatchId
  const baseMatchId = matchNumber.replace(/[ABG]$/, '');
  
  // Log dettagliato per debug
  if (isGoldenSet || officialScoreA.length > 0) {
    logger.debug(`Match ${matchId}: Score A=${officialScoreA.join(',')}, Score B=${officialScoreB.join(',')}, Result=${officialResult}`);
  }
  
  // Creiamo l'oggetto match
  return {
    matchId,
    baseMatchId,
    phase,
    date,
    time,
    court,
    teamA: teamAInfo.teamName || teamAText,
    teamB: teamBInfo.teamName || teamBText,
    teamACode: finalTeamACode,
    teamBCode: finalTeamBCode,
    officialScoreA,
    officialScoreB,
    officialResult,
    category,
    spreadsheetRow: index + 1,
    sheetName,
    isGoldenSet,
    originalMatchText: matchText
  };
};

/**
 * Raggruppa i match per ID base (per trovare A, B e G correlati)
 * @param {Array} matches - Array di match
 * @returns {Object} - Raggruppamento di match per ID base
 */
const groupMatchesByBaseId = (matches) => {
  const groups = {};
  
  matches.forEach(match => {
    const baseId = match.baseMatchId;
    
    if (!groups[baseId]) {
      groups[baseId] = [];
    }
    
    groups[baseId].push(match);
  });
  
  return groups;
};

const readMatchesFromSheet = async (spreadsheetId, category) => {
  try {
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const validTeams = await readTeamsFromSheet(spreadsheetId);
    const validTeamNames = validTeams.map(t => t.name);
    
    logger.info(`Reading matches for category ${category} from spreadsheet ${spreadsheetId}`);
    
    // Array per raccogliere tutti i match
    const matches = [];
    
    // Filtriamo i fogli che contengono partite (pool, play-in, draw schedule)
    const matchSheets = sheetInfo.data.sheets.filter(sheet => 
      sheet.properties.title && ['pool', 'draw', 'play'].some(keyword => 
        sheet.properties.title.toLowerCase().includes(keyword)
      )
    );
    
    logger.info(`Found ${matchSheets.length} match sheets in spreadsheet ${spreadsheetId}`);
    
    // Leggiamo i match da ogni foglio
    for (const sheet of matchSheets) {
      const sheetName = sheet.properties.title.trim();
      logger.info(`Reading matches from sheet "${sheetName}"`);
      
      // Leggiamo un intervallo ampio per assicurarci di catturare tutti i dati
      const rows = await readSheet(spreadsheetId, `'${sheetName}'!A1:M75`);
      
      // Processiamo tutte le righe che hanno un valore nella colonna A (matchNumber)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0] || row[0].toString().trim() === '') continue;
        
        // Verificare che sia una riga con dati (normalmente dovrebbe avere almeno l'ID match e informazioni sulle squadre)
        if (row[5] && row[5].toString().trim() !== '') {
          const match = parseMatchRow(row, i, sheetName, category, validTeamNames);
          matches.push(match);
          
          // Log dettagliato per i Golden Set
          if (match.isGoldenSet) {
            logger.info(`Found Golden Set: ${match.matchId}, Teams: ${match.teamA} vs ${match.teamB}`);
          }
        }
      }
    }
    
    // Analizziamo i gruppi di match
    const groupedMatches = groupMatchesByBaseId(matches);
    
    // Log per i gruppi completi (A, B, G)
    Object.entries(groupedMatches).forEach(([baseId, group]) => {
      const hasTeamA = group.some(m => m.teamACode === 'A' || m.teamBCode === 'A');
      const hasTeamB = group.some(m => m.teamACode === 'B' || m.teamBCode === 'B');
      const hasGolden = group.some(m => m.isGoldenSet);
      
      logger.info(`Match group ${baseId}: ${group.length} matches (A: ${hasTeamA ? 'Yes' : 'No'}, B: ${hasTeamB ? 'Yes' : 'No'}, G: ${hasGolden ? 'Yes' : 'No'})`);
    });
    
    // Statistiche finali
    const goldenSets = matches.filter(m => m.isGoldenSet);
    const teamA = matches.filter(m => m.matchId.endsWith('A'));
    const teamB = matches.filter(m => m.matchId.endsWith('B'));
    
    logger.info(`Read ${matches.length} total matches for category ${category}:`);
    logger.info(`- Team A matches: ${teamA.length}`);
    logger.info(`- Team B matches: ${teamB.length}`);
    logger.info(`- Golden Sets: ${goldenSets.length}`);
    
    return matches;
  } catch (error) {
    logger.error(`Error reading matches from sheet: ${error.message}`);
    throw error;
  }
};

module.exports = {
  readSheet,
  readTeamsFromSheet,
  readMatchesFromSheet,
  parseMatchRow,
  groupMatchesByBaseId
};
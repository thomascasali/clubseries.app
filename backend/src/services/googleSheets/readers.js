const logger = require('../../config/logger');
const { sheets } = require('./config');
const { parseDate, findTeamInText } = require('./utils');

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
  const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
  const entryListSheet = sheetInfo.data.sheets.find(sheet => sheet.properties.title.toLowerCase().includes('entry list'));
  if (!entryListSheet) return [];

  const teamsData = await readSheet(spreadsheetId, `'${entryListSheet.properties.title}'!B4:B50`);
  const teams = teamsData.filter(row => row[0]?.trim()).map(row => ({ name: row[0].trim() }));

  return teams;
};

const readMatchesFromSheet = async (spreadsheetId, category) => {
  const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
  const validTeams = await readTeamsFromSheet(spreadsheetId);
  const validTeamNames = validTeams.map(t => t.name);

  const matches = [];

  const allSheets = sheetInfo.data.sheets.filter(sheet => 
    ['pool', 'draw schedule', 'play-in'].some(keyword => sheet.properties.title.toLowerCase().includes(keyword))
  );

  for (const sheet of allSheets) {
    const sheetName = sheet.properties.title.trim();
    // Lettura estesa delle colonne per essere sicuri di catturare tutti i dati
    const rows = await readSheet(spreadsheetId, `'${sheetName}'!A1:M50`);

    // Prima passiamo su tutte le righe per cercare direttamente i Golden Set
    // Questi spesso sono in righe che non seguono il formato standard
    const goldenSetRows = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue;
      
      const matchId = (row[0] || '').toString();
      const matchText = (row[5] || '').toString();
      
      // Verifica esplicita per Golden Set basata su vari indicatori
      const isGoldenSet = 
        matchId.includes('G') || 
        matchText.toLowerCase().includes('team g') ||
        (row[4] && row[4].toLowerCase().includes('golden'));
      
      if (isGoldenSet) {
        goldenSetRows.push({row, index: i});
        logger.info(`★★★ Golden Set individuato in foglio ${sheetName}, riga ${i+1}: MatchID="${matchId}", Teams="${matchText}" ★★★`);
      }
    }
    
    // Ora processiamo tutte le righe normalmente, ma con attenzione speciale ai Golden Set
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      
      // Per i Golden Set, esaminiamo anche righe che non hanno l'orario standard
      const isGoldenCandidate = goldenSetRows.some(gr => gr.index === i);
      
      // Per partite normali, verifichiamo che abbiano un orario
      if (!isGoldenCandidate && (!row[2] || !/^\d{1,2}:\d{2}$/.test(row[2]))) {
        continue;
      }

      // Ottenere matchId
      const matchNumber = row[0] || `row-${i+1}`;
      const matchId = `${category}_${sheetName}_${matchNumber}`;
      
      // Verifica se questo è un Golden Set basato sul matchId
      const isMatchIdGolden = matchNumber.toString().includes('G');
      
      // Data, ora, campo, fase
      const date = parseDate(row[1]) || new Date('2025-05-02'); // Data di default per le finali
      const time = row[2] || 'N/A';
      const court = row[3] || '';
      const phase = row[4] || sheetName;
      
      // Ottieni informazioni sulle squadre
      const matchText = row[5] || '';
      
      // Verifica se il testo del match contiene "Team G"
      const containsTeamG = matchText.toLowerCase().includes('team g');
      
      // Dividi le squadre dalla stringa di testo
      const [teamAText, teamBText] = matchText.split(' vs ').map(t => t?.trim()) || ['', ''];
      
      // Trova informazioni sui team
      const teamAInfo = findTeamInText(teamAText, validTeamNames);
      const teamBInfo = findTeamInText(teamBText, validTeamNames);
      
      // Verifica se uno dei team è codificato come Golden
      const hasGoldenTeam = 
        (teamAInfo.teamCode === 'G') || 
        (teamBInfo.teamCode === 'G');
      
      // Verifica se la fase contiene "golden"
      const hasGoldenPhase = phase.toLowerCase().includes('golden');
      
      // Determina definitivamente se questo è un Golden Set
      const isGoldenSet = isMatchIdGolden || containsTeamG || hasGoldenTeam || hasGoldenPhase;
      
      // Log dettagliato solo per i Golden Set
      if (isGoldenSet) {
        logger.info(`Golden Set confermato: ${matchId}`);
        logger.info(`- Indicatori: matchId=${isMatchIdGolden}, text=${containsTeamG}, team=${hasGoldenTeam}, phase=${hasGoldenPhase}`);
        logger.info(`- TeamA: ${teamAInfo.teamName || 'Unknown'} (${teamAInfo.teamCode || 'Unknown'}), TeamB: ${teamBInfo.teamName || 'Unknown'} (${teamBInfo.teamCode || 'Unknown'})`);
      }

      // Leggi i punteggi dalle colonne appropriate (G, I, K oppure 7, 9, 11 in base 0)
      const scores = [7, 9, 11].map((col, idx) => {
        if (row[col] && row[col+1]) {
          return [row[col], row[col+1]];
        }
        return null;
      }).filter(Boolean);
      
      // Determina il risultato ufficiale
      const result = row[6]?.trim() || 'pending';
      let officialResult = 'pending';
      
      if (result === '2-0' || result === '2-1') {
        officialResult = 'teamA';
      } else if (result === '0-2' || result === '1-2') {
        officialResult = 'teamB';
      } else if (result === '1-1') {
        officialResult = 'draw';
      }

      // Per i Golden Set, forza il teamCode a 'G' se necessario
      const finalTeamACode = isGoldenSet && !teamAInfo.teamCode ? 'G' : (teamAInfo.teamCode || 'A');
      const finalTeamBCode = isGoldenSet && !teamBInfo.teamCode ? 'G' : (teamBInfo.teamCode || 'B');

      // Crea un oggetto match con tutte le informazioni
      const matchData = {
        matchId,
        phase,
        date,
        time,
        court,
        teamA: teamAInfo.teamName || teamAText,
        teamB: teamBInfo.teamName || teamBText,
        teamACode: finalTeamACode,
        teamBCode: finalTeamBCode,
        officialScoreA: scores.map(set => set[0]),
        officialScoreB: scores.map(set => set[1]),
        officialResult,
        category,
        spreadsheetRow: i + 1,
        sheetName,
        isGoldenSet: isGoldenSet,
        originalMatchText: matchText
      };

      matches.push(matchData);
      
      // Log di debug per il match creato
      if (isGoldenSet) {
        logger.info(`Golden Set registrato: ${matchId}, TeamA: ${matchData.teamA} (${matchData.teamACode}), TeamB: ${matchData.teamB} (${matchData.teamBCode})`);
      } else {
        logger.debug(`Match normale: ${matchId}, TeamA: ${matchData.teamA} (${matchData.teamACode}), TeamB: ${matchData.teamB} (${matchData.teamBCode})`);
      }
    }
  }

  // Log riassuntivo
  const goldenSets = matches.filter(m => m.isGoldenSet);
  logger.info(`Trovati ${goldenSets.length} Golden Sets su ${matches.length} match totali in categoria ${category}`);
  
  if (goldenSets.length > 0) {
    goldenSets.forEach(gs => {
      logger.info(`Golden Set: ${gs.matchId}, Teams: ${gs.teamA} (${gs.teamACode}) vs ${gs.teamB} (${gs.teamBCode}), Text: ${gs.originalMatchText}`);
    });
  }

  return matches;
};

module.exports = {
  readSheet,
  readTeamsFromSheet,
  readMatchesFromSheet
};
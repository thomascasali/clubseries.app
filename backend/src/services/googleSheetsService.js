const { google } = require('googleapis');
const logger = require('../config/logger');
const SheetTracking = require('../models/SheetTracking');
const crypto = require('crypto');

// Configurazione delle credenziali Google
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Inizializzazione dell'API Sheets
const sheets = google.sheets({ version: 'v4', auth });

/**
 * Legge i dati da un foglio Google Sheets
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} range - Range da leggere (es. 'Sheet1!A1:D10')
 * @returns {Promise<Array>} - Dati del foglio
 */
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

/**
 * Scrive dati in un foglio Google Sheets
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} range - Range in cui scrivere (es. 'Sheet1!A1:D10')
 * @param {Array} values - Valori da scrivere
 * @returns {Promise<Object>} - Risposta dall'API
 */
const writeSheet = async (spreadsheetId, range, values) => {
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    });

    return response.data;
  } catch (error) {
    logger.error(`Error writing to Google Sheet: ${error.message}`);
    throw error;
  }
};

/**
 * Legge le squadre dal foglio "Entry List"
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @returns {Promise<Array>} - Lista delle squadre
 */
const readTeamsFromSheet = async (spreadsheetId) => {
  try {
    // Ottieni informazioni sul foglio
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    
    // Cerca il foglio "Entry List"
    const entryListSheet = sheetInfo.data.sheets.find(sheet => 
      sheet.properties.title.toLowerCase().includes('entry list')
    );
    
    if (!entryListSheet) {
      logger.warn(`No 'Entry List' sheet found in spreadsheet ${spreadsheetId}`);
      return [];
    }
    
    // Leggi i dati delle squadre dal range B4:B15
    const teamsData = await readSheet(
      spreadsheetId, 
      `'${entryListSheet.properties.title}'!B4:B15`
    );
    
    // Filtra i valori vuoti e crea oggetti squadra
    const teams = teamsData
      .filter(row => row[0] && row[0].trim() !== '')
      .map(row => ({
        name: row[0].trim()
      }));
    
    return teams;
  } catch (error) {
    logger.error(`Error reading teams from Google Sheet: ${error.message}`);
    throw error;
  }
};

/**
 * Cerca un nome di team all'interno di un testo più lungo
 * @param {string} text - Testo completo (es. "ACTIVE BEACH VOLLEY DUE TORRI Team A")
 * @param {Array} validTeamNames - Array di nomi di team validi
 * @returns {string|null} - Nome del team trovato o null
 */
const findTeamInText = (text, validTeamNames) => {
  // Rimuovi la parte "Team X" dal testo per trovare solo il nome della squadra
  const baseText = text.replace(/\s+Team\s+[A-Z]/i, '').trim();
  
  // Cerca il team più lungo che è contenuto nel testo base
  let foundTeam = null;
  let maxLength = 0;
  
  for (const teamName of validTeamNames) {
    if (baseText.includes(teamName) && teamName.length > maxLength) {
      foundTeam = teamName;
      maxLength = teamName.length;
    }
  }
  
  return foundTeam;
};

/**
 * Legge le partite dai fogli "Pool" e "Draw Schedule"
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria del campionato
 * @returns {Promise<Array>} - Lista delle partite
 */
const readMatchesFromSheet = async (spreadsheetId, category) => {
  try {
    // Ottieni informazioni sul foglio
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    
    // Leggi i team dal foglio per avere i nomi validi
    const validTeams = await readTeamsFromSheet(spreadsheetId);
    const validTeamNames = validTeams.map(team => team.name);
    
    const matches = [];
    
    // Leggi le partite dai fogli Pool A, B, C, D
    const poolSheets = sheetInfo.data.sheets.filter(sheet => 
      sheet.properties.title.toLowerCase().includes('pool')
    );
    
    for (const poolSheet of poolSheets) {
      const poolName = poolSheet.properties.title.trim();
      
      // Leggi i dati delle partite dal pool
      const poolData = await readSheet(
        spreadsheetId, 
        `'${poolName}'!A1:G30`
      );
      
      // Processa i dati delle partite
      for (let i = 0; i < poolData.length; i++) {
        const row = poolData[i];
        if (row.length < 6) continue; // Deve avere almeno 6 colonne (fino a Results)
        
        // Verifica se la riga contiene un orario (formato HH:MM)
        const timeRegex = /^\d{1,2}:\d{2}$/;
        if (row[2] && timeRegex.test(row[2])) {
          // Estrai i dati della partita
          const matchId = `${category}_${poolName}_${i}`;
          const date = row[1] ? parseDate(row[1]) : null;
          const time = row[2];
          const court = row[3];
          
          // Importante: leggiamo i nomi delle squadre dalla colonna F (Results), non dalla E (Teams)
          const resultText = row[5] ? row[5].trim() : '';
          
          // Prova prima a dividere con " vs " (come nel foglio che hai condiviso)
          let teamParts = resultText.split(' vs ');
          
          // Se non funziona, prova con " - " (formato alternativo)
          if (teamParts.length !== 2) {
            teamParts = resultText.split(' - ');
          }
          
          // Cerca le squadre reali nel testo completo
          if (teamParts.length === 2) {
            // Nel foglio, il formato è "SQUADRA1 Team X vs SQUADRA2 Team Y"
            // Dobbiamo estrarre i nomi completi delle squadre
            const fullTeamA = teamParts[0].trim();
            const fullTeamB = teamParts[1].trim();
            
            // Controlla se i nomi completi contengono i nomi dei team
            const foundTeamA = findTeamInText(fullTeamA, validTeamNames);
            const foundTeamB = findTeamInText(fullTeamB, validTeamNames);
            
            if (foundTeamA && foundTeamB) {
              // Se ci sono già risultati inseriti
              let scoreA = [];
              let scoreB = [];
              let result = 'pending';
              
              // Risultati nella colonna G (indice 6)
              if (row.length > 6 && row[6]) {
                // Assume formato "21-18, 21-15" per i risultati
                const scores = row[6].split(',').map(s => s.trim());
                
                scores.forEach(score => {
                  const [sA, sB] = score.split('-').map(s => s.trim());
                  if (sA && sB) {
                    scoreA.push(sA);
                    scoreB.push(sB);
                  }
                });
                
                // Determina il risultato
                if (scoreA.length > 0 && scoreB.length > 0) {
                  let setsA = 0;
                  let setsB = 0;
                  
                  for (let j = 0; j < scoreA.length; j++) {
                    if (parseInt(scoreA[j]) > parseInt(scoreB[j])) {
                      setsA++;
                    } else {
                      setsB++;
                    }
                  }
                  
                  if (setsA > setsB) {
                    result = 'teamA';
                  } else if (setsB > setsA) {
                    result = 'teamB';
                  } else {
                    result = 'draw';
                  }
                }
              }
              
              matches.push({
                matchId,
                phase: poolName,
                date,
                time,
                court,
                teamA: foundTeamA,
                teamB: foundTeamB,
                scoreA,
                scoreB,
                result,
                category,
                spreadsheetRow: i + 1,
                sheetName: poolName
              });
            } else {
              logger.debug(`Skipping match with placeholder teams: ${poolName} vs ${resultText}`);
            }
          }
        }
      }
    }
    
    // Per il Draw Schedule, facciamo lo stesso ma consideriamo che molte partite avranno solo segnaposto
    const drawSheet = sheetInfo.data.sheets.find(sheet => 
      sheet.properties.title.toLowerCase().includes('draw schedule')
    );
    
    if (drawSheet) {
      const drawName = drawSheet.properties.title.trim();
      
      // Leggi i dati delle partite dal tabellone
      const drawData = await readSheet(
        spreadsheetId, 
        `'${drawName}'!A1:G50`
      );
      
      // Processa i dati delle partite
      for (let i = 0; i < drawData.length; i++) {
        const row = drawData[i];
        if (row.length < 6) continue; // Deve avere almeno 6 colonne (fino a Results)
        
        // Verifica se la riga contiene un orario (formato HH:MM)
        const timeRegex = /^\d{1,2}:\d{2}$/;
        if (row[2] && timeRegex.test(row[2])) {
          // Estrai i dati della partita
          const matchId = `${category}_${drawName}_${i}`;
          const date = row[1] ? parseDate(row[1]) : null;
          const time = row[2];
          const court = row[3];
          
          // Importante: leggiamo i nomi delle squadre dalla colonna F (Results), non dalla E (Teams)
          const resultText = row[5] ? row[5].trim() : '';
          
          // Prova prima a dividere con " vs " (come nel foglio che hai condiviso)
          let teamParts = resultText.split(' vs ');
          
          // Se non funziona, prova con " - " (formato alternativo)
          if (teamParts.length !== 2) {
            teamParts = resultText.split(' - ');
          }
          
          // Cerca le squadre reali nel testo completo
          if (teamParts.length === 2) {
            // Nel foglio, il formato è "SQUADRA1 Team X vs SQUADRA2 Team Y"
            // Dobbiamo estrarre i nomi completi delle squadre
            const fullTeamA = teamParts[0].trim();
            const fullTeamB = teamParts[1].trim();
            
            // Controlla se i nomi completi contengono i nomi dei team
            const foundTeamA = findTeamInText(fullTeamA, validTeamNames);
            const foundTeamB = findTeamInText(fullTeamB, validTeamNames);
            
            if (foundTeamA && foundTeamB) {
              // Se ci sono già risultati inseriti
              let scoreA = [];
              let scoreB = [];
              let result = 'pending';
              
              // Risultati nella colonna G (indice 6)
              if (row.length > 6 && row[6]) {
                // Assume formato "21-18, 21-15" per i risultati
                const scores = row[6].split(',').map(s => s.trim());
                
                scores.forEach(score => {
                  const [sA, sB] = score.split('-').map(s => s.trim());
                  if (sA && sB) {
                    scoreA.push(sA);
                    scoreB.push(sB);
                  }
                });
                
                // Determina il risultato
                if (scoreA.length > 0 && scoreB.length > 0) {
                  let setsA = 0;
                  let setsB = 0;
                  
                  for (let j = 0; j < scoreA.length; j++) {
                    if (parseInt(scoreA[j]) > parseInt(scoreB[j])) {
                      setsA++;
                    } else {
                      setsB++;
                    }
                  }
                  
                  if (setsA > setsB) {
                    result = 'teamA';
                  } else if (setsB > setsA) {
                    result = 'teamB';
                  } else {
                    result = 'draw';
                  }
                }
              }
              
              matches.push({
                matchId,
                phase: 'Playoffs',
                date,
                time,
                court,
                teamA: foundTeamA,
                teamB: foundTeamB,
                scoreA,
                scoreB,
                result,
                category,
                spreadsheetRow: i + 1,
                sheetName: drawName
              });
            } else {
              logger.debug(`Skipping draw match with placeholder teams: ${resultText}`);
            }
          }
        }
      }
    }
    
    // Stampa le partite trovate per debug
    if (matches.length > 0) {
      logger.info(`Found ${matches.length} valid matches in spreadsheet for category ${category}`);
      matches.forEach((match, idx) => {
        logger.debug(`Match ${idx+1}: ${match.teamA} vs ${match.teamB}, Date: ${match.date}, Time: ${match.time}`);
      });
    } else {
      logger.info(`No valid matches found in spreadsheet for category ${category}`);
    }
    
    return matches;
  } catch (error) {
    logger.error(`Error reading matches from Google Sheet: ${error.message}`);
    throw error;
  }
};

/**
 * Sincronizza i dati delle partite dal database al foglio Google
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria (usata per filtrare le partite)
 * @param {Array} matches - Dati delle partite dal database
 */
const syncMatchesToSheet = async (spreadsheetId, category, matches) => {
  try {
    // Per ogni partita, aggiorniamo la riga corrispondente nel foglio
    for (const match of matches) {
      if (!match.spreadsheetRow || !match.sheetName) {
        logger.warn(`Match ${match._id} doesn't have a spreadsheet row number or sheet name`);
        continue;
      }
      
      // Determina il range per questa partita
      const range = `'${match.sheetName}'!A${match.spreadsheetRow}:G${match.spreadsheetRow}`;
      
      // Leggi i dati attuali per questa riga
      const currentData = await readSheet(spreadsheetId, range);
      
      if (!currentData || currentData.length === 0) {
        logger.warn(`No current data found for match ${match._id} at ${range}`);
        continue;
      }
      
      // Crea una copia della riga corrente
      const newRowData = [...currentData[0]];
      
      // Aggiorna i risultati se disponibili
      if (match.scoreA.length > 0 && match.scoreB.length > 0) {
        // Formato risultati: "21-18, 21-15"
        const resultStr = match.scoreA.map((score, idx) => 
          `${score}-${match.scoreB[idx]}`
        ).join(', ');
        
        // Aggiorna la colonna dei risultati (colonna G, indice 6)
        if (newRowData.length > 6) {
          newRowData[6] = resultStr;
        } else {
          // Estendi l'array se necessario
          while (newRowData.length < 6) {
            newRowData.push('');
          }
          newRowData.push(resultStr);
        }
        
        // Aggiungi lo stato di conferma se necessario (potrebbero essere necessarie altre colonne)
        if (match.confirmedByTeamA && match.confirmedByTeamB) {
          if (newRowData.length > 7) {
            newRowData[7] = 'Confermato';
          } else {
            newRowData.push('Confermato');
          }
        } else if (newRowData.length > 7) {
          newRowData[7] = 'In attesa di conferma';
        } else {
          newRowData.push('In attesa di conferma');
        }
      }
      
      // Scrivi i dati nel foglio
      await writeSheet(spreadsheetId, range, [newRowData]);
      
      logger.info(`Updated match ${match._id} in spreadsheet at ${range}`);
    }
    
    // Aggiorna il tracking
    await updateSheetTracking(spreadsheetId, category);
    
  } catch (error) {
    logger.error(`Error syncing matches to Google Sheet: ${error.message}`);
    throw error;
  }
};

/**
 * Sincronizza i team dal foglio Google al database
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria del campionato
 * @param {Object} Team - Modello Mongoose per i team
 * @returns {Promise<Array>} - Lista dei team sincronizzati
 */
const syncTeamsFromSheet = async (spreadsheetId, category, Team) => {
  try {
    const teamsFromSheet = await readTeamsFromSheet(spreadsheetId);
    
    if (teamsFromSheet.length === 0) {
      logger.info(`No teams found in spreadsheet for category ${category}`);
      return [];
    }
    
    const syncedTeams = [];
    
    // Per ogni squadra nel foglio, crea o aggiorna nel database
    for (const teamData of teamsFromSheet) {
      // Cerca la squadra nel database
      let team = await Team.findOne({ 
        name: teamData.name, 
        category 
      });
      
      if (!team) {
        // Crea una nuova squadra con password temporanea
        const tempPassword = Math.random().toString(36).substring(2, 10);
        
        team = await Team.create({
          name: teamData.name,
          category,
          spreadsheetId,
          password: tempPassword, // La password verrà hashata automaticamente dal middleware
          players: []
        });
        
        logger.info(`Created new team ${team.name} for category ${category}`);
      } else {
        logger.info(`Found existing team ${team.name} for category ${category}`);
      }
      
      syncedTeams.push(team);
    }
    
    return syncedTeams;
  } catch (error) {
    logger.error(`Error syncing teams from Google Sheet: ${error.message}`);
    throw error;
  }
};

/**
 * Sincronizza le partite dal foglio Google al database
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria del campionato
 * @param {Object} Match - Modello Mongoose per le partite
 * @param {Object} Team - Modello Mongoose per i team
 * @returns {Promise<Array>} - Lista delle partite sincronizzate
 */
const syncMatchesFromSheet = async (spreadsheetId, category, Match, Team) => {
  try {
    const matchesFromSheet = await readMatchesFromSheet(spreadsheetId, category);
    
    if (matchesFromSheet.length === 0) {
      logger.info(`No matches found in spreadsheet for category ${category}`);
      return [];
    }
    
    // Calcola l'hash dei dati delle partite per controllo modifiche
    const dataHash = crypto.createHash('md5').update(JSON.stringify(matchesFromSheet)).digest('hex');
    
    // Verifica se ci sono state modifiche rispetto all'ultima sincronizzazione
    const tracking = await SheetTracking.findOne({ 
      spreadsheetId, 
      category 
    });
    
    if (tracking && tracking.matchesHash === dataHash) {
      logger.info(`No changes detected in spreadsheet for category ${category}`);
      return [];
    }
    
    const syncedMatches = [];
    
    // Per ogni partita nel foglio, crea o aggiorna nel database
    for (const matchData of matchesFromSheet) {
      // Cerca le squadre nel database
      const teamA = await Team.findOne({ name: matchData.teamA, category });
      const teamB = await Team.findOne({ name: matchData.teamB, category });
      
      if (!teamA || !teamB) {
        logger.warn(`Teams not found for match ${matchData.matchId}: ${matchData.teamA} or ${matchData.teamB}`);
        continue;
      }
      
      // Cerca se la partita esiste già
      let match = await Match.findOne({ matchId: matchData.matchId });
      
      if (match) {
        // Verifica se ci sono modifiche rispetto ai dati salvati
          const hasDateChanged = match.date && matchData.date && 
          match.date.getTime() !== new Date(matchData.date).getTime();
          const hasTimeChanged = match.time !== matchData.time;
          const hasCourtChanged = match.court !== matchData.court;
          const hasPhaseChanged = match.phase !== matchData.phase;

          // Salva i dati originali prima dell'aggiornamento
          const originalData = {
            date: match.date,
            time: match.time,
            court: match.court,
            phase: match.phase
          };

          // Aggiorna i campi della partita
          match.phase = matchData.phase;
          match.date = matchData.date;
          match.time = matchData.time;
          match.court = matchData.court;
          match.teamA = teamA._id;
          match.teamB = teamB._id;
          match.spreadsheetRow = matchData.spreadsheetRow;
          match.sheetName = matchData.sheetName;

          // Aggiorna i risultati solo se non sono già stati confermati
          if (!match.confirmedByTeamA || !match.confirmedByTeamB) {
            match.scoreA = matchData.scoreA;
            match.scoreB = matchData.scoreB;
            match.result = matchData.result;
          }

          // Se c'è stato un cambiamento significativo, aggiorniamo l'timestamp
          if (hasDateChanged || hasTimeChanged || hasCourtChanged || hasPhaseChanged) {
            // Forza l'aggiornamento del timestamp per la notifica
            match.updatedAt = new Date();
            
            logger.info(`Detected changes in match ${matchData.matchId}:`);
            if (hasDateChanged) logger.info(`- Date changed from ${originalData.date} to ${match.date}`);
            if (hasTimeChanged) logger.info(`- Time changed from ${originalData.time} to ${match.time}`);
            if (hasCourtChanged) logger.info(`- Court changed from ${originalData.court} to ${match.court}`);
            if (hasPhaseChanged) logger.info(`- Phase changed from ${originalData.phase} to ${match.phase}`);
          }

          await match.save();
          logger.info(`Updated match ${matchData.matchId} from spreadsheet`);
      } else {
        // Crea una nuova partita
        match = await Match.create({
          matchId: matchData.matchId,
          phase: matchData.phase,
          date: matchData.date,
          time: matchData.time,
          court: matchData.court,
          teamA: teamA._id,
          teamB: teamB._id,
          category,
          spreadsheetRow: matchData.spreadsheetRow,
          sheetName: matchData.sheetName,
          scoreA: matchData.scoreA,
          scoreB: matchData.scoreB,
          result: matchData.result
        });
        
        logger.info(`Created new match ${matchData.matchId} from spreadsheet`);
      }
      
      syncedMatches.push(match);
    }
    
    // Aggiorna il tracking
    await updateSheetTracking(spreadsheetId, category, dataHash);
    
    return syncedMatches;
  } catch (error) {
    logger.error(`Error syncing matches from Google Sheet: ${error.message}`);
    throw error;
  }
};

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
    
  } catch (error) {
    logger.error(`Error updating sheet tracking: ${error.message}`);
    throw error;
  }
};

/**
 * Ottiene informazioni generali sul foglio Google Sheets
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @returns {Promise<Object>} - Informazioni sul foglio
 */
const getSheetInfo = async (spreadsheetId) => {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId
    });
    
    return {
      title: response.data.properties.title,
      sheets: response.data.sheets.map(sheet => ({
        title: sheet.properties.title,
        sheetId: sheet.properties.sheetId,
        gridProperties: sheet.properties.gridProperties
      })),
      spreadsheetUrl: response.data.spreadsheetUrl
    };
  } catch (error) {
    logger.error(`Error getting Google Sheet info: ${error.message}`);
    throw error;
  }
};

/**
 * Funzione di test per verificare la connessione a Google Sheets
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @returns {Promise<Object>} - Informazioni sul foglio e dati di test
 */
const testSheetConnection = async (spreadsheetId) => {
  try {
    // Ottieni informazioni sul foglio
    const sheetInfo = await getSheetInfo(spreadsheetId);
    
    // Leggi squadre dal foglio "entry list"
    const teams = await readTeamsFromSheet(spreadsheetId);
    
    // Leggi le partite dai vari fogli
    const matches = await readMatchesFromSheet(spreadsheetId, "Under 21 M");
    
    return {
      sheetInfo,
      teams,
      matches: matches.slice(0, 5) // Restituisci solo le prime 5 partite per brevità
    };
  } catch (error) {
    logger.error(`Error testing Google Sheet connection: ${error.message}`);
    throw error;
  }
};

/**
 * Helper per parsare le date in vari formati italiani
 * @param {string} dateStr - Data in formato italiano (DD/MM/YYYY o formati abbreviati come "2-mag")
 * @returns {Date} - Oggetto Date
 */
const parseDate = (dateStr) => {
  // Se la data è vuota o null
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }
  
  // Mappatura dei mesi abbreviati italiani ai numeri
  const monthsMap = {
    'gen': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mag': 4, 'giu': 5,
    'lug': 6, 'ago': 7, 'set': 8, 'ott': 9, 'nov': 10, 'dic': 11
  };
  
  // Verifica se la data è nel formato "1-mag" (giorno-mese abbreviato)
  const italianShortDateRegex = /^(\d{1,2})-([a-z]{3})$/i;
  const shortMatch = dateStr.match(italianShortDateRegex);
  
  if (shortMatch) {
    const day = parseInt(shortMatch[1], 10);
    const monthAbbr = shortMatch[2].toLowerCase();
    
    // Verifica se l'abbreviazione del mese è valida
    if (monthsMap.hasOwnProperty(monthAbbr)) {
      const month = monthsMap[monthAbbr];
      // Assumiamo l'anno 2025 per le finali
      const year = 2025;
      return new Date(year, month, day);
    }
  }
  
  // Verifica se la data è nel formato italiano (gg/mm/aaaa)
  const italianDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateStr.match(italianDateRegex);
  
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // I mesi in JS partono da 0
    const year = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  
  // Altrimenti prova a parsarla come data standard
  return new Date(dateStr);
};

module.exports = {
  readSheet,
  writeSheet,
  readTeamsFromSheet,
  readMatchesFromSheet,
  syncTeamsFromSheet,
  syncMatchesToSheet,
  syncMatchesFromSheet,
  updateSheetTracking,
  testSheetConnection,
  getSheetInfo
};
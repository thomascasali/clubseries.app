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

    return response.data.values;
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
 * Sincronizza i dati delle partite dal database al foglio Google
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria (usata per filtrare le partite)
 * @param {Array} matches - Dati delle partite dal database
 */
const syncMatchesToSheet = async (spreadsheetId, category, matches) => {
  try {
    // Prima leggiamo la struttura del foglio per capire dove dobbiamo scrivere
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = sheetInfo.data.sheets[0].properties.title; // Prendi il primo foglio o implementa la logica per selezionare il foglio corretto
    
    // Per ogni partita, aggiorniamo la riga corrispondente nel foglio
    for (const match of matches) {
      if (!match.spreadsheetRow) {
        logger.warn(`Match ${match._id} doesn't have a spreadsheet row number`);
        continue;
      }
      
      // Determina il range per questa partita
      const range = `${sheetName}!A${match.spreadsheetRow}:Z${match.spreadsheetRow}`;
      
      // Leggi i dati attuali per questa riga
      const currentData = await readSheet(spreadsheetId, range);
      
      // Preparazione dei dati da scrivere
      // Nota: Questo è un esempio, devi adattarlo alla struttura del tuo foglio
      const newRowData = [
        match.matchId,
        match.phase,
        new Date(match.date).toLocaleDateString('it-IT'),
        match.time,
        match.court,
        match.teamA.name, // Assumendo che teamA sia popolato con l'oggetto team
        match.teamB.name, // Assumendo che teamB sia popolato con l'oggetto team
      ];
      
      // Aggiungi i risultati se disponibili
      if (match.scoreA.length > 0 && match.scoreB.length > 0) {
        match.scoreA.forEach((score, index) => {
          newRowData.push(`${score}-${match.scoreB[index]}`);
        });
        
        // Aggiungi lo stato della conferma
        newRowData.push(
          match.confirmedByTeamA && match.confirmedByTeamB 
            ? 'Confermato' 
            : 'In attesa di conferma'
        );
      }
      
      // Scrivi i dati nel foglio
      await writeSheet(spreadsheetId, range, [newRowData]);
      
      logger.info(`Updated match ${match._id} in spreadsheet row ${match.spreadsheetRow}`);
    }
    
    // Aggiorna il tracking
    await updateSheetTracking(spreadsheetId, category);
    
  } catch (error) {
    logger.error(`Error syncing matches to Google Sheet: ${error.message}`);
    throw error;
  }
};

/**
 * Legge le partite dal foglio Google e le sincronizza con il database
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria (usata per filtrare le partite)
 * @param {Object} Match - Modello Mongoose per le partite
 * @param {Object} Team - Modello Mongoose per le squadre
 */
const syncMatchesFromSheet = async (spreadsheetId, category, Match, Team) => {
  try {
    // Ottieni informazioni sul foglio
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = sheetInfo.data.sheets[0].properties.title;
    
    // Leggi tutti i dati dal foglio (esclusa la riga di intestazione)
    const data = await readSheet(spreadsheetId, `${sheetName}!A2:Z`);
    
    if (!data || data.length === 0) {
      logger.info(`No data found in sheet for category ${category}`);
      return [];
    }
    
    // Calcola l'hash dei dati delle partite per controllo modifiche
    const dataHash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    
    // Verifica se ci sono state modifiche rispetto all'ultima sincronizzazione
    const tracking = await SheetTracking.findOne({ 
      spreadsheetId, 
      category 
    });
    
    if (tracking && tracking.matchesHash === dataHash) {
      logger.info(`No changes detected in spreadsheet for category ${category}`);
      return [];
    }
    
    // Array per tenere traccia delle partite create/aggiornate
    const updatedMatches = [];
    
    // Processa ogni riga del foglio
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 perché la riga 1 è l'intestazione
      
      // Verifica se ci sono abbastanza dati nella riga
      if (row.length < 7) continue;
      
      // Estrai i dati della partita
      // Nota: Questo va adattato alla struttura effettiva del tuo foglio
      const matchId = row[0];
      const phase = row[1];
      const dateStr = row[2];
      const time = row[3];
      const court = row[4];
      const teamAName = row[5];
      const teamBName = row[6];
      
      // Cerca le squadre nel database
      const teamA = await Team.findOne({ name: teamAName, category });
      const teamB = await Team.findOne({ name: teamBName, category });
      
      if (!teamA || !teamB) {
        logger.warn(`Teams not found for match ${matchId}: ${teamAName} or ${teamBName}`);
        continue;
      }
      
      // Converti la data
      const dateParts = dateStr.split('/');
      const date = new Date(
        parseInt(dateParts[2]), // Anno
        parseInt(dateParts[1]) - 1, // Mese (0-11)
        parseInt(dateParts[0]) // Giorno
      );
      
      // Cerca se la partita esiste già
      let match = await Match.findOne({ matchId });
      
      if (match) {
        // Aggiorna la partita esistente
        match.phase = phase;
        match.date = date;
        match.time = time;
        match.court = court;
        match.teamA = teamA._id;
        match.teamB = teamB._id;
        match.spreadsheetRow = rowNumber;
        
        // Processa i risultati se presenti
        if (row.length > 7) {
          // Esempio: "25-20" => scoreA[i] = "25", scoreB[i] = "20"
          const scores = row.slice(7).filter(s => s && s.includes('-'));
          
          if (scores.length > 0) {
            match.scoreA = [];
            match.scoreB = [];
            
            scores.forEach(score => {
              const [scoreA, scoreB] = score.split('-');
              match.scoreA.push(scoreA.trim());
              match.scoreB.push(scoreB.trim());
            });
            
            // Determina il risultato
            let setsA = 0;
            let setsB = 0;
            for (let j = 0; j < match.scoreA.length; j++) {
              if (parseInt(match.scoreA[j]) > parseInt(match.scoreB[j])) {
                setsA++;
              } else {
                setsB++;
              }
            }
            
            if (setsA > setsB) {
              match.result = 'teamA';
            } else if (setsB > setsA) {
              match.result = 'teamB';
            } else {
              match.result = 'draw';
            }
            
            // Verifica se il risultato è confermato
            const confirmationStatus = row[7 + scores.length];
            if (confirmationStatus && confirmationStatus.toLowerCase().includes('conferm')) {
              match.confirmedByTeamA = true;
              match.confirmedByTeamB = true;
            }
          }
        }
        
        await match.save();
        logger.info(`Updated match ${matchId} from spreadsheet`);
      } else {
        // Crea una nuova partita
        match = await Match.create({
          matchId,
          phase,
          date,
          time,
          court,
          teamA: teamA._id,
          teamB: teamB._id,
          category,
          spreadsheetRow: rowNumber,
          result: 'pending'
        });
        
        logger.info(`Created new match ${matchId} from spreadsheet`);
      }
      
      updatedMatches.push(match);
    }
    
    // Aggiorna il tracking
    await updateSheetTracking(spreadsheetId, category, dataHash);
    
    return updatedMatches;
    
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
    const entryListSheet = sheetInfo.sheets.find(sheet => 
      sheet.title.toLowerCase().includes('entry list'));
    
    let teamsList = [];
    if (entryListSheet) {
      const teamsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${entryListSheet.title}'!B4:B15`,
      });
      
      if (teamsResponse.data.values) {
        teamsList = teamsResponse.data.values
          .filter(row => row[0] && row[0].trim() !== '')
          .map(row => row[0]);
      }
    }
    
    // Leggi un campione dei dati del primo Pool
    const poolSheet = sheetInfo.sheets.find(sheet => 
      sheet.title.toLowerCase().includes('pool'));
    
    let matchesSample = [];
    if (poolSheet) {
      const matchesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${poolSheet.title}'!A1:G10`,
      });
      
      if (matchesResponse.data.values) {
        matchesSample = matchesResponse.data.values;
      }
    }
    
    return {
      sheetInfo,
      teamsList,
      matchesSample
    };
  } catch (error) {
    logger.error(`Error testing Google Sheet connection: ${error.message}`);
    throw error;
  }
};

module.exports = {
  readSheet,
  writeSheet,
  syncMatchesToSheet,
  syncMatchesFromSheet,
  updateSheetTracking,
  testSheetConnection,
  getSheetInfo
};

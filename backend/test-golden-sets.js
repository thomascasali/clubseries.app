require('dotenv').config();
const { google } = require('googleapis');
const logger = require('./src/config/logger');

// ID del foglio di test
const spreadsheetId = process.env.GOOGLE_SHEETS_UNDER_21_M;

// Configurazione delle credenziali Google
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Funzione principale per trovare i golden set
async function findGoldenSets() {
  try {
    console.log('Inizializzazione API Google Sheets...');
    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
    
    console.log(`Lettura del foglio: ${spreadsheetId}`);
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    
    const poolSheets = sheetInfo.data.sheets.filter(sheet => 
      sheet.properties.title.toLowerCase().includes('pool')
    );
    
    console.log(`\nFound ${poolSheets.length} pool sheets`);
    
    let goldenSetsFound = [];
    
    // Esamina ogni foglio Pool in dettaglio
    for (const poolSheet of poolSheets) {
      const sheetName = poolSheet.properties.title;
      console.log(`\nScansione foglio: ${sheetName}`);
      
      // Leggi i dati delle partite dal pool
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A1:F30` // Includiamo solo le prime colonne per leggere il MatchID e Teams
      });
      
      const rows = response.data.values || [];
      console.log(`Trovate ${rows.length} righe nel foglio ${sheetName}`);
      
      // Analizza le righe per trovare le partite con Team G
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 5) continue;
        
        const matchId = row[0] || '';
        const teamInfo = row[5] || '';
        
        const hasGoldenSet = 
          matchId.includes('G') || 
          teamInfo.toLowerCase().includes('team g');
        
        if (hasGoldenSet) {
          console.log(`\n🏆 Golden Set trovato (riga ${i+1}):`);
          console.log(`Match ID: ${matchId}`);
          console.log(`Teams: ${teamInfo}`);
          console.log(`Data: ${row[1] || 'N/A'}, Ora: ${row[2] || 'N/A'}, Campo: ${row[3] || 'N/A'}`);
          console.log(`Fase: ${row[4] || 'N/A'}`);
          
          goldenSetsFound.push({
            matchId,
            sheetName,
            row: i+1,
            teamInfo,
            date: row[1],
            time: row[2],
            court: row[3],
            phase: row[4]
          });
        }
      }
    }
    
    console.log('\n================================');
    console.log(`Riepilogo: trovati ${goldenSetsFound.length} Golden Sets:`);
    goldenSetsFound.forEach((gs, i) => {
      console.log(`${i+1}. ${gs.matchId} (${gs.sheetName}, riga ${gs.row}): ${gs.teamInfo}`);
    });
    
  } catch (error) {
    console.error('Errore durante la ricerca dei Golden Sets:', error.message);
    if (error.response) {
      console.error('Response error data:', error.response.data);
    }
  }
}

// Esegui la ricerca
findGoldenSets();
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

// Funzione principale di test
async function testReadPools() {
  try {
    console.log('Testing reading Pool sheets from Google Sheets...');
    console.log(`SpreadsheetId: ${spreadsheetId}`);
    
    // Inizializzazione dell'API Sheets
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Test #1: Ottieni informazioni sul foglio
    const sheetResponse = await sheets.spreadsheets.get({
      spreadsheetId
    });
    
    console.log(`Spreadsheet title: ${sheetResponse.data.properties.title}`);
    console.log(`Total sheets: ${sheetResponse.data.sheets.length}`);
    
    // Trova i fogli Pool
    const poolSheets = sheetResponse.data.sheets.filter(sheet => 
      sheet.properties.title.toLowerCase().includes('pool')
    );
    
    console.log(`\nFound ${poolSheets.length} pool sheets:`);
    poolSheets.forEach(sheet => {
      console.log(`- ${sheet.properties.title}`);
    });
    
    // Esamina ogni foglio Pool in dettaglio
    for (const poolSheet of poolSheets) {
      const poolName = poolSheet.properties.title;
      console.log(`\nReading content of ${poolName}...`);
      
      // Leggi i dati delle partite dal pool
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${poolName}'!A1:G30`
      });
      
      const data = response.data.values || [];
      console.log(`Found ${data.length} rows in ${poolName}`);
      
      // Analizza le righe per trovare le partite
      let matchesFound = 0;
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.length < 5) continue;
        
        // Verifica se la riga contiene un orario (formato HH:MM)
        const timeRegex = /^\d{1,2}:\d{2}$/;
        if (row[2] && timeRegex.test(row[2])) {
          matchesFound++;
          
          console.log(`\nMatch ${matchesFound} (Row ${i+1}):`);
          console.log(`Date: ${row[1] || 'N/A'}`);
          console.log(`Time: ${row[2]}`);
          console.log(`Court: ${row[3] || 'N/A'}`);
          console.log(`Teams: ${row[4] || 'N/A'}`);
          console.log(`Results: ${row[5] || 'N/A'}`);
          
          // Analizza i team
          if (row[4]) {
            const matchText = row[4].trim();
            console.log(`\nParsing teams from: "${matchText}"`);
            
            // Prova a dividere con " vs "
            const teamParts = matchText.split(' vs ');
            if (teamParts.length === 2) {
              console.log(`Team A: "${teamParts[0].trim()}"`);
              console.log(`Team B: "${teamParts[1].trim()}"`);
            } else {
              console.log(`Could not split teams with " vs " separator`);
            }
          }
        }
      }
      
      console.log(`\nTotal matches found in ${poolName}: ${matchesFound}`);
    }
    
    console.log('\nTest completed!');
    
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response error data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Esegui il test
testReadPools();

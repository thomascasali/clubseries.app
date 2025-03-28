require('dotenv').config();
const { google } = require('googleapis');

// ID del foglio di test
const spreadsheetId = '1N8-ctLwv7aWrGRkjVrJPnH4TjO4npZYBMoCg4l5RWwQ';

// Configurazione delle credenziali Google
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Funzione principale di test
async function testConnection() {
  try {
    console.log('Testing connection to Google Sheets...');
    console.log(`SpreadsheetId: ${spreadsheetId}`);
    
    // Inizializzazione dell'API Sheets
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Test #1: Ottieni informazioni sul foglio
    console.log('\nTest #1: Fetching spreadsheet info...');
    const sheetResponse = await sheets.spreadsheets.get({
      spreadsheetId
    });
    
    console.log(`Spreadsheet title: ${sheetResponse.data.properties.title}`);
    console.log(`Number of sheets: ${sheetResponse.data.sheets.length}`);
    sheetResponse.data.sheets.forEach((sheet, i) => {
      console.log(`  Sheet ${i+1}: ${sheet.properties.title}`);
    });
    
    // Test #2: Leggi le squadre dalla entry list
    console.log('\nTest #2: Reading teams from entry list...');
    const entryListSheet = sheetResponse.data.sheets.find(
      sheet => sheet.properties.title.toLowerCase().includes('entry list')
    );
    
    if (entryListSheet) {
      const teamsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${entryListSheet.properties.title}'!B4:B15`,
      });
      
      if (teamsResponse.data.values && teamsResponse.data.values.length > 0) {
        console.log('Teams found:');
        teamsResponse.data.values.forEach((team, i) => {
          if (team[0] && team[0].trim() !== '') {
            console.log(`  Team ${i+1}: ${team[0]}`);
          }
        });
      } else {
        console.log('No teams found in the specified range.');
      }
    } else {
      console.log('Entry list sheet not found');
    }
    
    // Test #3: Leggi dati dal primo pool
    console.log('\nTest #3: Reading matches from first pool...');
    const poolSheet = sheetResponse.data.sheets.find(
      sheet => sheet.properties.title.toLowerCase().includes('pool')
    );
    
    if (poolSheet) {
      const matchesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${poolSheet.properties.title}'!A1:G15`,
      });
      
      if (matchesResponse.data.values && matchesResponse.data.values.length > 0) {
        console.log(`Pool: ${poolSheet.properties.title}`);
        console.log('Matches:');
        
        for (let i = 0; i < matchesResponse.data.values.length; i++) {
          const row = matchesResponse.data.values[i];
          if (row.length < 5) continue;
          
          // Verifica se la riga contiene un orario
          const timeRegex = /^\d{1,2}:\d{2}$/;
          if (row[2] && timeRegex.test(row[2])) {
            console.log(`  Row ${i+1}: Time=${row[2]}, Court=${row[3]}, Match=${row[4]}`);
          }
        }
      } else {
        console.log('No matches found in the pool sheet.');
      }
    } else {
      console.log('Pool sheet not found');
    }
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response error data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Esegui il test
testConnection();

require('dotenv').config();
const { getSheetIdForCategory } = require('./src/utils/sheetsUtils');
const googleSheetsService = require('./src/services/googleSheetsService');

// Categoria da testare
const CATEGORY = 'Under 21 M';

async function testConnection() {
  try {
    const spreadsheetId = getSheetIdForCategory(CATEGORY);
    
    if (!spreadsheetId) {
      console.error(`Nessun ID foglio configurato per la categoria ${CATEGORY}`);
      process.exit(1);
    }
    
    console.log(`Categoria: ${CATEGORY}`);
    console.log(`ID Foglio: ${spreadsheetId}`);
    
    const result = await googleSheetsService.testSheetConnection(spreadsheetId);
    
    console.log('\nInformazioni sul foglio:');
    console.log(`Titolo: ${result.sheetInfo.title}`);
    console.log(`Fogli: ${result.sheetInfo.sheets.map(s => s.title).join(', ')}`);
    
    console.log('\nTeam trovati:');
    if (result.teams.length > 0) {
      result.teams.forEach((team, i) => {
        console.log(`${i+1}. ${team.name}`);
      });
    } else {
      console.log('Nessun team trovato nel foglio');
    }
    
    console.log('\nEsempio partite:');
    if (result.matches && result.matches.length > 0) {
      result.matches.forEach((match, i) => {
        console.log(`${i+1}. ${match.phase}: ${match.teamA} vs ${match.teamB}`);
        console.log(`   Data: ${match.date}, Orario: ${match.time}, Campo: ${match.court}`);
        if (match.scoreA.length > 0) {
          const scores = match.scoreA.map((s, idx) => `${s}-${match.scoreB[idx]}`).join(', ');
          console.log(`   Risultati: ${scores}`);
        }
      });
    } else {
      console.log('Nessuna partita trovata nel foglio');
    }
    
    console.log('\nTest completato con successo!');
    
  } catch (error) {
    console.error('Errore durante il test:', error.message);
    if (error.response) {
      console.error('Response error data:', error.response.data);
    }
  }
}

testConnection();
require('dotenv').config();
const { findGoldenSets } = require('./src/services/googleSheets/find-golden-sets');
const { getSheetIdForCategory } = require('./src/utils/sheetsUtils');

// Categoria da analizzare
const category = process.argv[2] || 'Under 21 M';

async function testFindGoldenSets() {
  try {
    const spreadsheetId = getSheetIdForCategory(category);
    
    if (!spreadsheetId) {
      console.error(`Nessun ID foglio configurato per la categoria ${category}`);
      process.exit(1);
    }
    
    console.log(`Analisi Golden Set per categoria: ${category}`);
    console.log(`ID Foglio: ${spreadsheetId}`);
    
    await findGoldenSets(spreadsheetId, category);
    
  } catch (error) {
    console.error('Errore:', error.message);
  }
}

testFindGoldenSets();

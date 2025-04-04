require('dotenv').config();
const mongoose = require('mongoose');
const { getSheetIdForCategory } = require('./src/utils/sheetsUtils');
const googleSheetsService = require('./src/services/googleSheets');
const Team = require('./src/models/Team');
const Match = require('./src/models/Match');
const SheetTracking = require('./src/models/SheetTracking');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

// Categoria da testare
const category = process.argv[2] || 'Under 21 M';

async function testSyncGoldenSets() {
  try {
    console.log('Connessione al database...');
    await connectDB();
    
    const spreadsheetId = getSheetIdForCategory(category);
    
    if (!spreadsheetId) {
      console.error(`Nessun ID foglio configurato per la categoria ${category}`);
      process.exit(1);
    }
    
    console.log(`Categoria: ${category}`);
    console.log(`ID Foglio: ${spreadsheetId}`);
    
    // Resetta i dati di tracking per forzare la sincronizzazione completa
    console.log('\nReset dati di tracking per forzare la sincronizzazione...');
    await SheetTracking.deleteMany({ category, spreadsheetId });
    
    // Cerca Golden Set esistenti prima della sincronizzazione
    const existingGoldenSets = await Match.find({ category, isGoldenSet: true }).populate('teamA teamB');
    console.log(`\nGolden Set esistenti prima della sincronizzazione: ${existingGoldenSets.length}`);
    
    if (existingGoldenSets.length > 0) {
      console.log('Golden Set già presenti nel database:');
      existingGoldenSets.forEach((gs, i) => {
        const teamAName = gs.teamA ? gs.teamA.name : 'N/A';
        const teamBName = gs.teamB ? gs.teamB.name : 'N/A';
        console.log(`${i+1}. ${gs.matchId}: ${teamAName} (${gs.teamACode}) vs ${teamBName} (${gs.teamBCode})`);
      });
    }
    
    // Sincronizzazione test
    console.log('\nSincronizzazione match con attenzione ai Golden Set...');
    const syncedMatches = await googleSheetsService.syncMatchesFromSheet(
      spreadsheetId,
      category,
      Match,
      Team
    );
    
    // Verifica Golden Set dopo la sincronizzazione
    const newGoldenSets = await Match.find({ category, isGoldenSet: true }).populate('teamA teamB');
    console.log(`\nGolden Set dopo la sincronizzazione: ${newGoldenSets.length}`);
    
    if (newGoldenSets.length > 0) {
      console.log('Golden Set nel database dopo la sincronizzazione:');
      newGoldenSets.forEach((gs, i) => {
        const teamAName = gs.teamA ? gs.teamA.name : 'N/A';
        const teamBName = gs.teamB ? gs.teamB.name : 'N/A';
        console.log(`${i+1}. ${gs.matchId}: ${teamAName} (${gs.teamACode}) vs ${teamBName} (${gs.teamBCode})`);
      });
    }
    
    // Verifica risultato complessivo
    const difference = newGoldenSets.length - existingGoldenSets.length;
    if (difference > 0) {
      console.log(`\n✅ Sincronizzazione completata con successo! Aggiunti ${difference} nuovi Golden Set.`);
    } else if (difference === 0 && newGoldenSets.length > 0) {
      console.log(`\n✅ Sincronizzazione completata. I Golden Set erano già tutti presenti nel database.`);
    } else {
      console.log(`\n❌ Sincronizzazione non riuscita. Nessun Golden Set trovato.`);
    }
    
  } catch (error) {
    console.error('Errore durante il test:', error);
  } finally {
    // Chiudi la connessione MongoDB
    await mongoose.connection.close();
    console.log('\nConnessione MongoDB chiusa.');
    process.exit(0);
  }
}

testSyncGoldenSets();

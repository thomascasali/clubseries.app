require('dotenv').config();
const mongoose = require('mongoose');
const { getSheetIdForCategory } = require('./src/utils/sheetsUtils');
const googleSheetsService = require('./src/services/googleSheets');
const Team = require('./src/models/Team');
const Match = require('./src/models/Match');
const SheetTracking = require('./src/models/SheetTracking');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

// Ottieni la categoria dagli argomenti da linea di comando
const category = process.argv[2];

if (!category) {
  console.error('Errore: Nessuna categoria specificata');
  console.log('Utilizzo: node reset-sync-category.js "Under 21 M"');
  process.exit(1);
}

async function resetAndSyncCategory() {
  try {
    console.log('Connessione al database...');
    await connectDB();
    
    console.log(`\nReset e sincronizzazione forzata per la categoria: ${category}`);
    
    const spreadsheetId = getSheetIdForCategory(category);
    if (!spreadsheetId) {
      console.error(`Errore: Nessun ID foglio configurato per la categoria ${category}`);
      process.exit(1);
    }
    
    console.log(`ID foglio: ${spreadsheetId}`);
    
    // Elimina tutti i match per questa categoria
    console.log(`\nEliminazione dei match esistenti per la categoria ${category}...`);
    const deleteResult = await Match.deleteMany({ category });
    console.log(`✅ Eliminati ${deleteResult.deletedCount} match`);
    
    // Elimina i dati di tracking per questa categoria
    console.log(`\nEliminazione dei dati di tracking per la categoria ${category}...`);
    const trackingDeleteResult = await SheetTracking.deleteMany({ category, spreadsheetId });
    console.log(`✅ Eliminati ${trackingDeleteResult.deletedCount} record di tracking`);
    
    // Sincronizza i team
    console.log(`\nSincronizzazione team per categoria ${category}...`);
    const syncedTeams = await googleSheetsService.syncTeamsFromSheet(
      spreadsheetId,
      category,
      Team
    );
    
    console.log(`✅ Sincronizzati ${syncedTeams.length} team`);
    
    // Sincronizza i match
    console.log(`\nSincronizzazione match per categoria ${category}...`);
    const syncedMatches = await googleSheetsService.syncMatchesFromSheet(
      spreadsheetId,
      category,
      Match,
      Team
    );
    
    console.log(`✅ Sincronizzati ${syncedMatches.length} match`);
    
    // Verifica Golden Sets
    const goldenSets = syncedMatches.filter(m => m.isGoldenSet);
    if (goldenSets.length > 0) {
      console.log(`\n🏆 Trovati ${goldenSets.length} Golden Set:`);
      goldenSets.forEach((gs, i) => {
        const teamAName = gs.teamA.name || gs.teamA;
        const teamBName = gs.teamB.name || gs.teamB;
        console.log(`  ${i+1}. ${gs.matchId}: ${teamAName} (${gs.teamACode}) vs ${teamBName} (${gs.teamBCode})`);
      });
    } else {
      console.log(`\nℹ️ Nessun Golden Set trovato nella categoria ${category}`);
    }
    
    console.log('\nReset e sincronizzazione completati con successo!');
    
  } catch (error) {
    console.error('Errore durante il reset e la sincronizzazione:', error.message);
  } finally {
    // Chiudi la connessione MongoDB
    await mongoose.connection.close();
    console.log('\nConnessione MongoDB chiusa.');
    process.exit(0);
  }
}

resetAndSyncCategory();

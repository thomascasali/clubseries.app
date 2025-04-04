require('dotenv').config();
const mongoose = require('mongoose');
const { getSheetIdForCategory } = require('./src/utils/sheetsUtils');
const googleSheetsService = require('./src/services/googleSheets');
const Team = require('./src/models/Team');
const Match = require('./src/models/Match');
const SheetTracking = require('./src/models/SheetTracking');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

// Categorie da sincronizzare
const CATEGORIES = [
  'Under 21 M', 'Under 21 F', 'Eccellenza M', 'Eccellenza F', 
  'Amatoriale M', 'Amatoriale F', 'Over 35 F', 'Over 40 F', 
  'Over 43 M', 'Over 50 M', 'Serie A Maschile', 'Serie A Femminile', 
  'Serie B Maschile', 'Serie B Femminile'
];

async function syncAllCategories(forceSync = false) {
  try {
    console.log('Connessione al database...');
    await connectDB();
    
    console.log(`Inizio sincronizzazione completa di ${CATEGORIES.length} categorie...`);
    console.log(`Modalità di sincronizzazione: ${forceSync ? 'FORZATA' : 'Normale'}`);
    
    // Se forzata, elimina prima i dati di tracking
    if (forceSync) {
      console.log('Eliminazione dei dati di tracking per forzare la sincronizzazione completa...');
      await SheetTracking.deleteMany({});
      console.log('Dati di tracking eliminati.');
    }
    
    const results = {};
    let totalTeams = 0;
    let totalMatches = 0;
    let totalGoldenSets = 0;
    
    for (const category of CATEGORIES) {
      try {
        console.log(`\n----- Sincronizzazione categoria: ${category} -----`);
        
        const spreadsheetId = getSheetIdForCategory(category);
        if (!spreadsheetId) {
          console.log(`⚠️ Nessun ID foglio configurato per la categoria ${category}, saltando...`);
          results[category] = {
            success: false,
            message: 'ID foglio non configurato'
          };
          continue;
        }
        
        console.log(`ID foglio: ${spreadsheetId}`);
        
        // Sincronizza i team
        console.log(`\nSincronizzazione team per categoria ${category}...`);
        const syncedTeams = await googleSheetsService.syncTeamsFromSheet(
          spreadsheetId,
          category,
          Team
        );
        
        console.log(`✅ Sincronizzati ${syncedTeams.length} team per categoria ${category}`);
        totalTeams += syncedTeams.length;
        
        // Sincronizza i match
        console.log(`\nSincronizzazione match per categoria ${category}...`);
        const syncedMatches = await googleSheetsService.syncMatchesFromSheet(
          spreadsheetId,
          category,
          Match,
          Team
        );
        
        console.log(`✅ Sincronizzati ${syncedMatches.length} match per categoria ${category}`);
        totalMatches += syncedMatches.length;
        
        // Controlla i Golden Set
        const goldenSets = syncedMatches.filter(m => m.isGoldenSet);
        if (goldenSets.length > 0) {
          console.log(`🏆 Trovati ${goldenSets.length} Golden Set in categoria ${category}:`);
          goldenSets.forEach((gs, idx) => {
            console.log(`   ${idx+1}. ${gs.matchId}: Teams ${gs.teamA.name || gs.teamA} vs ${gs.teamB.name || gs.teamB}`);
          });
          totalGoldenSets += goldenSets.length;
        } else {
          console.log(`ℹ️ Nessun Golden Set trovato in categoria ${category}`);
        }
        
        results[category] = {
          success: true,
          teams: syncedTeams.length,
          matches: syncedMatches.length,
          goldenSets: goldenSets.length
        };
      } catch (error) {
        console.error(`❌ Errore nella sincronizzazione della categoria ${category}:`, error.message);
        results[category] = {
          success: false,
          message: error.message
        };
      }
    }
    
    // Riepilogo finale
    console.log('\n=====================================================');
    console.log('RIEPILOGO SINCRONIZZAZIONE:');
    console.log('=====================================================');
    console.log(`Categorie totali: ${CATEGORIES.length}`);
    console.log(`Team sincronizzati: ${totalTeams}`);
    console.log(`Match sincronizzati: ${totalMatches}`);
    console.log(`Golden Set sincronizzati: ${totalGoldenSets}`);
    console.log('\nDettaglio per categoria:');
    
    for (const [category, result] of Object.entries(results)) {
      const status = result.success ? '✅' : '❌';
      const details = result.success 
        ? `Teams: ${result.teams}, Matches: ${result.matches}, Golden Sets: ${result.goldenSets}`
        : `Errore: ${result.message}`;
        
      console.log(`${status} ${category}: ${details}`);
    }
    
    console.log('\nSincronizzazione completata!');
    
  } catch (error) {
    console.error('Errore durante la sincronizzazione:', error.message);
  } finally {
    // Chiudi la connessione MongoDB
    await mongoose.connection.close();
    console.log('\nConnessione MongoDB chiusa.');
    process.exit(0);
  }
}

// Controlla se la sincronizzazione forzata è richiesta (passata come argomento)
const forceSync = process.argv.includes('--force');

// Esegui la sincronizzazione
syncAllCategories(forceSync);
